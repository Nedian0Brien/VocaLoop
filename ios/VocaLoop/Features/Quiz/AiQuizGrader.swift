import Foundation

/// 웹 `quizService.js`의 `gradeWithAI` / `generateAIMultipleChoice` 이식.
///
/// 설정에서 AI 모드를 켰을 때만 쓴다. 실패하면 로컬 채점·로컬 보기로 되돌아간다 —
/// 웹도 그렇게 하고, 네트워크가 끊겼다고 퀴즈가 멈추면 안 된다.
struct AiQuizGrader: Sendable {
    let api: APIClient

    private struct GenerateRequest: Encodable {
        let model: String
        let prompt: String
        let jsonOutput: Bool
    }

    private struct GenerateResponse: Decodable {
        let text: String
    }

    // MARK: - 주관식 AI 채점

    private struct GradeResponse: Decodable {
        let isCorrect: Bool?
        let reason: String?
        let feedback: String?
    }

    struct AiVerdict: Sendable {
        let isCorrect: Bool
        let feedback: String
    }

    /// 로컬 채점이 틀렸다고 본 답을 AI에게 다시 묻는다.
    ///
    /// 웹과 같이 **로컬이 이미 정답이면 AI를 부르지 않는다.** 맞은 답을 다시 물어
    /// 오답으로 뒤집힐 이유가 없고, 호출 비용만 든다.
    func grade(
        userAnswer: String,
        correctAnswer: String,
        word: Word
    ) async throws -> AiVerdict {
        let prompt = """
        당신은 영어 단어 학습 채점 전문가입니다.

        다음 영어 단어에 대한 학습자의 답안을 채점해주세요:
        - 영어 단어: \(word.word)
        - 정답: \(correctAnswer)
        - 학습자 답안: \(userAnswer)

        학습자의 답안이 의미상 정답과 일치하는지 판단해주세요.
        - 정답이 쉼표(,)로 여러 뜻을 포함한다면, 그중 하나만 의미상 맞아도 정답입니다.
        - 완전히 같은 의미: 정답
        - 유사한 의미이지만 핵심이 다름: 오답
        - 철자 오류가 있지만 의도는 명확함: 정답 (단, 오타 지적)
        - 판단 결과에는 반드시 이유를 포함해주세요.

        응답 형식:
        {
          "isCorrect": true 또는 false,
          "reason": "판단 이유 (1-2문장)"
        }
        """

        let decoded: GradeResponse = try await requestJSON(prompt: prompt)
        let isCorrect = decoded.isCorrect == true
        let feedback = decoded.reason ?? decoded.feedback ?? (
            isCorrect
                ? "AI가 답안과 정답의 의미가 같다고 판단했습니다."
                : "AI가 답안과 정답의 핵심 의미가 다르다고 판단했습니다."
        )

        return AiVerdict(isCorrect: isCorrect, feedback: feedback)
    }

    // MARK: - 객관식 AI 보기

    private struct ChoiceResponse: Decodable {
        let correct: String
        let wrong: [String]
    }

    /// 헷갈릴 만한 오답 보기를 만든다. 실패하면 호출한 쪽이 로컬 보기를 쓴다.
    func multipleChoiceOptions(for word: Word) async throws -> [String] {
        let prompt = """
        당신은 영어 단어 학습을 위한 객관식 문제 출제자입니다.

        다음 영어 단어에 대한 4지선다 문제를 만들어주세요:
        - 단어: \(word.word)
        - 정답 (한글 뜻): \(word.primaryMeaning)
        - 품사: \(word.pos ?? "")

        지능형 오답(Distractor) 3개를 생성해주세요. 오답은 다음 조건을 만족해야 합니다:
        1. 학습자가 실제로 혼동할 수 있는 비슷한 의미의 한글 단어
        2. 철자나 발음이 비슷한 다른 영어 단어의 뜻
        3. 같은 의미 범주에 속하지만 미묘하게 다른 의미

        응답 형식:
        {
          "correct": "정답 한글 뜻",
          "wrong": ["오답1", "오답2", "오답3"]
        }
        """

        let decoded: ChoiceResponse = try await requestJSON(prompt: prompt)
        guard !decoded.correct.isEmpty, decoded.wrong.count == 3 else {
            throw APIError.decoding("AI 보기 형식이 예상과 다릅니다.")
        }

        return ([decoded.correct] + decoded.wrong).shuffled()
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

        return try JSONCoding.decoder.decode(T.self, from: data)
    }
}

/// 웹 `accepted_answers` — AI 재검토로 인정받은 표현.
/// 다음 채점부터 정답 후보에 들어간다.
struct AcceptedAnswer: Codable, Hashable, Sendable {
    var mode: String
    var answer: String
    var source: String = "ai-review"
    var feedback: String?

    /// 주관식 방향에 대응하는 웹의 mode 문자열.
    static func mode(for direction: ShortAnswerDirection) -> String {
        direction == .koToEn ? "short-ko-en" : "short-en-ko"
    }
}
