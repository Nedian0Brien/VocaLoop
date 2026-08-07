import Foundation

/// 웹 `src/services/quizService.js`의 주관식 채점 이식.
///
/// 기본 방향(en-ko)은 영어 단어를 보여주고 **한국어 뜻**을 입력받는다.
/// 뜻이 "뜻밖의 행운, 우연한 발견"처럼 쉼표로 나열될 수 있어 각 조각도 정답으로 인정하고,
/// 오타를 감안해 Levenshtein 유사도 0.8 이상이면 맞은 것으로 본다.
enum ShortAnswerGrading {
    /// 유사도 합격선. 웹과 같은 값이어야 한다.
    static let similarityThreshold = 0.8

    struct Result: Equatable {
        var isCorrect: Bool
        var similarity: Double
    }

    static func grade(_ userAnswer: String, against correctAnswer: String) -> Result {
        let userForms = comparisonForms(userAnswer)
        guard !userForms.isEmpty else { return Result(isCorrect: false, similarity: 0) }

        // 전체 정답과 쉼표로 나눈 조각을 모두 후보로 둔다.
        let candidates = meaningCandidates(correctAnswer)
        guard !candidates.isEmpty else { return Result(isCorrect: false, similarity: 0) }

        var best = 0.0
        for candidate in candidates {
            for correctForm in comparisonForms(candidate) {
                for userForm in userForms {
                    if userForm == correctForm {
                        return Result(isCorrect: true, similarity: 1)
                    }
                    best = max(best, similarity(userForm, correctForm))
                }
            }
        }

        return Result(isCorrect: best >= similarityThreshold, similarity: best)
    }

    // MARK: - 정규화

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
        var forms: [String] = []
        for candidate in [normalize(value), normalize(stripParentheticalNotes(value))] {
            if !candidate.isEmpty, !forms.contains(candidate) {
                forms.append(candidate)
            }
        }
        return forms
    }

    /// 전체 정답 + 쉼표로 나눈 조각.
    static func meaningCandidates(_ correctAnswer: String) -> [String] {
        let full = correctAnswer.trimmingCharacters(in: .whitespacesAndNewlines)
        var candidates = full.isEmpty ? [] : [full]

        for piece in full.split(whereSeparator: { $0 == "," || $0 == "，" }) {
            let trimmed = piece.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty, !candidates.contains(trimmed) {
                candidates.append(trimmed)
            }
        }

        return candidates
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
