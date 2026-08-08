import Foundation

/// Writing Mock Test 한 판의 상태.
///
/// Build a Sentence 10문항 → 이메일 → 토론 순으로 이어 풀고, 마지막에 셋을
/// 합쳐 채점한다. 문장 배열은 로컬에서 채점하고 글 두 편만 AI에게 보낸다.
@Observable
@MainActor
final class WritingMockSession {
    enum Phase: Equatable {
        case generating
        case failed(String)
        /// 문장 배열 / 이메일 / 토론을 이어서 푸는 중.
        case working
        case grading
        case report
    }

    private(set) var phase: Phase = .generating
    private(set) var section: WritingMockSection?
    private(set) var feedback: WritingMockFeedback?
    /// 현재 단계. 0..<문항수는 문장 배열, 그다음이 이메일, 토론이다.
    private(set) var step = 0
    /// 문항별로 아직 쓰지 않은 토큰 색인.
    private(set) var banks: [[Int]] = []
    /// 문항별로 빈칸에 놓은 토큰 색인.
    private(set) var arrangements: [[Int]] = []
    private(set) var gradingError: String?

    var emailResponse = ""
    var discussionResponse = ""

    let difficulty: ToeflDifficulty
    let vocabularySampleCount: Int

    private let service: WritingMockService
    private let request: WritingMockService.Request

    init(service: WritingMockService, request: WritingMockService.Request) {
        self.service = service
        self.request = request
        difficulty = request.difficulty
        vocabularySampleCount = request.vocabularyWords.count
    }

    // MARK: - 단계

    var sentenceItems: [BuildSentenceQuestion] { section?.sentenceItems ?? [] }
    var sentenceCount: Int { sentenceItems.count }

    var isEmailStep: Bool { step == sentenceCount }
    var isDiscussionStep: Bool { step == sentenceCount + 1 }
    var isLastStep: Bool { isDiscussionStep }

    var currentSentence: BuildSentenceQuestion? {
        sentenceItems.indices.contains(step) ? sentenceItems[step] : nil
    }

    /// 웹 `progressLabel`.
    var progressLabel: String {
        if isEmailStep { return "Write an Email" }
        if isDiscussionStep { return "Write for an Academic Discussion" }
        return "Build a Sentence \(step + 1)/\(sentenceCount)"
    }

    var currentBank: [Int] { banks.indices.contains(step) ? banks[step] : [] }
    var currentArrangement: [Int] { arrangements.indices.contains(step) ? arrangements[step] : [] }

    /// 다음으로 넘어갈 수 있는지. 글 두 단계는 뭐라도 써야 한다.
    var canAdvance: Bool {
        guard phase == .working else { return false }
        if isEmailStep {
            return !emailResponse.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        if isDiscussionStep {
            return !discussionResponse.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        return true
    }

    var advanceTitle: String { isLastStep ? "채점 받기" : "다음" }

    // MARK: - 조작

    func load() async {
        phase = .generating
        do {
            let generated = try await service.generateSection(request)
            section = generated
            step = 0
            banks = generated.sentenceItems.map { Array($0.words.indices) }
            arrangements = generated.sentenceItems.map { _ in [] }
            emailResponse = ""
            discussionResponse = ""
            feedback = nil
            phase = .working
        } catch {
            phase = .failed(
                (error as? APIError)?.errorDescription ?? error.localizedDescription
            )
        }
    }

    /// 은행에서 토큰을 꺼내 빈칸에 놓는다.
    func place(_ wordIndex: Int) {
        guard phase == .working,
              let question = currentSentence,
              arrangements.indices.contains(step),
              arrangements[step].count < BuildSentenceEngine.requiredTokenCount(question)
        else { return }

        banks[step].removeAll { $0 == wordIndex }
        arrangements[step].append(wordIndex)
    }

    /// 빈칸에 놓은 토큰을 도로 뺀다.
    func removeToken(at position: Int) {
        guard phase == .working, arrangements.indices.contains(step),
              arrangements[step].indices.contains(position) else { return }

        let wordIndex = arrangements[step].remove(at: position)
        banks[step].append(wordIndex)
        banks[step].sort()
    }

    func resetCurrent() {
        guard phase == .working, let question = currentSentence,
              arrangements.indices.contains(step) else { return }
        banks[step] = Array(question.words.indices)
        arrangements[step] = []
    }

    func advance() async {
        guard canAdvance else { return }

        guard isLastStep else {
            step += 1
            return
        }

        await grade()
    }

    /// 문장 배열은 로컬 채점, 글 두 편은 AI 채점.
    private func grade() async {
        guard let section else { return }

        phase = .grading
        gradingError = nil

        let correct = sentenceItems.indices.count { index in
            BuildSentenceEngine.isCorrect(sentenceItems[index], arrangement: arrangements[index])
        }

        do {
            feedback = try await service.evaluate(
                section: section,
                emailResponse: emailResponse,
                discussionResponse: discussionResponse,
                sentenceCorrect: correct,
                sentenceTotal: sentenceItems.count,
                difficulty: difficulty
            )
            phase = .report
        } catch {
            // 쓴 글을 날리지 않는다. 마지막 단계로 되돌려 다시 낼 수 있게 한다.
            phase = .working
            gradingError = (error as? APIError)?.errorDescription
                ?? "Writing 모의고사 채점 중 오류가 발생했습니다."
        }
    }

    func clearGradingError() {
        gradingError = nil
    }
}

extension WritingMockSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
