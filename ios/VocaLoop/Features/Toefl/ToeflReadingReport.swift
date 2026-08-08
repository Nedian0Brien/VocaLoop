import Foundation

/// 웹 `src/utils/toeflReadingReport.js`의 이식.
///
/// 채점 결과를 스킬별·주제별로 묶고 다음에 뭘 해야 하는지까지 만들어 준다.
/// 순수 계산이라 테스트로 웹과의 일치를 못 박는다.
enum ToeflReadingReport {
    static let optionLabels = ["A", "B", "C", "D", "E"]

    struct QuestionReview: Identifiable, Sendable {
        let id: Int
        /// 화면에 보이는 문항 번호 (1부터).
        let number: Int
        let prompt: String
        let skillTag: String
        let topicTags: [String]
        let selectedIndex: Int?
        let selectedLabel: String
        let selectedAnswer: String
        let answerIndex: Int
        let answerLabel: String
        let correctAnswer: String
        let correct: Bool
        let explanationKo: String
    }

    /// 스킬·주제별 정답률 묶음.
    struct Bucket: Identifiable, Sendable {
        var label: String
        var correct: Int
        var total: Int
        var accuracy: Int

        var id: String { label }
    }

    struct Feedback: Sendable {
        let headline: String
        let detail: String
        let nextSteps: [String]
    }

    struct Result: Sendable {
        let accuracy: Int
        let correctCount: Int
        let wrongCount: Int
        let totalCount: Int
        let skillBreakdown: [Bucket]
        let topicBreakdown: [Bucket]
        let questionReviews: [QuestionReview]
        let wrongItems: [QuestionReview]
        let feedback: Feedback
    }

    /// 한 문항의 채점 결과.
    struct Answer: Sendable {
        let questionID: Int
        let selectedIndex: Int?
        let answerIndex: Int
        let correct: Bool
        let skillTag: String
    }

    static func build(
        questions: [ReadingQuestion],
        answers: [Answer],
        difficulty: ToeflDifficulty,
        topicTags: [String] = []
    ) -> Result {
        let byID = Dictionary(answers.map { ($0.questionID, $0) }, uniquingKeysWith: { first, _ in first })

        let reviews = questions.enumerated().map { index, question -> QuestionReview in
            let answer = byID[question.id] ?? (
                answers.indices.contains(index) ? answers[index] : nil
            )
            let selected = answer?.selectedIndex
            let answerIndex = answer?.answerIndex ?? question.answerIndex
            let correct = answer?.correct ?? (selected == answerIndex)

            return QuestionReview(
                id: question.id,
                number: index + 1,
                prompt: question.prompt,
                skillTag: question.skillTag,
                topicTags: topicTags,
                selectedIndex: selected,
                selectedLabel: label(at: selected, in: question.options),
                selectedAnswer: option(at: selected, in: question.options) ?? "선택 없음",
                answerIndex: answerIndex,
                answerLabel: label(at: answerIndex, in: question.options),
                correctAnswer: option(at: answerIndex, in: question.options) ?? "정답 정보 없음",
                correct: correct,
                explanationKo: question.explanationKo
            )
        }

        let total = reviews.count
        let correct = reviews.count(where: \.correct)
        let accuracy = total > 0 ? clampPercent(Double(correct) / Double(total) * 100) : 0
        let skills = breakdown(reviews, by: { [$0.skillTag] }, fallback: "general-reading")
        let topics = breakdown(reviews, by: \.topicTags, fallback: "untagged")
            .filter { $0.label != "untagged" }
        let wrong = reviews.filter { !$0.correct }

        return Result(
            accuracy: accuracy,
            correctCount: correct,
            wrongCount: max(0, total - correct),
            totalCount: total,
            skillBreakdown: skills,
            topicBreakdown: topics,
            questionReviews: reviews,
            wrongItems: wrong,
            feedback: feedback(
                accuracy: accuracy,
                wrongItems: wrong,
                skillBreakdown: skills,
                difficulty: difficulty
            )
        )
    }

