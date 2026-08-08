import Foundation

/// 웹 `generateReadingMockModule` / `routeReadingMockDifficulty` / `estimateReadingBand` 이식.
///
/// Stage 1로 실력을 재고, 그 결과에 따라 Stage 2의 난이도가 갈리는 적응형 모의고사다.
/// Reading task와 달리 **문항마다 지문이 따로** 붙고, 한 문항씩 바로 채점한다.
enum ReadingMockDifficulty: String, Sendable {
    /// Stage 1. 실력을 재는 단계라 난이도를 고정하지 않는다.
    case router
    case upper
    case lower

    var moduleLabel: String {
        switch self {
        case .router: return "Stage 1 Router"
        case .upper: return "Stage 2 Upper Module"
        case .lower: return "Stage 2 Lower Module"
        }
    }
}

enum ReadingMockScoring {
    /// 웹 `routeReadingMockDifficulty` — Stage 1 정답률 70% 이상이면 상위 모듈.
    static func route(correct: Int, total: Int) -> ReadingMockDifficulty {
        guard total > 0 else { return .lower }
        return Double(correct) / Double(total) >= 0.7 ? .upper : .lower
    }

    /// 웹 `estimateReadingBand` — 1~6 연습용 밴드.
    ///
    /// 하위 모듈로 갈렸으면 4를 넘지 못한다. 쉬운 문제를 다 맞혔다고
    /// 최고 밴드를 줄 수는 없다.
    static func band(correct: Int, total: Int, difficulty: ReadingMockDifficulty) -> Int {
        guard total > 0 else { return 1 }

        let accuracy = Double(correct) / Double(total)
        var band = 1
        if accuracy >= 0.9 { band = 6 }
        else if accuracy >= 0.75 { band = 5 }
        else if accuracy >= 0.6 { band = 4 }
        else if accuracy >= 0.4 { band = 3 }
        else if accuracy >= 0.2 { band = 2 }

        return difficulty == .lower ? min(band, 4) : band
    }

    /// 웹은 요청 문항 수를 두 단계로 쪼갠다.
    static func stageOneCount(_ questionCount: Int) -> Int {
        max(2, Int((Double(questionCount) / 2).rounded(.up)))
    }

    static func stageTwoCount(_ questionCount: Int) -> Int {
        max(1, questionCount - stageOneCount(questionCount))
    }
}

struct ReadingMockService: Sendable {
    let api: APIClient

    struct Request: Sendable {
        var questionCount: Int = 6
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

    func generateModule(
        _ request: Request,
        stage: Int,
        difficulty: ReadingMockDifficulty,
        questionCount: Int
    ) async throws -> ReadingMockModule {
        let endpoint = try Endpoint.json(
            "/api/ai/codex",
            method: .post,
            body: GenerateRequest(
                model: WordAnalysisService.defaultModel,
                prompt: prompt(
                    request,
                    stage: stage,
                    difficulty: difficulty,
                    questionCount: questionCount
                ),
                jsonOutput: true
            ),
            timeout: Endpoint.aiTimeout
        )

        let response = try await api.send(endpoint, as: GenerateResponse.self)

        guard let json = WordAnalysisService.extractJSONObject(from: response.text),
              let data = json.data(using: .utf8) else {
            throw APIError.decoding("AI 응답에서 JSON을 찾지 못했습니다.")
        }

        let raw: RawReadingMockModule
        do {
            raw = try JSONCoding.decoder.decode(RawReadingMockModule.self, from: data)
        } catch {
            throw APIError.decoding("AI 응답 형식이 예상과 다릅니다.")
        }

        let module = ReadingMockModule(raw, stage: stage, difficulty: difficulty)
        guard !module.items.isEmpty else {
            throw APIError.decoding("모의고사 모듈 데이터가 비어 있습니다.")
        }
        return module
    }

