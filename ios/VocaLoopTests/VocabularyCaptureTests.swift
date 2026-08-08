import Foundation
import Testing

@testable import VocaLoop

/// 웹 `vocabularyCapture.js`와 같은 단어 경계를 잡아야, 같은 지문에서 같은
/// 단어가 눌리고 같은 키로 저장된다.
@Suite("지문 단어 잡기")
struct VocabularyCaptureTests {
    private func words(_ text: String) -> [String] {
        VocabularyCapture.tokenize(text).compactMap { token in
            if case let .word(value, _, _) = token { return value }
            return nil
        }
    }

    @Test("영어 단어만 골라낸다")
    func picksEnglishWords() {
        #expect(words("The library closes at 5 p.m. 오늘은 휴관입니다.")
            == ["The", "library", "closes", "at", "p", "m"])
    }

    @Test("하이픈과 어포스트로피로 이어진 형태는 한 단어다")
    func keepsHyphenAndApostrophe() {
        #expect(words("It's a well-known result.") == ["It's", "a", "well-known", "result"])
    }

    @Test("단어 사이 글자는 그대로 남아 문장이 붙지 않는다")
    func keepsSeparators() {
        let rebuilt = VocabularyCapture.tokenize("Hello, world!")
            .map(\.displayText)
            .joined()
        #expect(rebuilt == "Hello, world!")
    }

    @Test("저장 키는 소문자로 맞춘다")
    func normalizesKey() {
        #expect(VocabularyCapture.normalize("Resilience") == "resilience")
        #expect(VocabularyCapture.normalize("  UBIQUITOUS.  ") == "ubiquitous")
        // 곡선 어포스트로피도 곧은 것과 같게 본다.
        #expect(VocabularyCapture.normalize("don\u{2019}t") == "don't")
    }

    // MARK: - 줄 구성

    @Test("줄바꿈은 살리고 연속 공백은 한 칸으로 합친다")
    func keepsLineBreaksAndCollapsesSpaces() {
        // 웹 클래스가 `whitespace-pre-line`이라 이 규칙이 그대로 적용된다.
        let lines = VocabularyCapture.lines("Campus Notice\nFrom:   Office\n\nTo all")

        #expect(lines.count == 4)
        #expect(lines[0].chunks.count == 2)
        #expect(lines[1].chunks.count == 2)
        #expect(lines[2].isBlank)
        #expect(lines[3].chunks.count == 2)
    }

    @Test("공백 없이 붙은 글자는 한 덩어리로 묶인다")
    func gluesPunctuationToItsWord() {
        // 쉼표만 다음 줄로 떨어지면 웹과 다르게 보인다.
        let lines = VocabularyCapture.lines("create serendipity, and")
        let chunk = lines[0].chunks[1]

        #expect(chunk.tokens.count == 2)
        #expect(chunk.tokens.map(\.displayText).joined() == "serendipity,")
    }

    @Test("덩어리 안 조각의 위치는 지문 전체 기준이다")
    func chunkOffsetsAreGlobal() {
        // 열려 있는 단어를 위치로 구분하므로 겹치면 엉뚱한 단어가 열린다.
        let lines = VocabularyCapture.lines("one two\nthree two")
        let offsets = lines.flatMap { line in
            line.chunks.flatMap { chunk in
                chunk.tokens.compactMap { token -> Int? in
                    if case let .word(_, _, offset) = token { return offset }
                    return nil
                }
            }
        }

        #expect(offsets == [0, 4, 8, 14])
        #expect(Set(offsets).count == offsets.count)
    }

    @Test("영어가 없으면 빈 키다")
    func rejectsNonEnglish() {
        #expect(VocabularyCapture.normalize("한국어") == "")
        #expect(VocabularyCapture.normalize("123") == "")
        #expect(VocabularyCapture.tokenize("").isEmpty)
    }

    @Test("문맥 예문은 240자에서 자른다")
    func clipsContext() {
        let long = String(repeating: "a", count: 400)
        let example = VocabularyCapture.contextExample(from: long)

        #expect(example?.en.count == 240)
        #expect(example?.en.hasSuffix("...") == true)
        #expect(example?.ko == "TOEFL Reading에서 저장한 문맥")
    }

    @Test("짧은 지문은 그대로 쓴다")
    func keepsShortContext() {
        let example = VocabularyCapture.contextExample(from: "Smartphones are ubiquitous.")
        #expect(example?.en == "Smartphones are ubiquitous.")
        #expect(VocabularyCapture.contextExample(from: "   ") == nil)
    }
}

/// 저장한 세트를 그대로 되살려야 AI를 다시 부르지 않는다.
@Suite("TOEFL 세트 저장본")
struct StoredReadingTaskSetTests {
    private func sampleSet() throws -> ReadingTaskSet {
        let raw = try JSONCoding.decoder.decode(RawReadingTaskSet.self, from: Data("""
        {
          "taskType": "academic-passage",
          "title": "Coral Reefs",
          "stimulusLabel": "Academic passage",
          "stimulus": "Coral reefs support many species.",
          "topicTags": ["biology"],
          "questions": [
            {
              "id": 1, "prompt": "What is the main idea?",
              "options": ["A", "B", "C", "D"], "answerIndex": 2,
              "skillTag": "main-idea", "explanationKo": "중심 생각을 묻습니다."
            }
          ]
        }
        """.utf8))
        return ReadingTaskSet(raw, taskType: .academicPassage)
    }

    @Test("저장했다가 되살리면 같은 세트가 나온다")
    func roundTrips() throws {
        let original = try sampleSet()
        let restored = StoredReadingTaskSet(original).restored

        #expect(restored.taskType == original.taskType)
        #expect(restored.title == original.title)
        #expect(restored.stimulus == original.stimulus)
        #expect(restored.topicTags == original.topicTags)
        #expect(restored.questions.count == original.questions.count)
        #expect(restored.questions[0].answerIndex == 2)
        #expect(restored.questions[0].explanationKo == "중심 생각을 묻습니다.")
    }

    @Test("JSON으로 담았다 꺼내도 값이 유지된다")
    func survivesJSONValue() throws {
        let stored = StoredReadingTaskSet(try sampleSet())
        let json = try JSONValue.encoding(stored)
        let decoded = try json.decode(as: StoredReadingTaskSet.self)

        #expect(decoded.title == "Coral Reefs")
        #expect(decoded.questions[0].skillTag == "main-idea")
    }
}

@Suite("임의 JSON 값")
struct JSONValueTests {
    @Test("객체 키로 꺼낸다")
    func readsObjectKeys() throws {
        let json = try JSONValue.encoding(["mode": "toefl-daily-life"])
        #expect(json["mode"]?.stringValue == "toefl-daily-life")
        #expect(json["없는키"] == nil)
    }

    @Test("중첩 구조도 그대로 담는다")
    func keepsNestedShape() throws {
        struct Nested: Codable, Equatable {
            var items: [String]
            var count: Int
            var flag: Bool
        }
        let original = Nested(items: ["a", "b"], count: 2, flag: true)
        let decoded = try JSONValue.encoding(original).decode(as: Nested.self)
        #expect(decoded == original)
    }

    @Test("빈 객체를 알아본다")
    func detectsEmptyObject() {
        #expect(JSONValue.emptyObject.isEmptyObject)
        #expect(!JSONValue.string("x").isEmptyObject)
    }
}
