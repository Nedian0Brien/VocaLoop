import Foundation

/// Build a Sentence 한 판의 상태.
@Observable
@MainActor
final class BuildSentenceSession {
    enum Phase: Equatable {
        case generating
        case solving
        case checked(isCorrect: Bool)
        case finished
        case failed(String)
    }

    private(set) var phase: Phase = .generating
    private(set) var questions: [BuildSentenceQuestion] = []
    private(set) var index = 0
    /// 배치한 조각의 `words` 인덱스. 순서가 곧 답이다.
    private(set) var arrangement: [Int] = []
    private(set) var correctCount = 0

    let difficulty: ToeflDifficulty
    private let service: BuildSentenceService
    private let request: BuildSentenceService.Request

    init(service: BuildSentenceService, request: BuildSentenceService.Request) {
        self.service = service
        self.request = request
        self.difficulty = request.difficulty
    }

    var currentQuestion: BuildSentenceQuestion? {
        guard index < questions.count else { return nil }
        return questions[index]
    }

    /// 아직 배치하지 않은 조각의 인덱스.
    var remainingTokenIndices: [Int] {
        guard let question = currentQuestion else { return [] }
        let placed = Set(arrangement)
        return question.words.indices.filter { !placed.contains($0) }
    }

    var canSubmit: Bool {
        guard let question = currentQuestion, phase == .solving else { return false }
        return BuildSentenceEngine.canSubmit(question, arrangement: arrangement)
    }

    var accuracy: Int {
        guard !questions.isEmpty else { return 0 }
        return Int((Double(correctCount) / Double(questions.count) * 100).rounded())
    }


    /// 생성 작업을 세션이 들고 있는다. 뷰의 `.task`에 매달아 두면 화면이 다시
    /// 그려질 때 취소돼, 서버는 정상 응답했는데 앱만 "취소됨"으로 죽는다.
    private var loadTask: Task<Void, Never>?

    /// 화면 진입 시 한 번만 부른다. 이미 만들고 있으면 아무것도 하지 않는다.
    func loadIfNeeded() {
        guard loadTask == nil else { return }
        loadTask = Task { await load() }
    }

    /// 실패 후 다시 시도.
    func reload() {
        loadTask?.cancel()
        loadTask = Task { await load() }
    }

    private func load() async {
        phase = .generating

        #if DEBUG
        // 디자인 확인용. 서버 없이 화면을 띄운다.
        if UserDefaults.standard.bool(forKey: "VocaLoopUseMockData") {
            questions = PreviewData.buildSentenceQuestions
            arrangement = []
            phase = .solving
            return
        }
        #endif

        do {
            questions = try await service.generate(request)
            arrangement = []
            phase = .solving
        } catch {
            phase = .failed(
                (error as? LocalizedError)?.errorDescription
                    ?? (error as? APIError)?.errorDescription
                    ?? error.localizedDescription
            )
        }
    }

    func place(tokenIndex: Int) {
        guard phase == .solving, !arrangement.contains(tokenIndex) else { return }
        arrangement.append(tokenIndex)
    }

    func removeToken(at position: Int) {
        guard phase == .solving, arrangement.indices.contains(position) else { return }
        arrangement.remove(at: position)
    }

    func move(from source: IndexSet, to destination: Int) {
        guard phase == .solving else { return }
        arrangement.move(fromOffsets: source, toOffset: destination)
    }

    func clear() {
        guard phase == .solving else { return }
        arrangement.removeAll()
    }

    func check() {
        guard phase == .solving, let question = currentQuestion else { return }
        let isCorrect = BuildSentenceEngine.isCorrect(question, arrangement: arrangement)
        if isCorrect { correctCount += 1 }
        phase = .checked(isCorrect: isCorrect)
        QuizSound.play(isCorrect ? .success : .fail)
    }

    func advance() {
        guard case .checked = phase else { return }
        if index + 1 >= questions.count {
            phase = .finished
        } else {
            index += 1
            arrangement = []
            phase = .solving
        }
    }
}

extension BuildSentenceSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
