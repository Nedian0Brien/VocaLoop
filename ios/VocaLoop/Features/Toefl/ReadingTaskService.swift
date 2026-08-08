import Foundation

/// 웹 `src/services/toefl/reading.js`의 `generateReadingTaskSet` 이식.
///
/// Read in Daily Life와 Read an Academic Passage가 같은 함수를 쓴다.
/// 지문 하나에 객관식 여러 문항이 딸린 형태로, 두 모드는 지문 종류와
/// 문항 유형만 다르다.
enum ReadingTaskType: String, Sendable, CaseIterable {
    case dailyLife = "daily-life"
    case academicPassage = "academic-passage"

    var modeID: String {
        self == .academicPassage ? "toefl-academic-passage" : "toefl-daily-life"
    }

    var title: String {
        switch self {
        case .dailyLife: return "Read in Daily Life"
        case .academicPassage: return "Read an Academic Passage"
        }
    }

    var subtitle: String {
        switch self {
        case .dailyLife:
            return "공지, 이메일, 일정표 같은 실생활 텍스트를 빠르게 읽고 핵심 정보를 찾습니다."
        case .academicPassage:
            return "학술 지문에서 중심 생각, 세부 정보, 추론, 어휘 맥락을 확인합니다."
        }
    }

    // MARK: - 프롬프트 명세 (웹 `READING_TASK_SPECS`)

    var stimulus: String {
        switch self {
        case .dailyLife:
            return "a realistic daily-life text such as a notice, email, schedule, menu, campus announcement, or short post"
        case .academicPassage:
            return "TOEFL-style academic passage"
        }
    }

    var questionTypes: String {
        switch self {
        case .dailyLife:
            return "purpose, scanning for details, inference, and practical interpretation"
        case .academicPassage:
            return "vocabulary-in-context, factual detail, inference, rhetorical purpose, and idea relationship"
        }
    }

    var length: String {
        self == .academicPassage ? "140-220 words" : "80-140 words"
    }

    /// 학술 지문은 문항 구성이 정해져 있어 개수를 고정한다.
    var fixedQuestionCount: Int? {
        self == .academicPassage ? 5 : nil
    }

    func questionCount(requested: Int) -> Int {
        fixedQuestionCount ?? requested
    }
}

struct ReadingTaskService: Sendable {
    let api: APIClient

    struct Request: Sendable {
        var taskType: ReadingTaskType
        var questionCount: Int = 5
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

    func generate(_ request: Request) async throws -> ReadingTaskSet {
        let endpoint = try Endpoint.json(
            "/api/ai/codex",
            method: .post,
            body: GenerateRequest(
                model: WordAnalysisService.defaultModel,
                prompt: prompt(for: request),
                jsonOutput: true
            ),
            // 서버에서 Codex CLI를 돌려 오래 걸린다.
            timeout: Endpoint.aiTimeout
        )

        let response = try await api.send(endpoint, as: GenerateResponse.self)

        guard let json = WordAnalysisService.extractJSONObject(from: response.text),
              let data = json.data(using: .utf8) else {
            throw APIError.decoding("AI 응답에서 JSON을 찾지 못했습니다.")
        }

        let raw: RawReadingTaskSet
        do {
            raw = try JSONCoding.decoder.decode(RawReadingTaskSet.self, from: data)
        } catch {
            throw APIError.decoding("AI 응답 형식이 예상과 다릅니다.")
        }

        let normalized = ReadingTaskSet(raw, taskType: request.taskType)
        guard !normalized.questions.isEmpty, !normalized.stimulus.isEmpty else {
            throw APIError.decoding("문제 데이터가 비어 있습니다.")
        }
        return normalized
    }

    /// 웹 프롬프트를 그대로 옮긴 것. 문구를 바꾸면 결과 형태가 달라진다.
    private func prompt(for request: Request) -> String {
        let task = request.taskType
        let count = task.questionCount(requested: request.questionCount)
        let blueprint = task == .academicPassage ? Self.academicPassageBlueprint : ""

        return """
        You are creating practice for the 2026 TOEFL iBT Reading task "\(task.title)".
        \(request.difficulty.promptLine)

        Create one \(task.stimulus) (\(task.length)) and \(count) multiple-choice questions.
        Question types to cover: \(task.questionTypes).
        The "questions" array must contain exactly \(count) items, all answerable from that one stimulus.
        \(blueprint)
        ANSWER KEY REQUIREMENTS:
        - Spread the correct answers across different option positions. Do not put the correct option at the same index in every question.
        \(ToeflPrompt.vocabularyBlock(request.vocabularyWords))\(ToeflPrompt.topicsBlock(request.topics))
        PERSONALIZATION:
        - If learner vocabulary is provided, weave several words naturally into the text or answer explanations.
        - Keep the text realistic and readable; do not mention that it was generated.

        DIVERSITY REQUIREMENTS:
        - Vary names, settings, disciplines, and rhetorical patterns across sessions.
        - Diversification token (do not output): \(ToeflPrompt.randomNonce())

        Return ONLY valid JSON:
        {
          "taskType": "\(task.rawValue)",
          "title": "Short title",
          "stimulusLabel": "Notice | Email | Schedule | Academic passage | etc.",
          "stimulus": "The full reading text.",
          "topicTags": ["topic-or-domain"],
          "questions": [
            {
              "id": 1,
              "prompt": "Question stem",
              "options": ["A", "B", "C", "D"],
              "answerIndex": 0,
              "skillTag": "scanning | detail | main-idea | inference | vocabulary-context | rhetorical-purpose | idea-relationship | practical-interpretation",
              "explanationKo": "Korean explanation of why the answer is correct.",
              "saveableWords": ["optional", "words"]
            }
          ]
        }
        """
    }

