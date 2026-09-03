import Foundation
import Testing
import UIKit

@testable import VocaLoop

/// 웹 `completeWordEngine.js`와 동작이 같아야 한다.
/// 규칙이 어긋나면 같은 지문이 웹과 앱에서 다른 글자를 숨긴다.
@Suite("노출 글자 수")
struct PrefixRevealTests {
    @Test("길이 구간별 기본 노출 수", arguments: [
        (1, 1), (3, 1), (4, 2), (6, 2), (7, 3), (12, 3),
    ])
    func prefixByLength(letters: Int, expected: Int) {
        #expect(CompleteWordEngine.prefixRevealCount(letterCount: letters) == expected)
    }

    @Test("AI가 준 값이 범위 안이면 그대로 쓴다")
    func honorsValidRevealCount() {
        // "resilience"는 10글자 → 기본 3, 지정 5는 유효
        #expect(CompleteWordEngine.resolveRevealCount(answer: "resilience", revealCount: 5) == 5)
    }

    @Test("범위를 벗어난 값은 기본 규칙으로 대체한다")
    func rejectsInvalidRevealCount() {
        // 0 이하, 글자 수 이상은 무효
        #expect(CompleteWordEngine.resolveRevealCount(answer: "resilience", revealCount: 0) == 3)
        #expect(CompleteWordEngine.resolveRevealCount(answer: "resilience", revealCount: 10) == 3)
        #expect(CompleteWordEngine.resolveRevealCount(answer: "cat", revealCount: nil) == 1)
    }

    @Test("알파벳만 글자로 센다")
    func countsOnlyLetters() {
        #expect(CompleteWordEngine.letterCount(of: "well-known") == 9)
        #expect(CompleteWordEngine.letterCount(of: "don't") == 4)
    }
}

@Suite("빈칸 조각")
struct BlankSegmentTests {
    private func rendered(_ segments: [BlankSegment], answer: String) -> String {
        let chars = Array(answer)
        return segments.map { segment in
            switch segment {
            case let .fixed(char): return String(char)
            case let .editable(index): return index < chars.count ? "_" : "?"
            }
        }.joined()
    }

    @Test("앞 글자를 보여주고 나머지를 숨긴다")
    func revealsPrefix() {
        let segments = CompleteWordEngine.segments(for: "resilience", prefixRevealCount: 3)
        #expect(rendered(segments, answer: "resilience") == "res_______")
    }

    @Test("알파벳이 아닌 문자는 항상 보여준다")
    func keepsNonLetters() {
        let segments = CompleteWordEngine.segments(for: "well-known", prefixRevealCount: 2)
        #expect(rendered(segments, answer: "well-known") == "we__-_____")
    }

    @Test("전부 드러나면 가운데 한 글자를 다시 숨긴다")
    func alwaysLeavesOneBlank() {
        // 2글자 단어에 2글자를 보여달라고 하면 채울 칸이 없어진다.
        let segments = CompleteWordEngine.segments(for: "at", prefixRevealCount: 2)
        let editable = CompleteWordEngine.editableIndices(segments)
        #expect(!editable.isEmpty, "채울 칸이 하나도 없으면 문제가 성립하지 않는다")
    }

    @Test("알파벳이 없으면 전부 고정이다")
    func allFixedWithoutLetters() {
        let segments = CompleteWordEngine.segments(for: "123")
        #expect(CompleteWordEngine.editableIndices(segments).isEmpty)
    }

    @Test("고정 글자를 건너뛰어 앞뒤 입력 칸을 찾는다")
    func navigatesEditableIndices() {
        let segments = CompleteWordEngine.segments(for: "well-known", prefixRevealCount: 2)

        #expect(CompleteWordEngine.nextEditableIndex(after: 3, in: segments) == 5)
        #expect(CompleteWordEngine.previousEditableIndex(before: 5, in: segments) == 3)
        #expect(CompleteWordEngine.previousEditableIndex(before: 2, in: segments) == nil)
    }
}

