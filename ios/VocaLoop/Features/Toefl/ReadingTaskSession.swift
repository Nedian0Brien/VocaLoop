import Foundation

/// Reading task(Daily Life / Academic Passage) 한 판의 상태.
///
/// 웹은 모든 문항을 다 푼 뒤 **한 번에** 채점한다. 문항마다 바로 정답을 보여주면
/// 뒤 문항을 풀 때 지문을 다시 읽지 않게 되기 때문이다. 그 흐름을 그대로 옮겼다.
@Observable
@MainActor
final class ReadingTaskSession {
    enum Phase: Equatable {
        case generating
        case failed(String)
        /// 푸는 중. 아직 채점 전.
        case solving
        /// 채점 완료. 정답과 해설이 열린다.
        case checked
        /// 리포트 화면.
        case report
    }

    private(set) var phase: Phase = .generating
    /// `set`은 계산 프로퍼티 안에서 setter 키워드로 파싱돼 이름을 달리 쓴다.
    private(set) var taskSet: ReadingTaskSet?
    private(set) var index = 0
    /// 문항별로 고른 보기. 아직 안 고른 문항은 nil이다.
    private(set) var selections: [Int?] = []
    private(set) var report: ToeflReadingReport.Result?

    let taskType: ReadingTaskType
    let difficulty: ToeflDifficulty
    /// 프롬프트에 내 단어를 몇 개 넣었는지. 화면에 배지로 보여준다.
    let vocabularySampleCount: Int

    private let service: ReadingTaskService
    private let request: ReadingTaskService.Request

    init(service: ReadingTaskService, request: ReadingTaskService.Request) {
        self.service = service
        self.request = request
        taskType = request.taskType
        difficulty = request.difficulty
        vocabularySampleCount = request.vocabularyWords.count
    }

    // MARK: - 파생 상태

    var questions: [ReadingQuestion] { taskSet?.questions ?? [] }
    var total: Int { questions.count }

    var currentQuestion: ReadingQuestion? {
        questions.indices.contains(index) ? questions[index] : nil
    }

    var currentSelection: Int? {
        selections.indices.contains(index) ? selections[index] : nil
    }

    var answeredCount: Int { selections.count { $0 != nil } }
    var allAnswered: Bool { total > 0 && answeredCount == total }
    var isChecked: Bool { phase == .checked || phase == .report }

    /// 문항 진행 바에 쓰는 상태. 채점 전에는 정답 여부를 흘리지 않는다.
    func result(at index: Int) -> Bool? {
        guard isChecked, questions.indices.contains(index) else { return nil }
        return selections[index] == questions[index].answerIndex
    }

    var correctCount: Int {
        questions.indices.count { selections[$0] == questions[$0].answerIndex }
    }

    var accuracy: Int {
        guard total > 0 else { return 0 }
        return Int((Double(correctCount) / Double(total) * 100).rounded())
    }

    // MARK: - 조작

    func load() async {
        phase = .generating
        do {
            let generated = try await service.generate(request)
            taskSet = generated
            index = 0
            selections = Array(repeating: nil, count: generated.questions.count)
            report = nil
            phase = .solving
        } catch {
            phase = .failed(
                (error as? APIError)?.errorDescription ?? error.localizedDescription
            )
        }
    }

    func select(_ optionIndex: Int) {
        guard phase == .solving, selections.indices.contains(index) else { return }
        selections[index] = optionIndex
    }

    func navigate(to next: Int) {
        guard questions.indices.contains(next) else { return }
        index = next
    }

    func goToNextQuestion() {
        guard currentSelection != nil else { return }
        navigate(to: index + 1)
    }

    /// 모든 문항을 푼 뒤에만 채점할 수 있다.
    func check() {
        guard phase == .solving, allAnswered else { return }
        phase = .checked
    }

    func showReport() {
        guard isChecked else { return }
        report = ToeflReadingReport.build(
            questions: questions,
            answers: answers,
            difficulty: difficulty,
            topicTags: taskSet?.topicTags ?? []
        )
        phase = .report
    }

    private var answers: [ToeflReadingReport.Answer] {
        questions.enumerated().map { index, question in
            ToeflReadingReport.Answer(
                questionID: question.id,
                selectedIndex: selections[index],
                answerIndex: question.answerIndex,
                correct: selections[index] == question.answerIndex,
                skillTag: question.skillTag
            )
        }
    }
}

extension ReadingTaskSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
