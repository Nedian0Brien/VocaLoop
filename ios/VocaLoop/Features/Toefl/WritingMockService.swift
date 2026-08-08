import Foundation

/// 웹 `generateWritingMockSection` / `evaluateWritingMockSection` / `estimateWritingBand` 이식.
///
/// Build a Sentence 10문항 + 이메일 1편 + 학술 토론 1편을 한 번에 만들고,
/// 셋을 합쳐 1~6 밴드를 추정한다.
enum WritingMockScoring {
    /// 웹 `estimateWritingBand` — 문장 배열 40%, 이메일 30%, 토론 30%.
    static func band(
        sentenceCorrect: Int,
        sentenceTotal: Int,
        emailScore: Int,
        discussionScore: Int
    ) -> Int {
        let sentenceRatio = sentenceTotal > 0
            ? Double(sentenceCorrect) / Double(sentenceTotal)
            : 0
        let emailRatio = ToeflPrompt.clampScore(Double(emailScore), 0, 5) / 5
        let discussionRatio = ToeflPrompt.clampScore(Double(discussionScore), 0, 5) / 5
        let weighted = (sentenceRatio * 0.4) + (emailRatio * 0.3) + (discussionRatio * 0.3)

        if weighted >= 0.88 { return 6 }
        if weighted >= 0.72 { return 5 }
        if weighted >= 0.52 { return 4 }
        if weighted >= 0.34 { return 3 }
        if weighted >= 0.16 { return 2 }
        return 1
    }
}

struct WritingMockService: Sendable {
    let api: APIClient

    struct Request: Sendable {
        var sentenceCount: Int = 10
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

    // MARK: - 섹션 생성

    func generateSection(_ request: Request) async throws -> WritingMockSection {
        let raw: RawWritingMockSection = try await requestJSON(prompt: sectionPrompt(request))
        let section = WritingMockSection(raw)

        guard !section.sentenceItems.isEmpty,
              !section.emailTask.situation.isEmpty,
              !section.discussionTask.professorQuestion.isEmpty else {
            throw APIError.decoding("Writing 모의고사 데이터가 비어 있습니다.")
        }
        return section
    }

    private func sectionPrompt(_ request: Request) -> String {
        """
        You are creating a reduced 2026 TOEFL iBT Writing mock test.
        \(request.difficulty.promptLine)

        Create:
        1) \(request.sentenceCount) Build a Sentence items.
        2) One Write an Email task.
        3) One Write for an Academic Discussion task.
        \(ToeflPrompt.vocabularyBlock(request.vocabularyWords))\(ToeflPrompt.topicsBlock(request.topics))

        Build a Sentence rules:
        - Use the same ETS-style Build a Sentence schema as standalone practice.
        - Each item needs "context", "sentenceFrame", "target", "words", and "answer".
        - Use English context only. Do not provide Korean translations.
        - Most items should be everyday campus, work, travel, or social situations.
        - Include questions and short responses, not only declarative sentences.
        - "words" must contain all answer tokens in scrambled order and may include 0-2 plausible distractors.
        - "answer" must list the exact tokens that fill the blanks in order.
        - Keep targets concise: usually 5-12 words, with 3-7 movable tokens.

        Writing task rules:
        - Email task should be practical and answerable in 7 minutes.
        - Academic discussion task should include professor prompt and two student posts, answerable in 10 minutes.
        - Diversification token (do not output): \(ToeflPrompt.randomNonce())

        Return ONLY valid JSON:
        {
          "sentenceItems": [
            {
              "id": 1,
              "context": "I'm going to study at the library this afternoon.",
              "sentenceFrame": "_____ _____ _____ _____ _____ _____ ?",
              "target": "Do you need to borrow any books?",
              "words": ["to", "do", "borrow", "any books", "you", "need"],
              "answer": ["Do", "you", "need", "to", "borrow", "any books"]
            }
          ],
          "emailTask": {
            "taskType": "email",
            "title": "Short task title",
            "situation": "A concise realistic situation paragraph.",
            "requirements": ["bullet requirement 1", "bullet requirement 2", "bullet requirement 3"],
            "recipient": "recipient role or name",
            "timeLimitMinutes": 7,
            "wordTarget": "No fixed word count; answer completely and politely."
          },
          "discussionTask": {
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
        }
        """
    }

    // MARK: - 통합 채점

