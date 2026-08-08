import Foundation

/// 웹 `src/services/toefl/reading.js`의 `generateCompleteTheWordSet` 이식.
///
/// 프롬프트 문구를 임의로 바꾸지 않는다. 웹과 다른 지시를 주면 같은 모델이
/// 다른 형태의 지문을 만들어 검증 규칙에 걸린다.
struct CompleteWordService: Sendable {
    let api: APIClient

    struct Request: Sendable {
        var questionCount: Int = 3
        var blanksPerQuestion: Int = 5
        /// 웹의 targetScore. 난이도 문구를 고르는 데 쓴다.
        var difficulty: ToeflDifficulty = .intermediate
        var vocabularyWords: [String] = []
        var topics: [String] = []
    }

    private struct GenerateRequest: Encodable {
        let model: String
        let prompt: String
        let jsonOutput: Bool
    }

    private struct GenerateResponse: Decodable {
        let text: String
    }

    private struct QuestionSet: Decodable {
        let questions: [CompleteWordQuestion]
    }

    func generate(_ request: Request) async throws -> [PreparedCompleteQuestion] {
        let endpoint = try Endpoint.json(
            "/api/ai/codex",
            method: .post,
            body: GenerateRequest(
                model: WordAnalysisService.defaultModel,
                prompt: prompt(for: request),
                jsonOutput: true
            )
        )

        let response = try await api.send(endpoint, as: GenerateResponse.self)

        guard let json = WordAnalysisService.extractJSONObject(from: response.text),
              let data = json.data(using: .utf8) else {
            throw APIError.decoding("AI 응답에서 JSON을 찾지 못했습니다.")
        }

        let set: QuestionSet
        do {
            set = try JSONCoding.decoder.decode(QuestionSet.self, from: data)
        } catch {
            throw APIError.decoding("AI 응답 형식이 예상과 다릅니다.")
        }

        try CompleteWordValidator.validate(
            set.questions,
            questionCount: request.questionCount,
            blanksPerQuestion: request.blanksPerQuestion
        )

        return set.questions.enumerated().map { index, question in
            PreparedCompleteQuestion(
                index: index,
                question: question,
                blanksPerQuestion: request.blanksPerQuestion
            )
        }
    }

    /// 웹 프롬프트를 그대로 옮긴 것. 문구를 바꾸면 검증 규칙과 어긋난다.
    private func prompt(for request: Request) -> String {
        let vocabBlock = request.vocabularyWords.isEmpty ? "" : """

        Prefer using these vocabulary words where natural: \
        \(request.vocabularyWords.joined(separator: ", ")).
        """
        let topicBlock = request.topics.isEmpty ? "" : """

        Use these topics: \(request.topics.joined(separator: ", ")).
        """
        // 웹은 매 요청마다 난수를 넣어 같은 지문이 반복되지 않게 한다.
        let nonce = UUID().uuidString

        return """
        You are creating a TOEFL academic reading practice set.
        \(request.difficulty.promptLine)
        Create \(request.questionCount) questions. Each question must include:
        1) An academic paragraph (70-100 words) with at least 4 sentences.
        2) The paragraph should use TOEFL-like academic tone and topics.
        3) Replace exactly \(request.blanksPerQuestion) COMPLETE WORDS (not partial letters) with placeholders like {{1}}, {{2}}, ... {{\(request.blanksPerQuestion)}} in order of appearance.
        4) Do not place placeholders in the first or last sentence. Place every placeholder in the middle sentences.
        5) Choose \(request.blanksPerQuestion) unique answer words that are 2-10 letters long and contain ASCII letters only.
        6) Choose exactly 2-4 short function words from this list: as, at, by, if, in, of, on, or, so, to, up, yet, and, but, for, nor, the, with, from. Use content words for the remaining blanks.
        7) Provide the full original paragraph (without placeholders).
        8) Provide a blanks array with id, the correct COMPLETE WORD as answer, and revealCount.
        9) Choose revealCount by answer length: 2-3 letters => 1; 4-6 letters => 2-3; 7-10 letters => 2-4. Always leave at least one letter editable.
        \(vocabBlock)\(topicBlock)
        DIVERSITY REQUIREMENTS (CRITICAL — different from previous sessions):
        - Vary sentence openings, syntactic patterns, and rhetorical structures.
        - Vary specific examples, named entities, regions, and time periods across questions.
        - Avoid reusing the same anchor verbs/adverbs across questions in this set.
        - Diversification token (do not output): \(nonce)

        IMPORTANT: Replace the ENTIRE word, not just part of it.
        Example CORRECT: "The {{1}} of knowledge is essential." (answer: "transfer")
        Example WRONG: "The trans{{1}} of knowledge is essential." (answer: "fer")

        Return ONLY valid JSON in this schema:
        {
          "questions": [
            {
              "paragraph": "Text with {{1}} placeholders for complete words",
              "fullParagraph": "Complete paragraph with all words",
              "blanks": [
                { "id": 1, "answer": "transfer", "revealCount": 3 }
              ]
            }
          ]
        }
        """
    }
}

/// 웹의 targetScore 구간에 대응하는 난이도.
enum ToeflDifficulty: String, CaseIterable, Identifiable, Sendable {
    case beginner, intermediate, advanced

    var id: String { rawValue }

    var label: String {
        switch self {
        case .beginner: return "기초"
        case .intermediate: return "중급"
        case .advanced: return "고급"
        }
    }

    var promptLine: String {
        switch self {
        case .beginner:
            return "Target TOEFL score band 60-79. Use accessible academic vocabulary and shorter sentences."
        case .intermediate:
            return "Target TOEFL score band 80-99. Use standard academic vocabulary and moderate sentence complexity."
        case .advanced:
            return "Target TOEFL score band 100-120. Use sophisticated academic vocabulary and complex sentence structures."
        }
    }
}
