import Foundation

/// Writing task(Email / Academic Discussion) 한 판의 상태.
@Observable
@MainActor
final class WritingTaskSession {
    enum Phase: Equatable {
        case generating
        case failed(String)
        /// 과제를 읽고 글을 쓰는 중.
        case writing
        /// AI 채점 대기.
        case grading
        case feedback
    }

    private(set) var phase: Phase = .generating
    private(set) var task: WritingTask?
    private(set) var feedback: WritingFeedback?
    /// 사용자가 쓴 글. 화면이 직접 바인딩한다.
    var response = ""

    let taskType: WritingTaskType
    let difficulty: ToeflDifficulty
    let vocabularySampleCount: Int

    private let service: WritingTaskService
    private let request: WritingTaskService.Request

    init(service: WritingTaskService, request: WritingTaskService.Request) {
        self.service = service
        self.request = request
        taskType = request.taskType
        difficulty = request.difficulty
        vocabularySampleCount = request.vocabularyWords.count
    }

    var wordCount: Int { WritingWordCount.count(response) }

    var canSubmit: Bool {
        phase == .writing && !response.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var timeLimitMinutes: Int {
        task?.timeLimitMinutes ?? taskType.defaultTimeLimitMinutes
    }

    func load() async {
        phase = .generating
        response = ""
        feedback = nil

        do {
            task = try await service.generate(request)
            phase = .writing
        } catch {
            phase = .failed(
                (error as? APIError)?.errorDescription ?? error.localizedDescription
            )
        }
    }

    func submit() async {
        guard canSubmit, let task else { return }

        phase = .grading
        do {
            feedback = try await service.evaluate(
                task: task,
                response: response,
                difficulty: difficulty
            )
            phase = .feedback
        } catch {
            // 채점만 실패한 것이니 쓴 글은 남겨 두고 다시 시도할 수 있게 한다.
            phase = .writing
            gradingError = (error as? APIError)?.errorDescription
                ?? "Writing 채점 중 오류가 발생했습니다."
        }
    }

    /// 채점 실패 안내. 다시 제출하면 지운다.
    private(set) var gradingError: String?

    func clearGradingError() {
        gradingError = nil
    }
}

extension WritingTaskSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
