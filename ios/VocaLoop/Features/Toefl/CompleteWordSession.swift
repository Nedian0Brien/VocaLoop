import Foundation

/// Complete the Words 한 판의 상태. 채점과 진행은 순수 로직이라 뷰에서 분리한다.
@Observable
@MainActor
final class CompleteWordSession {
    enum Phase: Equatable {
        case generating
        case solving
        case checked
        case finished
        case failed(String)
    }

    private(set) var phase: Phase = .generating
    /// 몇 번째 생성 시도인지. 규격을 못 맞추면 재시도하므로 사용자에게 알려준다.
    private(set) var attempt = 1
    private(set) var questions: [PreparedCompleteQuestion] = []
    private(set) var index = 0
    /// [문항][빈칸][글자] 사용자가 채운 글자.
    private(set) var input: [[[String]]] = []
    private(set) var scores: [(correctCount: Int, total: Int)] = []

    let difficulty: ToeflDifficulty
    private let service: CompleteWordService
    private let request: CompleteWordService.Request

    init(service: CompleteWordService, request: CompleteWordService.Request) {
        self.service = service
        self.request = request
        self.difficulty = request.difficulty
    }

    var currentQuestion: PreparedCompleteQuestion? {
        guard index < questions.count else { return nil }
        return questions[index]
    }

    var currentInput: [[String]] {
        guard index < input.count else { return [] }
        return input[index]
    }

    var progress: Double {
        guard !questions.isEmpty else { return 0 }
        return Double(index) / Double(questions.count)
    }

    var totalCorrect: Int { scores.reduce(0) { $0 + $1.correctCount } }
    var totalBlanks: Int { scores.reduce(0) { $0 + $1.total } }

    var accuracy: Int {
        guard totalBlanks > 0 else { return 0 }
        return Int((Double(totalCorrect) / Double(totalBlanks) * 100).rounded())
    }

    /// 현재 문항에서 다 채운 빈칸 수.
    var filledCount: Int {
        guard let question = currentQuestion else { return 0 }
        return CompleteWordEngine.filledBlankCount(blanks: question.blanks, input: currentInput)
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
        attempt = 1
        do {
            let generated = try await service.generate(request) { [weak self] attempt in
                Task { @MainActor in self?.attempt = attempt }
            }
            questions = generated
            input = generated.map { question in
                question.blanks.map { blank in
                    [String](repeating: "", count: blank.answer.count)
                }
            }
            phase = .solving
        } catch {
            phase = .failed(
                (error as? LocalizedError)?.errorDescription
                    ?? (error as? APIError)?.errorDescription
                    ?? error.localizedDescription
            )
        }
    }

    func setLetter(_ letter: String, blankIndex: Int, inputIndex: Int) {
        guard phase == .solving,
              index < input.count,
              blankIndex < input[index].count,
              inputIndex < input[index][blankIndex].count else { return }

        // 한 칸에 한 글자만. 붙여넣기로 여러 글자가 들어와도 첫 글자만 쓴다.
        input[index][blankIndex][inputIndex] = String(letter.prefix(1))
    }

    func check() {
        guard phase == .solving, let question = currentQuestion else { return }
        let result = CompleteWordEngine.correctness(blanks: question.blanks, input: currentInput)
        scores.append(result)
        phase = .checked
    }

    func advance() {
        guard phase == .checked else { return }
        if index + 1 >= questions.count {
            phase = .finished
        } else {
            index += 1
            phase = .solving
        }
    }
}

extension CompleteWordSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
