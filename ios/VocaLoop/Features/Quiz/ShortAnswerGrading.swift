import Foundation

/// 웹 `src/services/quizService.js`의 `gradeShortAnswer` 이식.
///
/// 방향에 따라 규칙이 다르다.
///  - **en-ko**(영어를 보고 뜻 입력): 오타를 감안해 유사도 0.8 이상이면 맞은 것으로 본다.
///    뜻이 "뜻밖의 행운, 우연한 발견"처럼 나열되면 사용자가 쉼표로 여러 개를 적을 수 있어,
///    입력을 쉼표로 쪼개 조각마다 채점하고 **하나라도 맞으면 정답**으로 인정한다.
///  - **ko-en**(뜻을 보고 영어 단어 입력): 철자를 묻는 문제라 **정확히 일치**해야 한다.
///    여기서 유사도를 허용하면 철자를 틀려도 통과해 문제 자체가 무의미해진다.
enum ShortAnswerGrading {
    /// 유사도 합격선. 웹과 같은 값이어야 한다.
    static let similarityThreshold = 0.8

    struct Result: Equatable {
        var isCorrect: Bool
        var similarity: Double
        /// 어떤 후보와 맞았는지.
        var matchedAnswer: String = ""
        var matchedAnswers: [String] = []
        /// 사용자가 적었지만 정답으로 인정되지 않은 조각. 채점 후 화면에 보여준다.
        var unmatchedAnswers: [String] = []
    }

    /// - Parameters:
    ///   - acceptedAnswers: AI 재검토로 인정받은 표현. 다음 채점부터 정답 후보에 들어간다.
    static func grade(
        _ userAnswer: String,
        against correctAnswer: String,
        direction: ShortAnswerDirection = .enToKo,
        acceptedAnswers: [String] = []
    ) -> Result {
        let candidates = uniqued(meaningCandidates(correctAnswer) + acceptedAnswers.map(trimmed))
        let answersToCheck = candidates.isEmpty ? [correctAnswer] : candidates

        if direction == .koToEn {
            return exactMatch(userAnswer, in: answersToCheck)
        }

        // 먼저 입력 전체를 정답 전체와 비교한다.
        let full = compare(userAnswer, with: correctAnswer)
        if full.isCorrect {
            return Result(
                isCorrect: true,
                similarity: full.similarity,
                matchedAnswer: full.matchedAnswer,
                matchedAnswers: [full.matchedAnswer].filter { !$0.isEmpty },
                unmatchedAnswers: []
            )
        }

        // 그다음 쉼표로 쪼갠 조각을 하나씩 본다.
        let items = splitItems(userAnswer)
        let itemResults: [(answer: String, result: Comparison)] = items.map { item in
            let best = answersToCheck
                .map { compare(item, with: $0) }
                .max { $0.similarity < $1.similarity }
            return (item, best ?? Comparison(similarity: 0, isCorrect: false, matchedAnswer: ""))
        }

        let fallback = answersToCheck.map { compare(userAnswer, with: $0) }
        let pool = itemResults.isEmpty ? fallback : itemResults.map(\.result)
        let best = pool.max { $0.similarity < $1.similarity }
            ?? Comparison(similarity: 0, isCorrect: false, matchedAnswer: "")

        let matched = uniqued(
            itemResults
                .filter { $0.result.isCorrect && !$0.result.matchedAnswer.isEmpty }
                .map(\.result.matchedAnswer)
        )
        let unmatched = itemResults.filter { !$0.result.isCorrect }.map(\.answer)

        guard let first = matched.first else {
            return Result(
                isCorrect: false,
                similarity: best.similarity,
                matchedAnswer: best.matchedAnswer,
                matchedAnswers: [],
                unmatchedAnswers: unmatched
            )
        }

        return Result(
            isCorrect: true,
            similarity: best.similarity,
            matchedAnswer: first,
            matchedAnswers: matched,
            unmatchedAnswers: unmatched
        )
    }

    // MARK: - 비교

    struct Comparison {
        var similarity: Double
        var isCorrect: Bool
        var matchedAnswer: String
    }

