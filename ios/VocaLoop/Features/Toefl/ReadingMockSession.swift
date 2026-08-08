import Foundation

/// Reading Mock Test 한 판의 상태.
///
/// Stage 1을 풀면 그 정답률로 Stage 2 난이도가 갈린다. 두 단계 결과를 합쳐
/// 1~6 밴드를 추정한다.
@Observable
@MainActor
final class ReadingMockSession {
    enum Phase: Equatable {
        case generating
        case failed(String)
        /// 문항을 푸는 중.
        case solving
        /// 이 문항을 채점한 상태. 해설이 열린다.
        case checked
        case report
    }

    private(set) var phase: Phase = .generating
    private(set) var module: ReadingMockModule?
    private(set) var index = 0
    private(set) var selected: Int?
    /// 지금까지 푼 모든 문항 (두 단계 합산).
    private(set) var answeredItems: [ReadingMockItem] = []
    private(set) var answers: [ToeflReadingReport.Answer] = []
    private(set) var stageTwoDifficulty: ReadingMockDifficulty?
    private(set) var band: Int?
    private(set) var report: ToeflReadingReport.Result?

    let difficulty: ToeflDifficulty
    let vocabularySampleCount: Int

    private let service: ReadingMockService
    private let request: ReadingMockService.Request

    init(service: ReadingMockService, request: ReadingMockService.Request) {
        self.service = service
        self.request = request
        difficulty = request.difficulty
        vocabularySampleCount = request.vocabularyWords.count
    }

    // MARK: - 파생 상태

    var currentItem: ReadingMockItem? {
        guard let module, module.items.indices.contains(index) else { return nil }
        return module.items[index]
    }

    var moduleLabel: String { module?.label ?? "" }
    var moduleTotal: Int { module?.items.count ?? 0 }
    var stage: Int { module?.stage ?? 1 }
    var correctCount: Int { answers.count(where: \.correct) }
    var totalAnswered: Int { answers.count }

    var accuracy: Int {
        guard totalAnswered > 0 else { return 0 }
        return Int((Double(correctCount) / Double(totalAnswered) * 100).rounded())
    }

    /// 마지막으로 채점한 문항이 맞았는지.
    var lastAnswerCorrect: Bool { answers.last?.correct == true }

    var isLastItemOfModule: Bool { index >= moduleTotal - 1 }

    /// 다음 버튼 문구. 웹과 같은 분기다.
    var advanceTitle: String {
        if !isLastItemOfModule { return "다음 문항" }
        return stage == 1 ? "Stage 2로 이동" : "리포트 보기"
    }

    // MARK: - 조작

    func start() async {
        await loadModule(
            stage: 1,
            difficulty: .router,
            count: ReadingMockScoring.stageOneCount(request.questionCount)
        )
    }

    private func loadModule(stage: Int, difficulty: ReadingMockDifficulty, count: Int) async {
        phase = .generating
        selected = nil
        index = 0

        do {
            module = try await service.generateModule(
                request,
                stage: stage,
                difficulty: difficulty,
                questionCount: count
            )
            phase = .solving
        } catch {
            phase = .failed(
                (error as? APIError)?.errorDescription ?? error.localizedDescription
            )
        }
    }

    /// 실패 후 다시 시도. 이미 푼 문항이 있으면 그 단계부터 다시 만든다.
    func retry() async {
        if let stageTwoDifficulty {
            await loadModule(
                stage: 2,
                difficulty: stageTwoDifficulty,
                count: ReadingMockScoring.stageTwoCount(request.questionCount)
            )
        } else {
            await start()
        }
    }

    func select(_ optionIndex: Int) {
        guard phase == .solving else { return }
        selected = optionIndex
    }

    /// 웹은 문항마다 바로 채점한다 (Reading task와 다른 점).
    func check() {
        guard phase == .solving, let item = currentItem, let selected else { return }

        answeredItems.append(item)
        answers.append(
            ToeflReadingReport.Answer(
                questionID: answers.count,
                selectedIndex: selected,
                answerIndex: item.answerIndex,
                correct: selected == item.answerIndex,
                skillTag: item.skillTag
            )
        )
        phase = .checked
    }

    /// 다음 문항으로, 모듈이 끝났으면 Stage 2 또는 리포트로.
    func advance() async {
        guard phase == .checked else { return }

        if !isLastItemOfModule {
            index += 1
            selected = nil
            phase = .solving
            return
        }

        if stage == 1 {
            let next = ReadingMockScoring.route(correct: correctCount, total: totalAnswered)
            stageTwoDifficulty = next
            await loadModule(
                stage: 2,
                difficulty: next,
                count: ReadingMockScoring.stageTwoCount(request.questionCount)
            )
            return
        }

        finish()
    }

    private func finish() {
        let routed = stageTwoDifficulty ?? module?.difficulty ?? .lower
        band = ReadingMockScoring.band(
            correct: correctCount,
            total: totalAnswered,
            difficulty: routed
        )
        report = ToeflReadingReport.build(
            items: answeredItems.enumerated().map { index, item in
                ToeflReadingReport.Item(
                    id: index,
                    prompt: item.prompt,
                    options: item.options,
                    answerIndex: item.answerIndex,
                    skillTag: item.skillTag,
                    explanationKo: item.explanationKo,
                    topicTags: item.topicTags
                )
            },
            answers: answers,
            difficulty: difficulty
        )
        phase = .report
    }
}

extension ReadingMockSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
