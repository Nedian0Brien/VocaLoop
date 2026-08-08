import Foundation

/// 웹 `src/services/toefl/buildSentenceUtils.js`의 이식.
///
/// Build a Sentence는 흩어진 단어 조각을 순서대로 골라 문장을 완성하는 모드다.
/// 문장 틀(`sentenceFrame`)의 `_____` 자리에 조각이 하나씩 들어간다.

/// AI가 만든 문항.
struct BuildSentenceQuestion: Decodable, Sendable, Identifiable {
    var id: Int
    /// 상황을 알려주는 짧은 영어 문장.
    var context: String
    /// 빈칸이 `_____`로 남아 있는 문장 틀.
    var sentenceFrame: String
    /// 완성된 정답 문장.
    var target: String
    /// 화면에 흩어놓을 조각들. 오답 유도 조각이 섞여 있을 수 있다.
    var words: [String]
    /// 빈칸에 순서대로 들어갈 조각.
    var answer: [String]
}

/// 문장 틀을 그리기 위한 조각.
enum SentenceFramePart: Equatable, Sendable {
    case text(String)
    case blank(index: Int)
}

enum BuildSentenceEngine {
    /// 밑줄 두 개 이상을 빈칸으로 본다 (웹의 `/_{2,}/g`).
    /// `Regex`가 Sendable이 아니라 저장하지 않고 매번 만든다 (리터럴이라 비용이 낮다).
    private static var blankPattern: Regex<Substring> { /_{2,}/ }

    /// 문장 부호 앞 공백을 없애고 연속 공백을 하나로 만든다.
    /// 조각을 이어붙이면 "flight ?" 처럼 벌어지므로 반드시 거쳐야 한다.
    static func normalize(_ value: String) -> String {
        var result = value.replacing(/\s+([?.!,;:])/) { match in
            String(match.output.1)
        }
        result = result.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func blankCount(in frame: String) -> Int {
        frame.matches(of: blankPattern).count
    }

    /// 문장 틀을 텍스트와 빈칸으로 쪼갠다.
    static func split(frame: String) -> [SentenceFramePart] {
        var parts: [SentenceFramePart] = []
        var blankIndex = 0
        var cursor = frame.startIndex

        for match in frame.matches(of: blankPattern) {
            if cursor < match.range.lowerBound {
                parts.append(.text(String(frame[cursor..<match.range.lowerBound])))
            }
            parts.append(.blank(index: blankIndex))
            blankIndex += 1
            cursor = match.range.upperBound
        }

        if cursor < frame.endIndex {
            parts.append(.text(String(frame[cursor...])))
        }

        return parts
    }

    /// 채워야 하는 조각 수. `answer`가 있으면 그 길이, 없으면 빈칸 수.
    static func requiredTokenCount(_ question: BuildSentenceQuestion) -> Int {
        if !question.answer.isEmpty { return question.answer.count }
        let blanks = blankCount(in: question.sentenceFrame)
        return blanks > 0 ? blanks : 1
    }

    static func hasFrame(_ question: BuildSentenceQuestion) -> Bool {
        blankCount(in: question.sentenceFrame) > 0 || !question.answer.isEmpty
    }

    /// 이 문항을 실제로 풀 수 있는지.
    ///
    /// AI는 정답 토큰의 첫 글자를 대문자로 쓰면서 조각 목록에는 소문자로 넣는 일이
    /// 잦다 (웹 프롬프트의 예시 자체가 그렇다). 대소문자를 따지면 멀쩡한 문항이
    /// 통째로 버려지므로 무시하고 비교한다. 채점도 `isCorrect`에서 소문자로 맞춘다.
    static func isUsable(_ question: BuildSentenceQuestion) -> Bool {
        guard !question.target.trimmingCharacters(in: .whitespaces).isEmpty,
              !question.words.isEmpty,
              !question.answer.isEmpty else { return false }

        // 빈칸 수와 정답 토큰 수가 다르면 채우다 만 문장이 되어 항상 오답이 된다.
        let blanks = blankCount(in: question.sentenceFrame)
        guard blanks == 0 || blanks == question.answer.count else { return false }

        let pool = Set(question.words.map { $0.lowercased() })
        return question.answer.allSatisfy { pool.contains($0.lowercased()) }
    }

    /// 빈칸에 조각을 순서대로 끼워 넣는다. 모자라면 밑줄을 남긴다.
    static func fill(frame: String, tokens: [String]) -> String {
        var index = 0
        let filled = frame.replacing(blankPattern) { _ in
            defer { index += 1 }
            return index < tokens.count ? tokens[index] : "_____"
        }
        return normalize(filled)
    }

    /// 지금까지 배치한 조각으로 만들어지는 문장.
    static func attempt(_ question: BuildSentenceQuestion, arrangement: [Int]) -> String {
        let tokens = arrangement.compactMap { index -> String? in
            guard question.words.indices.contains(index) else { return nil }
            return question.words[index]
        }

        let blanks = blankCount(in: question.sentenceFrame)
        guard blanks > 0 else { return normalize(tokens.joined(separator: " ")) }

        // 빈칸보다 많이 놓았으면 남는 조각은 뒤에 붙여 보여준다.
        let filled = fill(frame: question.sentenceFrame, tokens: tokens)
        let extras = tokens.count > blanks ? Array(tokens[blanks...]) : []
        return normalize(([filled] + extras).joined(separator: " "))
    }

    /// 제출 가능한 상태인지. 빈칸이 있는 문항은 딱 맞게 채워야 한다.
    static func canSubmit(_ question: BuildSentenceQuestion, arrangement: [Int]) -> Bool {
        guard !arrangement.isEmpty else { return false }
        if hasFrame(question) {
            return arrangement.count == requiredTokenCount(question)
        }
        return true
    }

    /// 로컬 채점.
    ///
    /// 웹은 AI에게 채점을 맡기지만(`generateBuildSentenceFeedback`), 그 프롬프트가
    /// "대소문자·여분 공백·문장부호 앞 공백만 무시하고 토큰과 순서가 정확히 같아야 한다"고
    /// 지시하므로, 그 규칙 자체는 문자열 비교로 똑같이 판정할 수 있다.
    /// AI 왕복 없이 즉시 채점하고, 피드백 문구가 필요할 때만 AI를 부른다.
    static func isCorrect(_ question: BuildSentenceQuestion, arrangement: [Int]) -> Bool {
        let attemptText = attempt(question, arrangement: arrangement)
        return normalize(attemptText).lowercased() == normalize(question.target).lowercased()
    }
}