    /// 정규화한 형태가 같으면 1.0, 아니면 Levenshtein 유사도.
    static func compare(_ userAnswer: String, with correctAnswer: String) -> Comparison {
        let userForms = comparisonForms(userAnswer)
        let correctForms = comparisonForms(correctAnswer)

        if userForms.contains(where: correctForms.contains) {
            return Comparison(similarity: 1, isCorrect: true, matchedAnswer: trimmed(correctAnswer))
        }

        var best = 0.0
        for userForm in userForms {
            for correctForm in correctForms {
                best = max(best, similarity(userForm, correctForm))
            }
        }

        return Comparison(
            similarity: best,
            isCorrect: best >= similarityThreshold,
            matchedAnswer: trimmed(correctAnswer)
        )
    }

    /// ko-en 전용. 정규화한 형태가 정확히 같아야 정답이다.
    private static func exactMatch(_ userAnswer: String, in answers: [String]) -> Result {
        let userForms = comparisonForms(userAnswer)
        let match = answers.first { answer in
            let forms = comparisonForms(answer)
            return userForms.contains(where: forms.contains)
        }

        guard let match else {
            let typed = trimmed(userAnswer)
            return Result(
                isCorrect: false,
                similarity: 0,
                matchedAnswer: "",
                matchedAnswers: [],
                unmatchedAnswers: typed.isEmpty ? [] : [typed]
            )
        }

        return Result(
            isCorrect: true,
            similarity: 1,
            matchedAnswer: trimmed(match),
            matchedAnswers: [trimmed(match)],
            unmatchedAnswers: []
        )
    }

    // MARK: - 정규화

    private static func trimmed(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// 앞뒤 공백 제거, 소문자화, 연속 공백을 하나로.
    static func normalize(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
    }

    /// "행운(운)" 처럼 괄호로 덧붙인 설명을 떼어낸다. 전각 괄호도 함께 처리한다.
    static func stripParentheticalNotes(_ value: String) -> String {
        let pattern = "\\s*[\\(（][^()（）]*[\\)）]\\s*"
        let stripped = value.replacingOccurrences(
            of: pattern,
            with: " ",
            options: .regularExpression
        )
        return stripped.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// 비교에 쓸 형태들 — 원본과 괄호 제거본.
    static func comparisonForms(_ value: String) -> [String] {
        uniqued([normalize(value), normalize(stripParentheticalNotes(value))])
    }

    /// 쉼표로 쪼갠 조각. 전각 쉼표도 함께 본다.
    static func splitItems(_ value: String) -> [String] {
        value
            .split(whereSeparator: { $0 == "," || $0 == "，" })
            .map { trimmed(String($0)) }
            .filter { !$0.isEmpty }
    }

    /// 전체 정답 + 쉼표로 나눈 조각.
    static func meaningCandidates(_ correctAnswer: String) -> [String] {
        let full = trimmed(correctAnswer)
        return uniqued(full.isEmpty ? [] : [full] + splitItems(full))
    }

    private static func uniqued(_ values: [String]) -> [String] {
        var seen = Set<String>()
        return values.filter { !$0.isEmpty && seen.insert($0).inserted }
    }

    // MARK: - 유사도

    static func similarity(_ lhs: String, _ rhs: String) -> Double {
        let maxLength = max(lhs.count, rhs.count)
        guard maxLength > 0 else { return 0 }
        return 1 - Double(levenshteinDistance(lhs, rhs)) / Double(maxLength)
    }

    static func levenshteinDistance(_ lhs: String, _ rhs: String) -> Int {
        let a = Array(lhs), b = Array(rhs)
        if a.isEmpty { return b.count }
        if b.isEmpty { return a.count }

        // 한 줄만 들고 굴린다.
        var previous = Array(0...b.count)
        var current = [Int](repeating: 0, count: b.count + 1)

        for i in 1...a.count {
            current[0] = i
            for j in 1...b.count {
                let cost = a[i - 1] == b[j - 1] ? 0 : 1
                current[j] = min(
                    previous[j] + 1,      // 삭제
                    current[j - 1] + 1,   // 삽입
                    previous[j - 1] + cost // 교체
                )
            }
            previous = current
        }

        return previous[b.count]
    }
}