    func evaluate(
        section: WritingMockSection,
        emailResponse: String,
        discussionResponse: String,
        sentenceCorrect: Int,
        sentenceTotal: Int,
        difficulty: ToeflDifficulty
    ) async throws -> WritingMockFeedback {
        let raw: RawWritingMockFeedback = try await requestJSON(
            prompt: """
            You are a TOEFL Writing rater and Korean tutor.
            \(difficulty.promptLine)
            Build a Sentence result: \(sentenceCorrect)/\(sentenceTotal) correct.

            Email task:
            \(section.emailTask.promptJSON)
            Email response:
            \(emailResponse)

            Academic discussion task:
            \(section.discussionTask.promptJSON)
            Discussion response:
            \(discussionResponse)

            Score emailScore and discussionScore from 0-5 using TOEFL-style practice criteria: task fulfillment, organization, development, language control.
            Return ONLY valid JSON:
            {
              "emailScore": 0,
              "discussionScore": 0,
              "feedbackKo": "Overall Korean feedback.",
              "strengths": ["strength1", "strength2"],
              "improvements": ["improvement1", "improvement2"],
              "nextSteps": ["next step1", "next step2"]
            }
            """
        )

        return WritingMockFeedback(
            raw,
            sentenceCorrect: sentenceCorrect,
            sentenceTotal: sentenceTotal
        )
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

struct RawWritingMockSection: Decodable, Sendable {
    var sentenceItems: [BuildSentenceQuestion]?
    var emailTask: RawWritingTask?
    var discussionTask: RawWritingTask?
}

struct WritingMockSection: Sendable {
    let sentenceItems: [BuildSentenceQuestion]
    let emailTask: WritingTask
    let discussionTask: WritingTask

    /// 웹 `normalizeSection`과 같은 규칙 — 목표 문장과 토큰이 있어야 풀 수 있고,
    /// 모델이 더 많이 만들어도 10문항까지만 쓴다.
    static let sentenceLimit = 10

    init(_ raw: RawWritingMockSection) {
        sentenceItems = (raw.sentenceItems ?? [])
            .filter(BuildSentenceEngine.isUsable)
            .prefix(Self.sentenceLimit)
            .map { $0 }
        emailTask = WritingTask(raw.emailTask ?? RawWritingTask(), taskType: .email)
        discussionTask = WritingTask(
            raw.discussionTask ?? RawWritingTask(),
            taskType: .academicDiscussion
        )
    }
}

struct RawWritingMockFeedback: Decodable, Sendable {
    var emailScore: Double?
    var discussionScore: Double?
    var feedbackKo: String?
    var strengths: [String]?
    var improvements: [String]?
    var nextSteps: [String]?

    private enum CodingKeys: String, CodingKey {
        case emailScore, discussionScore, feedbackKo, strengths, improvements, nextSteps
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        emailScore = try Self.lenientScore(container, forKey: .emailScore)
        discussionScore = try Self.lenientScore(container, forKey: .discussionScore)
        feedbackKo = try container.decodeIfPresent(String.self, forKey: .feedbackKo)
        strengths = try container.decodeIfPresent([String].self, forKey: .strengths)
        improvements = try container.decodeIfPresent([String].self, forKey: .improvements)
        nextSteps = try container.decodeIfPresent([String].self, forKey: .nextSteps)
    }

    /// 웹은 `Number(score)`로 읽어 "3" 같은 문자열도 받는다.
    private static func lenientScore(
        _ container: KeyedDecodingContainer<CodingKeys>,
        forKey key: CodingKeys
    ) throws -> Double? {
        if let number = try? container.decodeIfPresent(Double.self, forKey: key) {
            return number
        }
        if let text = try? container.decodeIfPresent(String.self, forKey: key) {
            return Double(text.trimmingCharacters(in: .whitespaces))
        }
        return nil
    }

    init(
        emailScore: Double? = nil,
        discussionScore: Double? = nil,
        feedbackKo: String? = nil,
        strengths: [String]? = nil,
        improvements: [String]? = nil,
        nextSteps: [String]? = nil
    ) {
        self.emailScore = emailScore
        self.discussionScore = discussionScore
        self.feedbackKo = feedbackKo
        self.strengths = strengths
        self.improvements = improvements
        self.nextSteps = nextSteps
    }
}

struct WritingMockFeedback: Sendable {
    let sentenceCorrect: Int
    let sentenceTotal: Int
    let emailScore: Int
    let discussionScore: Int
    let band: Int
    let feedbackKo: String
    let strengths: [String]
    let improvements: [String]
    let nextSteps: [String]

    /// 이메일 + 토론 합산 (0~10).
    var constructedResponseScore: Int { emailScore + discussionScore }

    init(_ raw: RawWritingMockFeedback, sentenceCorrect: Int, sentenceTotal: Int) {
        self.sentenceCorrect = sentenceCorrect
        self.sentenceTotal = sentenceTotal
        emailScore = Int(ToeflPrompt.clampScore(raw.emailScore ?? 0, 0, 5).rounded())
        discussionScore = Int(ToeflPrompt.clampScore(raw.discussionScore ?? 0, 0, 5).rounded())
        band = WritingMockScoring.band(
            sentenceCorrect: sentenceCorrect,
            sentenceTotal: sentenceTotal,
            emailScore: emailScore,
            discussionScore: discussionScore
        )
        feedbackKo = raw.feedbackKo?.isEmpty == false
            ? raw.feedbackKo!
            : "Writing 모의고사 피드백을 생성했습니다."
        strengths = raw.strengths ?? []
        improvements = raw.improvements ?? []
        nextSteps = raw.nextSteps ?? []
    }
}