@Suite("단일 글자 입력")
@MainActor
struct QuizLetterInputTests {
    @Test("빈 입력 칸의 Backspace를 전달한다")
    func reportsBackspaceWhenEmpty() {
        let field = BackspaceTextField()
        var deleteCount = 0
        field.onDeleteWhenEmpty = { deleteCount += 1 }

        field.text = ""
        field.deleteBackward()

        #expect(deleteCount == 1)
    }

    @Test("채워진 입력 칸의 첫 Backspace는 이전 이동으로 전달하지 않는다")
    func keepsFocusWhileDeletingLetter() {
        let field = BackspaceTextField()
        var deleteCount = 0
        field.onDeleteWhenEmpty = { deleteCount += 1 }

        field.text = "a"
        field.deleteBackward()

        // 글자 자체를 지우는 것은 편집 세션 안에서 UIKit이 한다.
        // 여기서는 우리가 덧붙인 신호가 새지 않는지만 본다.
        #expect(deleteCount == 0)
    }
}

@Suite("Complete the Words 채점")
struct CompleteWordScoringTests {
    private func blank(_ answer: String, reveal: Int? = nil) -> PreparedBlank {
        PreparedBlank(CompleteWordBlank(id: 1, answer: answer, revealCount: reveal))
    }

    /// 정답을 그대로 채운 입력 배열을 만든다.
    private func fullInput(for blank: PreparedBlank) -> [String] {
        let chars = Array(blank.answer)
        return chars.indices.map { String(chars[$0]) }
    }

    @Test("정답을 다 채우면 맞은 것으로 본다")
    func acceptsCompleteAnswer() {
        let target = blank("resilience")
        #expect(CompleteWordEngine.isBlankCorrect(
            answer: target.answer,
            segments: target.segments,
            input: fullInput(for: target)
        ))
    }

    @Test("대소문자는 무시한다")
    func ignoresCase() {
        let target = blank("resilience")
        let upper = fullInput(for: target).map { $0.uppercased() }
        #expect(CompleteWordEngine.isBlankCorrect(
            answer: target.answer,
            segments: target.segments,
            input: upper
        ))
    }

    @Test("한 글자만 틀려도 오답이다")
    func rejectsSingleWrongLetter() {
        let target = blank("resilience")
        var input = fullInput(for: target)
        if let index = CompleteWordEngine.editableIndices(target.segments).first {
            input[index] = "x"
        }
        #expect(!CompleteWordEngine.isBlankCorrect(
            answer: target.answer,
            segments: target.segments,
            input: input
        ))
    }

    @Test("빈 칸이 남으면 오답이다")
    func rejectsEmptyInput() {
        let target = blank("resilience")
        let empty = [String](repeating: "", count: target.answer.count)
        #expect(!CompleteWordEngine.isBlankCorrect(
            answer: target.answer,
            segments: target.segments,
            input: empty
        ))
    }

    @Test("채운 빈칸 수를 센다")
    func countsFilledBlanks() {
        let filled = blank("resilience")
        let untouched = blank("ephemeral")
        let input = [fullInput(for: filled), [String](repeating: "", count: 9)]

        #expect(CompleteWordEngine.filledBlankCount(blanks: [filled, untouched], input: input) == 1)
    }

    @Test("문항 정답 수를 집계한다")
    func aggregatesCorrectness() {
        let first = blank("resilience")
        let second = blank("ephemeral")
        let input = [fullInput(for: first), [String](repeating: "", count: 9)]

        let result = CompleteWordEngine.correctness(blanks: [first, second], input: input)
        #expect(result.correctCount == 1)
        #expect(result.total == 2)
    }

    @Test("사용자 답을 복원하고 못 채운 칸은 밑줄로 남긴다")
    func rebuildsUserAnswer() {
        let target = blank("cat", reveal: 1)
        let empty = [String](repeating: "", count: 3)
        #expect(CompleteWordEngine.userAnswer(blank: target, input: empty) == "c__")

        var partial = empty
        partial[1] = "a"
        #expect(CompleteWordEngine.userAnswer(blank: target, input: partial) == "ca_")
    }
}
