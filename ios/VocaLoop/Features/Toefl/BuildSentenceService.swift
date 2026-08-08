import Foundation

/// 웹 `src/services/toefl/writing.js`의 `generateBuildSentenceSet` 이식.
/// 프롬프트 문구는 웹 그대로다. 바꾸면 조각 개수·난도가 달라진다.
struct BuildSentenceService: Sendable {
    let api: APIClient

    struct Request: Sendable {
        var questionCount: Int = 5
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
        let questions: [BuildSentenceQuestion]
    }

    func generate(_ request: Request) async throws -> [BuildSentenceQuestion] {
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

        let set: QuestionSet
        do {
            set = try JSONCoding.decoder.decode(QuestionSet.self, from: data)
        } catch {
            throw APIError.decoding("AI 응답 형식이 예상과 다릅니다.")
        }

        try validate(set.questions, expected: request.questionCount)
        return set.questions
    }

    /// 웹은 이 모드에 검증 함수가 없지만, 조각과 빈칸이 어긋난 문항은
    /// 풀 수 없는 문제가 되므로 최소한의 정합성은 여기서 막는다.
    private func validate(_ questions: [BuildSentenceQuestion], expected: Int) throws {
        guard !questions.isEmpty else {
            throw APIError.decoding("Build a Sentence 문항이 비어 있습니다.")
        }

        for (index, question) in questions.enumerated() {
            let blanks = BuildSentenceEngine.blankCount(in: question.sentenceFrame)

            guard !question.answer.isEmpty else {
                throw APIError.decoding("문항 \(index + 1): 정답 토큰이 없습니다.")
            }
            guard blanks == 0 || blanks == question.answer.count else {
                throw APIError.decoding("문항 \(index + 1): 빈칸 수와 정답 토큰 수가 다릅니다.")
            }
            // 정답 토큰이 조각 목록에 없으면 배치 자체가 불가능하다.
            guard question.answer.allSatisfy({ question.words.contains($0) }) else {
                throw APIError.decoding("문항 \(index + 1): 정답 토큰이 조각 목록에 없습니다.")
            }
            guard !question.target.trimmingCharacters(in: .whitespaces).isEmpty else {
                throw APIError.decoding("문항 \(index + 1): 정답 문장이 비어 있습니다.")
            }
        }
    }

    private func prompt(for request: Request) -> String {
        let vocabBlock = request.vocabularyWords.isEmpty ? "" : """

        Prefer using these vocabulary words where natural: \
        \(request.vocabularyWords.joined(separator: ", ")).
        """
        let topicBlock = request.topics.isEmpty ? "" : """

        Use these topics: \(request.topics.joined(separator: ", ")).
        """
        let nonce = UUID().uuidString

        return """
        You are creating an ETS-style Build a Sentence practice set.
        \(request.difficulty.promptLine)
        Generate exactly \(request.questionCount) sentence-reconstruction questions.

        For each question:
        1) "context": one short English setup sentence or question that gives a realistic situation.
        2) "sentenceFrame": the sentence/question to complete, with each missing word or phrase represented by "_____". Keep any fixed words and punctuation in the frame.
        3) "target": the complete correct sentence or question after the blanks are filled.
        4) "words": scrambled array containing every answer token as words or phrases. Optionally add 0-2 plausible distractors, but keep the item solvable.
        5) "answer": array of the exact tokens that fill the blanks in order. Its length must match the number of "_____" blanks in sentenceFrame.
        \(vocabBlock)\(topicBlock)

        AUTHENTICITY REQUIREMENTS:
        - Use English context only. Do not provide Korean translations, Korean paraphrases, or Korean hint text.
        - Most items should be everyday campus, work, travel, or social situations; use academic settings only occasionally.
        - Include questions and short responses, not only declarative sentences.
        - Use words or phrases as movable tokens, such as "any books", "to be", "very engaging", or "the last chapter".
        - Keep targets concise: usually 5-12 words, with 3-7 movable tokens.
        - Avoid advanced academic vocabulary unless the context naturally requires it.
        - Incorrect distractors should create common word-order or grammar traps.
        - Do not ask for opinions or explanations in Build a Sentence.
        - Do not create standalone long academic sentences with all words scrambled.
        - Do not provide Korean translations.
        - Diversify sentence patterns across the set.
        - Diversification token (do not output): \(nonce)

        Return ONLY valid JSON:
        {
          "questions": [
            {
              "id": 1,
              "context": "I'm planning a trip to Europe this summer.",
              "sentenceFrame": "_____ _____ book your _____ _____ ?",
              "target": "Did you book your flight yet?",
              "words": ["flight", "Did", "already", "yet", "you"],
              "answer": ["Did", "you", "flight", "yet"]
            }
          ]
        }
        """
    }
}