    // MARK: - 내부

    private static func clampPercent(_ value: Double) -> Int {
        max(0, min(100, Int(value.rounded())))
    }

    private static func option(at index: Int?, in options: [String]) -> String? {
        guard let index, options.indices.contains(index) else { return nil }
        return options[index]
    }

    private static func label(at index: Int?, in options: [String]) -> String {
        guard let index, options.indices.contains(index),
              optionLabels.indices.contains(index) else { return "" }
        return optionLabels[index]
    }

    /// 정답률이 낮은 순으로 정렬한다. 약한 곳이 먼저 보여야 한다.
    private static func breakdown(
        _ reviews: [QuestionReview],
        by keys: (QuestionReview) -> [String],
        fallback: String
    ) -> [Bucket] {
        var buckets: [String: Bucket] = [:]

        for review in reviews {
            let values = keys(review).filter { !$0.isEmpty }
            for label in (values.isEmpty ? [fallback] : values) {
                var bucket = buckets[label] ?? Bucket(label: label, correct: 0, total: 0, accuracy: 0)
                bucket.total += 1
                if review.correct { bucket.correct += 1 }
                buckets[label] = bucket
            }
        }

        return buckets.values
            .map { bucket in
                var updated = bucket
                updated.accuracy = bucket.total > 0
                    ? clampPercent(Double(bucket.correct) / Double(bucket.total) * 100)
                    : 0
                return updated
            }
            .sorted {
                if $0.accuracy != $1.accuracy { return $0.accuracy < $1.accuracy }
                if $0.total != $1.total { return $0.total > $1.total }
                return $0.label < $1.label
            }
    }

    /// 웹 `buildFeedback`. 문구까지 같아야 두 화면의 조언이 어긋나지 않는다.
    private static func feedback(
        accuracy: Int,
        wrongItems: [QuestionReview],
        skillBreakdown: [Bucket],
        difficulty: ToeflDifficulty
    ) -> Feedback {
        guard !wrongItems.isEmpty else {
            return Feedback(
                headline: "목표 TOEFL \(difficulty.label)+ 기준으로 근거 추적이 안정적입니다.",
                detail: "모든 문항에서 선택지와 지문 근거를 잘 연결했습니다. 다음 세트에서는 풀이 속도를 유지하면서 inference와 rhetorical-purpose 문항의 근거 문장을 빠르게 표시하는 연습이 좋습니다.",
                nextSteps: [
                    "정답 근거가 되는 문장을 지문 안에서 1개씩 표시하며 복습하세요.",
                    "같은 난이도의 새 지문에서는 풀이 시간을 조금 줄여 정확도를 유지해보세요.",
                ]
            )
        }

        var missedSkills: [String] = []
        for item in wrongItems where !item.skillTag.isEmpty && !missedSkills.contains(item.skillTag) {
            missedSkills.append(item.skillTag)
        }

        let focusSkill = skillBreakdown.first(where: { $0.total > 0 })?.label
            ?? missedSkills.first
            ?? "reading evidence"

        return Feedback(
            headline: "정답률 \(accuracy)%입니다. 우선 \(focusSkill) 유형의 근거 판별을 보강하세요.",
            detail: wrongItems.first.map { "가장 먼저 볼 오답 근거: \($0.explanationKo)" }
                ?? "오답 문항에서는 선택지가 지문보다 넓게 말하거나, 지문에 없는 정보를 끼워 넣는지 확인하는 것이 좋습니다.",
            nextSteps: [
                missedSkills.isEmpty
                    ? "오답 문항의 정답 선택지를 지문 근거와 한 줄씩 연결하세요."
                    : "\(missedSkills.joined(separator: ", ")) 문항의 정답 선택지를 지문 근거와 한 줄씩 연결하세요.",
                "내가 고른 선택지가 왜 너무 넓거나, 좁거나, unsupported인지 한 문장으로 적어보세요.",
            ]
        )
    }
}