    /// 웹 `ACADEMIC_PASSAGE_BLUEPRINT`. 학술 지문은 5문항 구성이 못 박혀 있다.
    private static let academicPassageBlueprint = """

    Academic Passage question blueprint (follow exactly, one question per numbered slot, in this order):
    1. vocabulary-context: Ask "The word/phrase X in the passage is closest in meaning to..." and choose an academic word or phrase whose meaning is clear from context.
    2. detail: Ask for directly supported information, or use a TOEFL-style negative factual stem such as "Which of the following is NOT mentioned...".
    3. inference: Use "infer", "imply", or "suggest" and require a small logical step from the passage, not outside knowledge.
    4. rhetorical-purpose: Ask why the author mentions a specific example, comparison, study, or detail.
    5. idea-relationship: Ask how two paragraphs, claims, processes, or ideas are related, such as cause/effect, example/generalization, contrast, or problem/solution.

    Academic Passage constraints:
    - Use exactly these skillTag values in the same order: vocabulary-context, detail, inference, rhetorical-purpose, idea-relationship.
    - Do not use Daily Life-only skill tags such as scanning or practical-interpretation.
    - Every incorrect option must be plausible but contradicted, unsupported, too broad, too narrow, or based on a minor detail.
    - Avoid questions that require prior knowledge; every answer must be supported by the passage alone.

    """
}

// MARK: - 모델

/// AI가 돌려주는 원본. 필드가 빠져 있어도 디코딩이 깨지지 않게 전부 옵셔널이다.
struct RawReadingTaskSet: Decodable, Sendable {
    var taskType: String?
    var title: String?
    var stimulusLabel: String?
    var stimulus: String?
    var topicTags: [String]?
    var questions: [RawReadingQuestion]?
}

struct RawReadingQuestion: Decodable, Sendable {
    var id: Int?
    var prompt: String?
    var options: [String]?
    var answerIndex: Int?
    var skillTag: String?
    var explanationKo: String?
    var saveableWords: [String]?
}

/// 화면이 쓰는 정규화된 형태. 웹 `normalizeSet`과 같은 규칙으로 다듬는다.
struct ReadingTaskSet: Sendable {
    var taskType: ReadingTaskType
    var title: String
    var stimulusLabel: String
    var stimulus: String
    var topicTags: [String]
    var questions: [ReadingQuestion]

    init(_ raw: RawReadingTaskSet, taskType: ReadingTaskType) {
        self.taskType = ReadingTaskType(rawValue: raw.taskType ?? "") ?? taskType
        title = raw.title?.isEmpty == false ? raw.title! : taskType.title
        stimulusLabel = raw.stimulusLabel?.isEmpty == false ? raw.stimulusLabel! : "Reading text"
        stimulus = raw.stimulus ?? ""
        topicTags = raw.topicTags ?? []
        questions = (raw.questions ?? [])
            .enumerated()
            .map { ReadingQuestion($1, index: $0) }
            // 보기가 둘도 안 되면 풀 수 없는 문제라 버린다.
            .filter { !$0.prompt.isEmpty && $0.options.count >= 2 }
    }
}

struct ReadingQuestion: Identifiable, Sendable {
    let id: Int
    var prompt: String
    var options: [String]
    var answerIndex: Int
    var skillTag: String
    var explanationKo: String
    var saveableWords: [String]

    init(_ raw: RawReadingQuestion, index: Int) {
        id = raw.id ?? index + 1
        prompt = raw.prompt ?? ""
        // 웹과 같이 앞 4개만 쓴다.
        options = Array((raw.options ?? []).prefix(4))
        // 범위를 벗어난 정답 색인은 0으로 떨어뜨린다. 그대로 두면 채점이 항상 오답이 된다.
        let rawIndex = raw.answerIndex ?? 0
        answerIndex = options.indices.contains(rawIndex) ? rawIndex : 0
        skillTag = raw.skillTag?.isEmpty == false ? raw.skillTag! : "general-reading"
        explanationKo = raw.explanationKo?.isEmpty == false
            ? raw.explanationKo!
            : "정답 근거를 다시 확인해보세요."
        saveableWords = raw.saveableWords ?? []
    }
}
