import Foundation

/// 웹 `src/utils/vocabularyCapture.js`의 이식.
///
/// 지문에서 영어 단어만 골라내 누를 수 있게 만든다. 읽다가 모르는 단어를
/// 그 자리에서 단어장에 넣기 위한 것이라, 단어 경계 규칙이 웹과 같아야
/// 같은 지문에서 같은 단어가 잡힌다.
enum VocabularyCapture {
    /// 웹 `ENGLISH_WORD_RE` — 하이픈과 어포스트로피로 이어진 형태까지 한 단어로 본다.
    /// (well-known, don't 같은 것들)
    private static var wordPattern: Regex<Substring> {
        /[A-Za-z]+(?:[-'][A-Za-z]+)*/
    }

    /// 저장·비교에 쓸 형태. 곡선 따옴표를 곧은 것으로 바꾸고 소문자로 만든다.
    static func normalize(_ value: String) -> String {
        let straightened = value
            .replacingOccurrences(of: "\u{201C}", with: "\"")
            .replacingOccurrences(of: "\u{201D}", with: "\"")
            .replacingOccurrences(of: "\u{2018}", with: "'")
            .replacingOccurrences(of: "\u{2019}", with: "'")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard let match = straightened.firstMatch(of: wordPattern) else { return "" }
        return String(match.output).lowercased()
    }

    /// 지문 조각. 단어는 누를 수 있고 나머지는 그냥 글자다.
    enum Token: Identifiable, Sendable {
        case text(String, offset: Int)
        case word(String, key: String, offset: Int)

        var id: Int {
            switch self {
            case let .text(_, offset), let .word(_, _, offset): return offset
            }
        }

        var displayText: String {
            switch self {
            case let .text(value, _): return value
            case let .word(value, _, _): return value
            }
        }

        /// 잘라 낸 조각을 지문 전체 기준 위치로 되돌린다.
        func shifted(by delta: Int) -> Token {
            switch self {
            case let .text(value, offset):
                return .text(value, offset: offset + delta)
            case let .word(value, key, offset):
                return .word(value, key: key, offset: offset + delta)
            }
        }
    }

    /// 지문을 단어와 그 사이 글자로 쪼갠다.
    static func tokenize(_ text: String) -> [Token] {
        guard !text.isEmpty else { return [] }

        var tokens: [Token] = []
        var cursor = text.startIndex

        for match in text.matches(of: wordPattern) {
            if match.range.lowerBound > cursor {
                let gap = String(text[cursor..<match.range.lowerBound])
                tokens.append(.text(gap, offset: text.distance(from: text.startIndex, to: cursor)))
            }

            let value = String(match.output)
            tokens.append(
                .word(
                    value,
                    key: normalize(value),
                    offset: text.distance(from: text.startIndex, to: match.range.lowerBound)
                )
            )
            cursor = match.range.upperBound
        }

        if cursor < text.endIndex {
            tokens.append(
                .text(
                    String(text[cursor...]),
                    offset: text.distance(from: text.startIndex, to: cursor)
                )
            )
        }

        return tokens
    }

    /// 줄 안에서 같이 붙어 다니는 조각들. 여기서는 줄을 바꾸지 않는다.
    ///
    /// 웹은 `<p>` 안에 인라인 요소를 늘어놓으므로 줄바꿈이 공백에서만 일어난다.
    /// SwiftUI 흐름 배치는 항목 단위로 줄을 바꾸니, 공백 없는 구간을 하나로 묶어야
    /// `serendipity,`의 쉼표만 다음 줄로 떨어지는 일이 없다.
    struct Chunk: Identifiable {
        let id: Int
        let tokens: [Token]
    }

    /// `whitespace-pre-line` 한 줄.
    struct Line: Identifiable {
        let id: Int
        let chunks: [Chunk]

        /// 빈 줄. 웹에서는 높이 한 줄만큼의 빈 공간이 된다.
        var isBlank: Bool { chunks.isEmpty }
    }

    /// 지문을 줄 → 덩어리 → 조각으로 쪼갠다.
    ///
    /// 웹 클래스는 `whitespace-pre-line`이라 줄바꿈은 살리고 연속된 공백은 하나로
    /// 합쳐진다. 그 규칙을 그대로 따른다.
    static func lines(_ text: String) -> [Line] {
        var result: [Line] = []
        var offset = 0

        for (index, rawLine) in text.components(separatedBy: "\n").enumerated() {
            var chunks: [Chunk] = []

            for piece in rawLine.split(whereSeparator: { $0.isWhitespace }) {
                let value = String(piece)
                // 덩어리 안의 위치를 지문 전체 기준으로 되돌려야 id가 겹치지 않는다.
                let start = offset + (rawLine.distance(from: rawLine.startIndex, to: piece.startIndex))
                chunks.append(
                    Chunk(id: start, tokens: tokenize(value).map { $0.shifted(by: start) })
                )
            }

            result.append(Line(id: index, chunks: chunks))
            offset += rawLine.count + 1
        }

        return result
    }

    /// 저장할 때 붙이는 문맥. 웹 `buildVocabularyPayload`와 같은 규칙이다.
    ///
    /// 지문을 통째로 넣으면 단어 카드가 감당이 안 되므로 240자에서 자른다.
    static func contextExample(from stimulus: String) -> WordExample? {
        let trimmed = stimulus.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        let clipped = trimmed.count > 240
            ? String(trimmed.prefix(237)) + "..."
            : trimmed

        return WordExample(en: clipped, ko: "TOEFL Reading에서 저장한 문맥")
    }

    /// 저장한 단어에 남기는 출처 메모.
    static func sourceNote(_ label: String) -> String {
        "\(label) 중 저장한 단어입니다."
    }
}
