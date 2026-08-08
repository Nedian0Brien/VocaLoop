import Foundation

/// 웹 `src/services/toefl/writing.js`의 `generateWritingTask` / `evaluateWritingResponse` 이식.
///
/// 글을 쓰게 하고 AI가 0~5점으로 채점한다. 두 유형은 프롬프트 스키마가 아예
/// 다르다 — 이메일은 상황+요구사항, 토론은 교수 질문+학생 글 두 개.
enum WritingTaskType: String, Sendable, CaseIterable {
    case email
    case academicDiscussion = "academic-discussion"

    var modeID: String {
        self == .email ? "toefl-writing-email" : "toefl-writing-discussion"
    }

    var title: String {
        switch self {
        case .email: return "Write an Email"
        case .academicDiscussion: return "Write for an Academic Discussion"
        }
    }

    var subtitle: String {
        switch self {
        case .email: return "상황과 요구사항을 읽고 목적이 분명한 이메일을 작성합니다."
        case .academicDiscussion: return "교수 질문과 학생 의견을 읽고 수업 토론에 기여하는 글을 작성합니다."
        }
    }

    var symbolName: String {
        self == .email ? "envelope" : "text.quote"
    }

    /// 웹 `WRITING_TASK_SPECS`.
    var defaultTimeLimitMinutes: Int {
        self == .email ? 7 : 10
    }

    var purpose: String {
        switch self {
        case .email:
            return "a practical email for requesting information, making a recommendation, explaining a problem, or arranging a plan"
        case .academicDiscussion:
            return "an online class discussion where the learner contributes an opinion after reading a professor prompt and two student posts"
        }
    }

    var responseTarget: String {
        switch self {
        case .email:
            return "a clear email that fully addresses every bullet point in the situation"
        case .academicDiscussion:
            return "at least 100 words with a clear opinion, support, and a connection to the discussion"
        }
    }

    var placeholder: String {
        self == .email ? "Write your email here." : "Write your discussion contribution here."
    }

    var defaultWordTarget: String {
        self == .email
            ? "No fixed word count; answer completely and politely."
            : "Write at least 100 words."
    }
}

struct WritingTaskService: Sendable {
    let api: APIClient

    struct Request: Sendable {
        var taskType: WritingTaskType
        var difficulty: ToeflDifficulty = .intermediate
        var vocabularyWords: [Word] = []
        var topics: [ToeflTopic] = []
    }

    private struct GenerateRequest: Encodable {
        let model: String
        let prompt: String
        let jsonOutput: Bool
    }

    private struct GenerateResponse: Decodable {
        let text: String
    }

    // MARK: - 과제 생성

    func generate(_ request: Request) async throws -> WritingTask {
        let raw: RawWritingTask = try await requestJSON(prompt: taskPrompt(for: request))
        let task = WritingTask(raw, taskType: request.taskType)

        // 웹과 같은 검증 — 핵심 필드가 비면 화면에 올릴 수 없다.
        switch request.taskType {
        case .email where task.situation.isEmpty:
            throw APIError.decoding("이메일 과제 데이터가 비어 있습니다.")
        case .academicDiscussion where task.professorQuestion.isEmpty:
            throw APIError.decoding("토론 과제 데이터가 비어 있습니다.")
        default:
            return task
        }
    }

    private func taskPrompt(for request: Request) -> String {
        let task = request.taskType

        return """
        You are creating a 2026 TOEFL iBT Writing practice task: "\(task.title)".
        \(request.difficulty.promptLine)

        Task purpose: \(task.purpose).
        Expected response: \(task.responseTarget).
        Time limit: \(task.defaultTimeLimitMinutes) minutes.
        \(ToeflPrompt.vocabularyBlock(request.vocabularyWords))\(ToeflPrompt.topicsBlock(request.topics))
        DIVERSITY REQUIREMENTS:
        - Use realistic contexts and varied academic/campus/professional situations.
        - Avoid generic prompts about technology, climate, or education unless topic focus requires them.
        - Diversification token (do not output): \(ToeflPrompt.randomNonce())

        Return ONLY valid JSON.
        For taskType "email", use this schema:
        {
          "taskType": "email",
          "title": "Short task title",
          "situation": "A concise realistic situation paragraph.",
          "requirements": ["bullet requirement 1", "bullet requirement 2", "bullet requirement 3"],
          "recipient": "recipient role or name",
          "timeLimitMinutes": 7,
          "wordTarget": "No fixed word count; answer completely and politely."
        }

        For taskType "academic-discussion", use this schema:
        {
          "taskType": "academic-discussion",
          "title": "Short discussion title",
          "course": "Course or field name",
          "professorQuestion": "Professor prompt asking for the learner's contribution.",
          "studentPosts": [
            { "name": "Mina", "text": "Student opinion with a reason." },
            { "name": "Daniel", "text": "Different student opinion with a reason." }
          ],
          "timeLimitMinutes": 10,
          "wordTarget": "Write at least 100 words."
        }
        """
    }

