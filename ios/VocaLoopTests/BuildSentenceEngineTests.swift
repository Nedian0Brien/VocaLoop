import Foundation
import Testing

@testable import VocaLoop

private func question(
    frame: String = "_____ _____ book your _____ _____ ?",
    target: String = "Did you book your flight yet?",
    words: [String] = ["flight", "Did", "already", "yet", "you"],
    answer: [String] = ["Did", "you", "flight", "yet"]
) -> BuildSentenceQuestion {
    BuildSentenceQuestion(
        id: 1,
        context: "I'm planning a trip.",
        sentenceFrame: frame,
        target: target,
        words: words,
        answer: answer
    )
}

/// 웹 `buildSentenceUtils.js`와 동작이 같아야 한다.
@Suite("문장 정규화")
struct BuildSentenceNormalizeTests {
    @Test("문장 부호 앞 공백을 없앤다")
    func removesSpaceBeforePunctuation() {
        #expect(BuildSentenceEngine.normalize("Did you book your flight yet ?") == "Did you book your flight yet?")
        #expect(BuildSentenceEngine.normalize("Wait , really !") == "Wait, really!")
    }

    @Test("연속 공백을 하나로 줄이고 앞뒤를 다듬는다")
    func collapsesWhitespace() {
        #expect(BuildSentenceEngine.normalize("  a   b \n c  ") == "a b c")
    }

    @Test("빈 문자열도 안전하게 처리한다")
    func handlesEmpty() {
        #expect(BuildSentenceEngine.normalize("") == "")
        #expect(BuildSentenceEngine.normalize("   ") == "")
    }
}

@Suite("문장 틀 분해")
struct SentenceFrameTests {
    @Test("밑줄 두 개 이상만 빈칸으로 센다")
    func countsBlanks() {
        #expect(BuildSentenceEngine.blankCount(in: "_____ a _____ b") == 2)
        // 밑줄 하나는 빈칸이 아니다 (웹의 /_{2,}/)
        #expect(BuildSentenceEngine.blankCount(in: "a _ b") == 0)
    }

    @Test("텍스트와 빈칸을 순서대로 쪼갠다")
    func splitsIntoParts() {
        let parts = BuildSentenceEngine.split(frame: "_____ book your _____ ?")
        #expect(parts.count == 4)
        #expect(parts[0] == .blank(index: 0))
        #expect(parts[1] == .text(" book your "))
        #expect(parts[2] == .blank(index: 1))
        #expect(parts[3] == .text(" ?"))
    }

    @Test("빈칸이 없으면 텍스트 하나만 나온다")
    func handlesFrameWithoutBlanks() {
        let parts = BuildSentenceEngine.split(frame: "no blanks here")
        #expect(parts == [.text("no blanks here")])
    }

    @Test("필요한 조각 수는 answer 길이를 따른다")
    func requiredTokenCountFollowsAnswer() {
        #expect(BuildSentenceEngine.requiredTokenCount(question()) == 4)
        // answer가 비면 빈칸 수로 떨어진다
        let noAnswer = question(answer: [])
        #expect(BuildSentenceEngine.requiredTokenCount(noAnswer) == 4)
    }
}

@Suite("조각 배치와 채점")
struct BuildSentenceScoringTests {
    /// 정답 순서대로 배치한 arrangement를 만든다.
    private func correctArrangement(_ q: BuildSentenceQuestion) -> [Int] {
        q.answer.compactMap { token in q.words.firstIndex(of: token) }
    }

    @Test("빈칸을 채워 문장을 만든다")
    func fillsFrame() {
        let q = question()
        let attempt = BuildSentenceEngine.attempt(q, arrangement: correctArrangement(q))
        #expect(attempt == "Did you book your flight yet?")
    }

    @Test("모자라게 배치하면 빈칸이 남는다")
    func leavesUnfilledBlanks() {
        let q = question()
        let partial = Array(correctArrangement(q).prefix(2))
        let attempt = BuildSentenceEngine.attempt(q, arrangement: partial)
        #expect(attempt.contains("_____"))
    }

    @Test("정답 순서면 맞은 것으로 본다")
    func acceptsCorrectOrder() {
        let q = question()
        #expect(BuildSentenceEngine.isCorrect(q, arrangement: correctArrangement(q)))
    }

    @Test("순서가 다르면 오답이다")
    func rejectsWrongOrder() {
        let q = question()
        var swapped = correctArrangement(q)
        swapped.swapAt(0, 1)
        #expect(!BuildSentenceEngine.isCorrect(q, arrangement: swapped))
    }

    @Test("오답 유도 조각을 넣으면 틀린다")
    func rejectsDistractor() {
        let q = question()
        var withDistractor = correctArrangement(q)
        // "already"는 정답에 없는 조각
        if let distractor = q.words.firstIndex(of: "already") {
            withDistractor[3] = distractor
        }
        #expect(!BuildSentenceEngine.isCorrect(q, arrangement: withDistractor))
    }

    @Test("대소문자만 다르면 맞은 것으로 본다")
    func ignoresCase() {
        let q = question(
            target: "did you book your flight yet?",
            words: ["flight", "Did", "yet", "you"],
            answer: ["Did", "you", "flight", "yet"]
        )
        #expect(BuildSentenceEngine.isCorrect(q, arrangement: correctArrangement(q)))
    }

    @Test("빈칸 수만큼 배치해야 제출할 수 있다")
    func gatesSubmission() {
        let q = question()
        let full = correctArrangement(q)

        #expect(!BuildSentenceEngine.canSubmit(q, arrangement: []))
        #expect(!BuildSentenceEngine.canSubmit(q, arrangement: Array(full.prefix(3))))
        #expect(BuildSentenceEngine.canSubmit(q, arrangement: full))
        // 너무 많이 놓아도 제출 불가
        #expect(!BuildSentenceEngine.canSubmit(q, arrangement: full + [2]))
    }
}
