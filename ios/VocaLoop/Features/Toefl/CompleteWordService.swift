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

    /// 실측(2026-08-08, gpt-5.3-codex-spark, 7회 생성 21문항):
    /// **세트 전체**가 검증을 통과한 비율은 25%, **문항 단위**로는 43%였다.
    /// 흔한 실패는 지문 101~102단어(상한 100), 11자 정답(상한 10자),
    /// 마지막 문장에 placeholder다. 웹도 같은 규칙이라 웹에서도 같은 빈도로 깨진다.
    ///
    /// 실패 사유를 프롬프트에 붙여 재요청하는 방법도 재봤는데 3회 모두 실패했다.
    /// 한 곳을 고치면 다른 규칙이 깨져서 도움이 되지 않았다.
    /// 그래서 세트를 통째로 버리지 않고 **통과한 문항만 모으는** 방식을 쓴다.
    static let maxAttempts = 3

    func generate(
        _ request: Request,
        onAttempt: (@Sendable (Int) -> Void)? = nil
    ) async throws -> [PreparedCompleteQuestion] {
        var accepted: [CompleteWordQuestion] = []
        var lastError: Error?

        for attempt in 1...Self.maxAttempts {
            onAttempt?(attempt)

            do {
                let questions = try await requestQuestions(request)
                accepted += CompleteWordValidator.valid(
                    in: questions,
                    blanksPerQuestion: request.blanksPerQuestion
                )
            } catch {
                // 네트워크·파싱 실패는 다음 시도에서 회복될 수 있다.
                lastError = error
            }

            if accepted.count >= request.questionCount { break }
        }

        guard !accepted.isEmpty else {
            throw lastError ?? APIError.decoding(
                "\(Self.maxAttempts)번 시도했지만 규격에 맞는 지문을 받지 못했습니다."
            )
        }

        // 목표에 못 미쳐도 모은 만큼은 풀 수 있게 한다. 빈손으로 돌려보내지 않는다.
        return accepted.prefix(request.questionCount).enumerated().map { index, question in
            PreparedCompleteQuestion(
                index: index,
                question: question,
                blanksPerQuestion: request.blanksPerQuestion
            )
        }
    }

    private func requestQuestions(_ request: Request) async throws -> [CompleteWordQuestion] {
        let endpoint = try Endpoint.json(
            "/api/ai/codex",
            method: .post,
            body: GenerateRequest(
                model: WordAnalysisService.defaultModel,
                prompt: prompt(for: request),
                jsonOutput: true
            ),
            // AI 생성은 서버에서 Codex CLI를 돌려 오래 걸린다.
            timeout: Endpoint.aiTimeout
        )

        let response = try await api.send(endpoint, as: GenerateResponse.self)

        guard let json = WordAnalysisService.extractJSONObject(from: response.text),
              let data = json.data(using: .utf8) else {
            throw APIError.decoding("AI 응답에서 JSON을 찾지 못했습니다.")
        }

        do {
            return try JSONCoding.decoder.decode(QuestionSet.self, from: data).questions
        } catch {
            throw APIError.decoding("AI 응답 형식이 예상과 다릅니다.")
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
        1) An academic paragraph (75-105 words) with at least 4 sentences.
        2) The paragraph should use TOEFL-like academic tone and topics.
        3) Replace exactly \(request.blanksPerQuestion) COMPLETE WORDS (not partial letters) with placeholders like {{1}}, {{2}}, ... {{\(request.blanksPerQuestion)}} in order of appearance.
        4) Do not place any placeholder in the first sentence. The first sentence must stay complete so the reader has context.
        5) Choose \(request.blanksPerQuestion) unique answer words that are 2-12 letters long and contain ASCII letters only.
        6) Choose 1-4 short function words from this list: as, at, by, if, in, of, on, or, so, to, up, yet, and, but, for, nor, the, with, from. Use content words for the remaining blanks.
        7) Provide the full original paragraph (without placeholders).
        8) Provide a blanks array with id, the correct COMPLETE WORD as answer, and revealCount.
        9) Choose revealCount by answer length: 2-3 letters => 1; 4-6 letters => 2-3; 7-12 letters => 2-4. Always leave at least one letter editable.
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

    /// 웹 `TOEFL_DIFFICULTY_LEVELS`의 label. 영어 그대로 쓴다.
    var label: String {
        switch self {
        case .beginner: return "Beginner"
        case .intermediate: return "Intermediate"
        case .advanced: return "Advanced"
        }
    }

    /// 웹의 caption.
    var caption: String {
        switch self {
        case .beginner: return "짧고 명확한 지문"
        case .intermediate: return "표준 연습 난이도"
        case .advanced: return "추론과 밀도 강화"
        }
    }

    /// 웹 `getToeflDifficultyPrompt`. 문구를 바꾸면 같은 난이도라도 다른 지문이 나온다.
    var promptLine: String {
        switch self {
        case .beginner:
            return "Difficulty level: beginner. Use clear, short contexts, direct wording, and mostly literal questions."
        case .intermediate:
            return "Difficulty level: intermediate. Use standard TOEFL-like contexts with moderate vocabulary and a balanced mix of detail and inference."
        case .advanced:
            return "Difficulty level: advanced. Use denser language and harder inference, rhetoric, and vocabulary-in-context questions without making the task convoluted."
        }
    }
}