    // MARK: - 채점

    func evaluate(
        task: WritingTask,
        response: String,
        difficulty: ToeflDifficulty
    ) async throws -> WritingFeedback {
        let raw: RawWritingFeedback = try await requestJSON(
            prompt: evaluationPrompt(task: task, response: response, difficulty: difficulty)
        )
        return WritingFeedback(raw)
    }

    private func evaluationPrompt(
        task: WritingTask,
        response: String,
        difficulty: ToeflDifficulty
    ) -> String {
        """
        You are a TOEFL Writing rater and Korean tutor.
        Task type: \(task.taskType.title)
        \(difficulty.promptLine)
        Task JSON:
        \(task.promptJSON)

        Learner response:
        \(response)

        Score the response on a 0-5 practice rubric:
        - 5: fully addresses the task, well organized, strong grammar and vocabulary
        - 4: clear and mostly complete, minor language issues
        - 3: adequate but limited development or noticeable language issues
        - 2: partially addresses the task, weak organization or frequent errors
        - 1: very limited
        - 0: blank, unrelated, or not in English

        Return ONLY valid JSON:
        {
          "score": 0,
          "feedbackKo": "Concise Korean feedback.",
          "strengths": ["strength1", "strength2"],
          "improvements": ["improvement1", "improvement2"],
          "nextSteps": ["next step1", "next step2"]
        }
        """
    }

    // MARK: - 공통

    private func requestJSON<T: Decodable>(prompt: String) async throws -> T {
        let endpoint = try Endpoint.json(
            "/api/ai/codex",
            method: .post,
            body: GenerateRequest(
                model: WordAnalysisService.defaultModel,
                prompt: prompt,
                jsonOutput: true
            ),
            timeout: Endpoint.aiTimeout
        )

        let response = try await api.send(endpoint, as: GenerateResponse.self)

        guard let json = WordAnalysisService.extractJSONObject(from: response.text),
              let data = json.data(using: .utf8) else {
            throw APIError.decoding("AI 응답에서 JSON을 찾지 못했습니다.")
        }

        do {
            return try JSONCoding.decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding("AI 응답 형식이 예상과 다릅니다.")
        }
    }
}

// MARK: - 모델

struct RawWritingTask: Decodable, Sendable {
    var taskType: String?
    var title: String?
    var timeLimitMinutes: Int?
    var wordTarget: String?
    // 이메일
    var situation: String?
    var requirements: [String]?
    var recipient: String?
    // 학술 토론
    var course: String?
    var professorQuestion: String?
    var studentPosts: [RawStudentPost]?
}

struct RawStudentPost: Decodable, Sendable {
    var name: String?
    var text: String?
}

struct StudentPost: Identifiable, Sendable {
    let id: Int
    let name: String
    let text: String
}

/// 화면이 쓰는 정규화된 과제. 웹 `normalizeEmailTask` / `normalizeDiscussionTask`와 같다.
struct WritingTask: Sendable {
    let taskType: WritingTaskType
    var title: String
    var timeLimitMinutes: Int
    var wordTarget: String
    // 이메일
    var situation: String
    var requirements: [String]
    var recipient: String
    // 학술 토론
    var course: String
    var professorQuestion: String
    var studentPosts: [StudentPost]