    /// 웹 프롬프트를 그대로 옮긴 것.
    private func prompt(
        _ request: Request,
        stage: Int,
        difficulty: ReadingMockDifficulty,
        questionCount: Int
    ) -> String {
        """
        You are creating a reduced 2026 TOEFL iBT Reading mock-test module.
        Stage: \(stage)
        Adaptive difficulty: \(difficulty.rawValue)
        \(request.difficulty.promptLine)

        Create \(questionCount) multiple-choice items across these task types:
        - Complete the Words: A short context with one missing TOEFL-level word. Ask the learner to choose the complete word that best fits.
        - Read in Daily Life: A realistic daily-life text such as a notice, email, schedule, menu, campus announcement, or short post.
        - Read an Academic Passage: A TOEFL-style academic passage that supports main idea, inference, vocabulary, and rhetorical questions.
        \(ToeflPrompt.vocabularyBlock(request.vocabularyWords))\(ToeflPrompt.topicsBlock(request.topics))

        Rules:
        - Mix task types as evenly as possible.
        - Stage 1 should calibrate ability with medium difficulty.
        - Stage 2 upper should use denser language and harder inference/rhetoric.
        - Stage 2 lower should be clearer but still TOEFL-like.
        - Each item must be answerable from its own stimulus.
        - Spread the correct answers across different option positions. Do not put the correct option at the same index in every item.
        - Diversification token (do not output): \(ToeflPrompt.randomNonce())

        Return ONLY valid JSON:
        {
          "stage": \(stage),
          "difficulty": "\(difficulty.rawValue)",
          "label": "\(difficulty.moduleLabel)",
          "items": [
            {
              "id": "s\(stage)-1",
              "taskType": "complete-words | daily-life | academic-passage",
              "title": "Short title",
              "stimulusLabel": "Complete the Words | Email | Notice | Academic passage | etc.",
              "stimulus": "Reading text or context.",
              "prompt": "Question stem",
              "options": ["A", "B", "C", "D"],
              "answerIndex": 0,
              "skillTag": "spelling-form | scanning | detail | main-idea | inference | vocabulary-context | rhetorical-structure | practical-interpretation",
              "topicTags": ["topic-or-domain"],
              "explanationKo": "Korean explanation of the answer.",
              "saveableWords": ["optional", "words"]
            }
          ]
        }
        """
    }
}

// MARK: - 모델

struct RawReadingMockModule: Decodable, Sendable {
    var stage: Int?
    var difficulty: String?
    var label: String?
    var items: [RawReadingMockItem]?
}

struct RawReadingMockItem: Decodable, Sendable {
    var id: String?
    var taskType: String?
    var title: String?
    var stimulusLabel: String?
    var stimulus: String?
    var prompt: String?
    var options: [String]?
    var answerIndex: Int?
    var skillTag: String?
    var topicTags: [String]?
    var explanationKo: String?
    var saveableWords: [String]?
}

struct ReadingMockModule: Sendable {
    let stage: Int
    let difficulty: ReadingMockDifficulty
    let label: String
    let items: [ReadingMockItem]

    init(_ raw: RawReadingMockModule, stage: Int, difficulty: ReadingMockDifficulty) {
        self.stage = raw.stage ?? stage
        self.difficulty = ReadingMockDifficulty(rawValue: raw.difficulty ?? "") ?? difficulty
        label = raw.label?.isEmpty == false
            ? raw.label!
            : (stage == 1 ? "Stage 1 Router" : "Stage 2 Module")
        items = (raw.items ?? [])
            .enumerated()
            .map { ReadingMockItem($1, index: $0, stage: stage) }
            // 지문·질문·보기가 갖춰지지 않은 문항은 풀 수 없다.
            .filter { !$0.stimulus.isEmpty && !$0.prompt.isEmpty && $0.options.count >= 2 }
    }
}

struct ReadingMockItem: Identifiable, Sendable {
    /// AI가 주는 id는 "s1-3" 같은 문자열이라 그대로 쓴다.
    let id: String
    /// 리포트가 정수 키를 쓰므로 순번을 따로 들고 있는다.
    let number: Int
    let taskType: String
    let title: String
    let stimulusLabel: String
    let stimulus: String
    let prompt: String
    let options: [String]
    let answerIndex: Int
    let skillTag: String
    let topicTags: [String]
    let explanationKo: String

    /// 웹 `TASK_LABELS`.
    var taskLabel: String {
        switch taskType {
        case "complete-words": return "Complete the Words"
        case "academic-passage": return "Read an Academic Passage"
        case "daily-life": return "Read in Daily Life"
        default: return stimulusLabel
        }
    }

    init(_ raw: RawReadingMockItem, index: Int, stage: Int) {
        id = raw.id?.isEmpty == false ? raw.id! : "s\(stage)-\(index + 1)"
        number = index
        taskType = raw.taskType?.isEmpty == false ? raw.taskType! : "daily-life"
        title = raw.title?.isEmpty == false ? raw.title! : "TOEFL Reading Item"
        stimulus = raw.stimulus ?? ""
        prompt = raw.prompt ?? ""
        options = Array((raw.options ?? []).prefix(4))

        let rawIndex = raw.answerIndex ?? 0
        answerIndex = options.indices.contains(rawIndex) ? rawIndex : 0

        skillTag = raw.skillTag?.isEmpty == false ? raw.skillTag! : "general-reading"
        topicTags = raw.topicTags ?? []
        explanationKo = raw.explanationKo?.isEmpty == false
            ? raw.explanationKo!
            : "정답 근거를 다시 확인해보세요."

        let label = raw.stimulusLabel?.isEmpty == false ? raw.stimulusLabel! : nil
        stimulusLabel = label ?? "Reading text"
    }
}
