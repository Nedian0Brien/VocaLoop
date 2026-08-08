import Foundation

/// 웹 `validateGeneratedCompleteQuestionSet`의 이식.
///
/// AI 출력은 자주 규격을 벗어난다. 그대로 화면에 올리면 빈칸과 placeholder가
/// 어긋난 문제를 사용자가 풀게 되므로, 웹과 같은 기준으로 걸러낸다.
enum CompleteWordValidator {
    struct ValidationError: LocalizedError {
        let questionIndex: Int
        let reason: String

        var errorDescription: String? {
            "Complete the Words 문항 \(questionIndex + 1): \(reason)"
        }
    }

    struct SetError: LocalizedError {
        let reason: String
        var errorDescription: String? { reason }
    }

    /// 웹의 기능어 목록. 이 중 2~4개가 정답에 섞여 있어야 난도가 맞는다.
    static let functionWords: Set<String> = [
        "as", "at", "by", "if", "in", "of", "on", "or", "so", "to",
        "up", "yet", "and", "but", "for", "nor", "the", "with", "from",
    ]

    static func validate(
        _ questions: [CompleteWordQuestion],
        questionCount: Int,
        blanksPerQuestion: Int
    ) throws {
        guard questions.count == questionCount else {
            throw SetError(reason: "Complete the Words 문항 수가 \(questionCount)개가 아닙니다.")
        }

        for (index, question) in questions.enumerated() {
            try validate(question, index: index, blanksPerQuestion: blanksPerQuestion)
        }
    }

    private static func validate(
        _ question: CompleteWordQuestion,
        index: Int,
        blanksPerQuestion: Int
    ) throws {
        func fail(_ reason: String) -> ValidationError {
            ValidationError(questionIndex: index, reason: reason)
        }

        let fullSentences = sentences(in: question.fullParagraph)
        let maskedSentences = sentences(in: question.paragraph)

        let wordCount = question.fullParagraph
            .split(whereSeparator: \.isWhitespace)
            .count
        guard (70...100).contains(wordCount) else {
            throw fail("완성 지문은 70~100단어여야 합니다.")
        }

        guard fullSentences.count >= 4, maskedSentences.count >= 4 else {
            throw fail("지문은 최소 4문장이어야 합니다.")
        }

        guard placeholderIDs(in: question.fullParagraph).isEmpty else {
            throw fail("완성 지문에는 placeholder가 없어야 합니다.")
        }

        // 첫/마지막 문장에 빈칸이 있으면 문맥 단서가 사라진다.
        if let first = maskedSentences.first, !placeholderIDs(in: first).isEmpty {
            throw fail("첫 문장에는 placeholder를 둘 수 없습니다.")
        }
        if let last = maskedSentences.last, !placeholderIDs(in: last).isEmpty {
            throw fail("마지막 문장에는 placeholder를 둘 수 없습니다.")
        }

        guard question.blanks.count == blanksPerQuestion else {
            throw fail("빈칸은 \(blanksPerQuestion)개여야 합니다.")
        }

        let blankIDs = question.blanks.map(\.id)
        guard Set(blankIDs).count == blankIDs.count else {
            throw fail("빈칸 ID는 중복되지 않은 정수여야 합니다.")
        }

        let placeholders = placeholderIDs(in: question.paragraph)
        guard placeholders.count == blanksPerQuestion,
              Set(placeholders).count == placeholders.count,
              Set(placeholders) == Set(blankIDs) else {
            throw fail("placeholder와 빈칸 ID가 일치해야 합니다.")
        }

        let answers = question.blanks.map { $0.answer.lowercased() }
        guard answers.allSatisfy(isValidAnswer) else {
            throw fail("정답은 2~10자의 영단어여야 합니다.")
        }
        guard Set(answers).count == answers.count else {
            throw fail("정답 단어가 중복되어서는 안 됩니다.")
        }

        let shortFunctionWords = answers.count { $0.count <= 4 && functionWords.contains($0) }
        guard (2...4).contains(shortFunctionWords) else {
            throw fail("짧은 기능어는 2~4개여야 합니다.")
        }
    }

    // MARK: - 도우미

    static func isValidAnswer(_ answer: String) -> Bool {
        (2...10).contains(answer.count)
            && answer.allSatisfy { $0.isASCII && $0.isLowercase && $0.isLetter }
    }

    /// `{{3}}` 형태의 placeholder 번호를 순서대로 뽑는다.
    static func placeholderIDs(in text: String) -> [Int] {
        let pattern = /\{\{(\d+)\}\}/
        return text.matches(of: pattern).compactMap { Int($0.output.1) }
    }

    /// 문장 부호로 끊는다. 웹의 정규식과 같은 규칙이다.
    static func sentences(in text: String) -> [String] {
        let pattern = /[^.!?]+[.!?]+|[^.!?]+/
        return text.matches(of: pattern)
            .map { String($0.output).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }
}