    init(_ raw: RawWritingTask, taskType: WritingTaskType) {
        self.taskType = taskType
        title = raw.title?.isEmpty == false
            ? raw.title!
            : (taskType == .email ? "Email task" : "Academic discussion")
        timeLimitMinutes = raw.timeLimitMinutes ?? taskType.defaultTimeLimitMinutes
        wordTarget = raw.wordTarget?.isEmpty == false ? raw.wordTarget! : taskType.defaultWordTarget

        situation = raw.situation ?? ""
        requirements = raw.requirements ?? []
        recipient = raw.recipient?.isEmpty == false ? raw.recipient! : "Recipient"

        course = raw.course?.isEmpty == false ? raw.course! : "Academic seminar"
        professorQuestion = raw.professorQuestion ?? ""
        // 웹과 같이 학생 글은 두 개까지만 쓴다.
        studentPosts = (raw.studentPosts ?? []).prefix(2).enumerated().map { index, post in
            StudentPost(
                id: index,
                name: post.name?.isEmpty == false ? post.name! : "Student \(index + 1)",
                text: post.text ?? ""
            )
        }
    }

    /// 채점 프롬프트에 그대로 실어 보내는 과제 요약.
    /// 웹은 `JSON.stringify(task)`를 넣으므로 같은 정보를 담는다.
    var promptJSON: String {
        var fields: [String: Any] = [
            "taskType": taskType.rawValue,
            "title": title,
            "timeLimitMinutes": timeLimitMinutes,
            "wordTarget": wordTarget,
        ]

        switch taskType {
        case .email:
            fields["situation"] = situation
            fields["requirements"] = requirements
            fields["recipient"] = recipient
        case .academicDiscussion:
            fields["course"] = course
            fields["professorQuestion"] = professorQuestion
            fields["studentPosts"] = studentPosts.map { ["name": $0.name, "text": $0.text] }
        }

        guard let data = try? JSONSerialization.data(withJSONObject: fields),
              let json = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return json
    }
}

struct RawWritingFeedback: Decodable, Sendable {
    var score: Double?
    var feedbackKo: String?
    var strengths: [String]?
    var improvements: [String]?
    var nextSteps: [String]?

    private enum CodingKeys: String, CodingKey {
        case score, feedbackKo, strengths, improvements, nextSteps
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // 웹은 `Number(result.score)`로 읽어 "3" 같은 문자열도 받는다.
        // 숫자만 받으면 점수 하나 때문에 피드백 전체가 날아간다.
        if let number = try? container.decodeIfPresent(Double.self, forKey: .score) {
            score = number
        } else if let text = try? container.decodeIfPresent(String.self, forKey: .score) {
            score = Double(text.trimmingCharacters(in: .whitespaces))
        } else {
            score = nil
        }

        feedbackKo = try container.decodeIfPresent(String.self, forKey: .feedbackKo)
        strengths = try container.decodeIfPresent([String].self, forKey: .strengths)
        improvements = try container.decodeIfPresent([String].self, forKey: .improvements)
        nextSteps = try container.decodeIfPresent([String].self, forKey: .nextSteps)
    }

    /// 테스트용 직접 생성.
    init(
        score: Double? = nil,
        feedbackKo: String? = nil,
        strengths: [String]? = nil,
        improvements: [String]? = nil,
        nextSteps: [String]? = nil
    ) {
        self.score = score
        self.feedbackKo = feedbackKo
        self.strengths = strengths
        self.improvements = improvements
        self.nextSteps = nextSteps
    }
}

struct WritingFeedback: Sendable {
    /// 0~5 연습 점수. 범위를 벗어난 값은 잘라낸다.
    let score: Int
    let feedbackKo: String
    let strengths: [String]
    let improvements: [String]
    let nextSteps: [String]

    init(_ raw: RawWritingFeedback) {
        score = Int(ToeflPrompt.clampScore(raw.score ?? 0, 0, 5).rounded())
        feedbackKo = raw.feedbackKo?.isEmpty == false ? raw.feedbackKo! : "피드백을 불러왔습니다."
        strengths = raw.strengths ?? []
        improvements = raw.improvements ?? []
        nextSteps = raw.nextSteps ?? []
    }
}

// MARK: - 단어 수

enum WritingWordCount {
    /// 웹 `countWords` — 공백으로 끊어 빈 조각을 버린다.
    static func count(_ text: String) -> Int {
        text.split(whereSeparator: \.isWhitespace).count
    }
}
