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

    /// 생성 검증 기준. 웹 `completeWordEngine.js`의 상수와 값이 같아야 한다.
    ///
    /// 2026-08-08에 gpt-5.3-codex-spark로 7회(21문항) 생성해 측정한 결과, 기존 기준
    /// (70~100단어 / 2~10자 정답 / 기능어 2~4개 / 첫·마지막 문장 금지)에서는 세트 전체
    /// 통과율이 25%, 문항 단위로도 43%에 그쳤다. 프롬프트가 "TOEFL 학술 어휘"를
    /// 요구하면서 정답을 10자로 묶는 등 지시끼리 충돌하는 부분이 있어 기준을 넓혔다.
    static let wordCountRange = 70...110
    static let answerLengthRange = 2...12
    static let functionWordRange = 1...4

    /// 웹의 기능어 목록. 정답에 섞여 있어야 난도가 맞는다.
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

    /// 규격을 지킨 문항만 골라낸다.
    ///
    /// 검증은 문항 단위라서 한 세트가 통째로 버려질 이유가 없다.
    /// 실측상 세트 전체 통과율은 25%지만 문항 단위로는 40%대라, 여러 번 받아
    /// 통과한 것만 모으는 편이 훨씬 빨리 목표 개수에 닿는다.
    static func valid(
        in questions: [CompleteWordQuestion],
        blanksPerQuestion: Int
    ) -> [CompleteWordQuestion] {
        questions.enumerated().compactMap { index, question in
            (try? validate(question, index: index, blanksPerQuestion: blanksPerQuestion)) == nil
                ? nil
                : question
        }
    }

    /// 문항 하나를 검사한다. 규격을 어기면 던진다.
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
        guard wordCountRange.contains(wordCount) else {
            throw fail(
                "완성 지문은 \(wordCountRange.lowerBound)~\(wordCountRange.upperBound)단어여야 합니다."
            )
        }

        guard fullSentences.count >= 4, maskedSentences.count >= 4 else {
            throw fail("지문은 최소 4문장이어야 합니다.")
        }

        guard placeholderIDs(in: question.fullParagraph).isEmpty else {
            throw fail("완성 지문에는 placeholder가 없어야 합니다.")
        }

        // 첫 문장은 빈칸 없이 두어야 문맥을 잡을 단서가 남는다.
        // 마지막 문장까지 막으면 4문장 지문에서 빈칸 5개를 넣을 자리가 부족해
        // 생성이 자주 실패하므로 제한하지 않는다.
        if let first = maskedSentences.first, !placeholderIDs(in: first).isEmpty {
            throw fail("첫 문장에는 placeholder를 둘 수 없습니다.")
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
            throw fail(
                "정답은 \(answerLengthRange.lowerBound)~\(answerLengthRange.upperBound)자의 영단어여야 합니다."
            )
        }
        guard Set(answers).count == answers.count else {
            throw fail("정답 단어가 중복되어서는 안 됩니다.")
        }

        let shortFunctionWords = answers.count { $0.count <= 4 && functionWords.contains($0) }
        guard functionWordRange.contains(shortFunctionWords) else {
            throw fail(
                "짧은 기능어는 \(functionWordRange.lowerBound)~\(functionWordRange.upperBound)개여야 합니다."
            )
        }
    }

    // MARK: - 도우미

    static func isValidAnswer(_ answer: String) -> Bool {
        answerLengthRange.contains(answer.count)
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
