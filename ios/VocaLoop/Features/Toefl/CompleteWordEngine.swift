import Foundation

/// 웹 `src/services/toefl/completeWordEngine.js`의 이식.
///
/// Complete the Words는 지문 안의 단어를 앞 몇 글자만 남기고 지운 뒤
/// 나머지를 한 글자씩 채우게 하는 모드다. 어떤 글자를 남길지 정하는 규칙과
/// 채점이 전부 이 파일에 있고, 순수 로직이라 테스트로 웹과의 일치를 못 박는다.

/// 지문 하나. AI가 만든 JSON을 그대로 담는다.
struct CompleteWordQuestion: Decodable, Sendable, Identifiable {
    /// 빈칸이 `{{1}}` 형태의 placeholder로 남아 있는 지문.
    var paragraph: String
    /// 빈칸이 채워진 완성 지문. 채점 후 보여준다.
    var fullParagraph: String
    var blanks: [CompleteWordBlank]

    var id: String { paragraph }
}

struct CompleteWordBlank: Decodable, Sendable, Identifiable {
    var id: Int
    var answer: String
    /// AI가 지정한 노출 글자 수. 범위를 벗어나면 기본 규칙으로 대체한다.
    var revealCount: Int?
}

/// 빈칸을 이루는 조각. 고정 글자와 입력 칸이 번갈아 나온다.
enum BlankSegment: Equatable, Sendable {
    /// 이미 보여주는 글자 (앞 글자, 하이픈 등 알파벳이 아닌 문자).
    case fixed(Character)
    /// 사용자가 채워야 하는 칸. `inputIndex`는 정답 문자열에서의 위치.
    case editable(inputIndex: Int)

    var inputIndex: Int? {
        if case let .editable(index) = self { return index }
        return nil
    }
}

enum CompleteWordEngine {
    /// 글자 수에 따라 앞에서 몇 글자를 보여줄지.
    static func prefixRevealCount(letterCount: Int) -> Int {
        if letterCount <= 3 { return 1 }
        if letterCount <= 6 { return 2 }
        return 3
    }

    static func letterCount(of answer: String) -> Int {
        answer.count { $0.isLetter && $0.isASCII }
    }

    /// AI가 준 `revealCount`를 쓰되, 1 이상이고 글자 수보다 작을 때만 인정한다.
    static func resolveRevealCount(answer: String, revealCount: Int?) -> Int {
        let letters = letterCount(of: answer)
        if let revealCount, revealCount >= 1, revealCount < letters {
            return revealCount
        }
        return prefixRevealCount(letterCount: letters)
    }

    /// 정답 문자열을 고정/입력 조각으로 쪼갠다.
    ///
    /// 앞에서 `prefixRevealCount`만큼 보여주되, 그러면 채울 칸이 하나도 없어지는
    /// 짧은 단어는 가운데 한 글자를 다시 숨긴다 (웹과 같은 처리).
    static func segments(for answer: String, prefixRevealCount requested: Int? = nil) -> [BlankSegment] {
        let chars = Array(answer)
        guard !chars.isEmpty else { return [.editable(inputIndex: 0)] }

        let editableIndexes = chars.indices.filter { chars[$0].isLetter && chars[$0].isASCII }
        guard !editableIndexes.isEmpty else {
            return chars.map { .fixed($0) }
        }

        var hidden = Set(editableIndexes)
        var revealed = Set<Int>()

        let requestedCount = requested ?? prefixRevealCount(letterCount: editableIndexes.count)
        let revealCount = min(requestedCount, editableIndexes.count - 1)

        for index in editableIndexes.prefix(max(0, revealCount)) {
            hidden.remove(index)
            revealed.insert(index)
        }

        if hidden.isEmpty {
            let middle = editableIndexes[editableIndexes.count / 2]
            hidden.insert(middle)
            revealed.remove(middle)
        }

        return chars.indices.map { index in
            let char = chars[index]
            if !(char.isLetter && char.isASCII) { return .fixed(char) }
            if revealed.contains(index) { return .fixed(char) }
            return .editable(inputIndex: index)
        }
    }

    // MARK: - 채점

    static func editableIndices(_ segments: [BlankSegment]) -> [Int] {
        segments.compactMap(\.inputIndex)
    }

    /// 빈칸 하나가 전부 맞았는지. 대소문자는 무시한다.
    static func isBlankCorrect(
        answer: String,
        segments: [BlankSegment],
        input: [String]
    ) -> Bool {
        let target = Array(answer)
        return editableIndices(segments).allSatisfy { index in
            let typed = (index < input.count ? input[index] : "").lowercased()
            let expected = index < target.count ? String(target[index]).lowercased() : ""
            return typed == expected
        }
    }

    /// 다 채운 빈칸 수. 진행 표시에 쓴다.
    static func filledBlankCount(
        blanks: [PreparedBlank],
        input: [[String]]
    ) -> Int {
        blanks.enumerated().count { index, blank in
            let typed = index < input.count ? input[index] : []
            let indices = editableIndices(blank.segments)
            return !indices.isEmpty && indices.allSatisfy {
                !($0 < typed.count ? typed[$0] : "").trimmingCharacters(in: .whitespaces).isEmpty
            }
        }
    }

    static func correctness(
        blanks: [PreparedBlank],
        input: [[String]]
    ) -> (correctCount: Int, total: Int) {
        let correct = blanks.enumerated().count { index, blank in
            isBlankCorrect(
                answer: blank.answer,
                segments: blank.segments,
                input: index < input.count ? input[index] : []
            )
        }
        return (correct, blanks.count)
    }

    /// 사용자가 채운 결과를 단어 형태로 복원한다 (오답 리뷰에 쓴다).
    /// 비워둔 칸은 밑줄로 표시해 어디를 못 채웠는지 보이게 한다.
    static func userAnswer(blank: PreparedBlank, input: [String]) -> String {
        blank.segments.map { segment in
            switch segment {
            case let .fixed(char):
                return String(char)
            case let .editable(index):
                let typed = index < input.count ? input[index] : ""
                return typed.isEmpty ? "_" : typed
            }
        }
        .joined()
    }
}

/// 조각까지 계산해 둔 빈칸. 화면은 이걸 그린다.
struct PreparedBlank: Identifiable, Sendable {
    let id: Int
    let answer: String
    let segments: [BlankSegment]

    init(_ blank: CompleteWordBlank) {
        id = blank.id
        answer = blank.answer
        segments = CompleteWordEngine.segments(
            for: blank.answer,
            prefixRevealCount: CompleteWordEngine.resolveRevealCount(
                answer: blank.answer,
                revealCount: blank.revealCount
            )
        )
    }
}

/// 화면에서 쓰는 문항.
struct PreparedCompleteQuestion: Identifiable, Sendable {
    let id: Int
    let paragraph: String
    let fullParagraph: String
    let blanks: [PreparedBlank]

    init(index: Int, question: CompleteWordQuestion, blanksPerQuestion: Int) {
        id = index
        paragraph = question.paragraph
        fullParagraph = question.fullParagraph
        blanks = question.blanks.prefix(blanksPerQuestion).map(PreparedBlank.init)
    }
}
