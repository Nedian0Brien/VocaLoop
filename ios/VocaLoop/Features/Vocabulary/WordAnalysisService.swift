import Foundation

/// AI가 채워주는 단어 정보. 웹의 `src/services/geminiService.js`가 만드는
/// JSON 스키마와 동일한 모양이다.
struct WordAnalysis: Decodable, Sendable {
    var word: String
    var meaningKo: String?
    var pronunciation: String?
    var pos: String?
    var definitions: [String]
    var definitionsKo: [String]
    var examples: [WordExample]
    var synonyms: [String]
    var nuance: String?

    // AI 출력이라 필드가 통째로 빠질 수 있다. 없으면 빈 값으로 받는다.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        word = (try? container.decode(String.self, forKey: .word)) ?? ""
        meaningKo = try? container.decode(String.self, forKey: .meaningKo)
        pronunciation = try? container.decode(String.self, forKey: .pronunciation)
        pos = try? container.decode(String.self, forKey: .pos)
        definitions = (try? container.decode([String].self, forKey: .definitions)) ?? []
        definitionsKo = (try? container.decode([String].self, forKey: .definitionsKo)) ?? []
        examples = (try? container.decode([WordExample].self, forKey: .examples)) ?? []
        synonyms = (try? container.decode([String].self, forKey: .synonyms)) ?? []
        nuance = try? container.decode(String.self, forKey: .nuance)
    }

    private enum CodingKeys: String, CodingKey {
        case word, meaningKo, pronunciation, pos
        case definitions, definitionsKo, examples, synonyms, nuance
    }
}

/// `/api/ai/codex`는 프롬프트를 받아 텍스트를 돌려주는 범용 엔드포인트라
/// 프롬프트 작성과 JSON 추출은 클라이언트 몫이다.
struct WordAnalysisService: Sendable {
    let api: APIClient

    /// 서버 기본 provider가 쓰는 모델. `backend/app/seed.py`의 기본값과 같다.
    static let defaultModel = "gpt-5.3-codex-spark"

    private struct GenerateRequest: Encodable {
        let model: String
        let prompt: String
        let jsonOutput: Bool
    }

    private struct GenerateResponse: Decodable {
        let text: String
    }

    func analyze(_ word: String) async throws -> WordAnalysis {
        let endpoint = try Endpoint.json(
            "/api/ai/codex",
            method: .post,
            body: GenerateRequest(
                model: Self.defaultModel,
                prompt: Self.prompt(for: word),
                jsonOutput: true
            ),
            // AI 생성은 서버에서 Codex CLI를 돌려 오래 걸린다.
            timeout: Endpoint.aiTimeout
        )

        let response = try await api.send(endpoint, as: GenerateResponse.self)

        guard let json = Self.extractJSONObject(from: response.text),
              let data = json.data(using: .utf8) else {
            throw APIError.decoding("AI 응답에서 JSON을 찾지 못했습니다.")
        }

        do {
            var analysis = try JSONCoding.decoder.decode(WordAnalysis.self, from: data)
            if analysis.word.isEmpty { analysis.word = word }
            return analysis
        } catch {
            throw APIError.decoding("AI 응답 형식이 예상과 다릅니다.")
        }
    }

    /// 웹의 `generateWordData` 프롬프트를 그대로 옮긴 것.
    /// 두 클라이언트가 같은 형식의 데이터를 만들어야 하므로 문구를 임의로 바꾸지 않는다.
    private static func prompt(for word: String) -> String {
        """
        Analyze the English word '\(word)'.
        Return a JSON object with the following structure (do not include markdown formatting, just raw JSON):
        {
            "word": "\(word)",
            "meaning_ko": "Short Korean dictionary gloss (1-3 Korean terms, comma-separated if needed)",
            "pronunciation": "IPA pronunciation (string)",
            "pos": "Part of speech (e.g., Noun, Verb)",
            "definitions": ["English definition 1", "English definition 2"],
            "definitions_ko": ["Korean translation of definition 1", "Korean translation of definition 2"],
            "examples": [
                {"en": "English example sentence using the word", "ko": "Korean translation"}
            ],
            "synonyms": ["synonym1", "synonym2"],
            "nuance": "Brief explanation of nuance or usage context in Korean"
        }

        IMPORTANT: The "meaning_ko" field is the card title and quiz answer. Keep it concise like a dictionary headword/gloss, not a definition.
        - Use 1-3 Korean terms whenever possible.
        - Do not write a full sentence, definition, or explanatory phrase in "meaning_ko".
        - Put longer explanations in "definitions_ko" or "nuance" instead.
        - Example: for "preliminaries", use "예비 절차", not "본격적인 일이나 절차가 시작되기 전에 필요한 준비 단계".
        IMPORTANT: The "definitions_ko" array must have the same length as "definitions" array, with each element being the Korean translation of the corresponding English definition.
        """
    }

    /// 모델이 코드펜스나 잡담을 섞어 보내는 경우가 있어 첫 균형 잡힌 `{...}`만 뽑는다.
    static func extractJSONObject(from text: String) -> String? {
        guard let start = text.firstIndex(of: "{") else { return nil }

        var depth = 0
        var inString = false
        var isEscaped = false

        for index in text[start...].indices {
            let character = text[index]

            if isEscaped {
                isEscaped = false
                continue
            }

            switch character {
            case "\\" where inString:
                isEscaped = true
            case "\"":
                inString.toggle()
            case "{" where !inString:
                depth += 1
            case "}" where !inString:
                depth -= 1
                if depth == 0 {
                    return String(text[start...index])
                }
            default:
                break
            }
        }

        return nil
    }
}
