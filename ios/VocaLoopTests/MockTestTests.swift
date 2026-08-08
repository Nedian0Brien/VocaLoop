import Foundation
import Testing

@testable import VocaLoop

/// 웹 `routeReadingMockDifficulty` / `estimateReadingBand`와 같은 값을 내야 한다.
/// 여기가 어긋나면 같은 실력에 웹과 앱이 다른 난이도·밴드를 준다.
@Suite("Reading 모의고사 채점")
struct ReadingMockScoringTests {
    @Test("Stage 1 정답률 70%가 상·하위 모듈을 가른다")
    func routesAtSeventyPercent() {
        #expect(ReadingMockScoring.route(correct: 7, total: 10) == .upper)
        #expect(ReadingMockScoring.route(correct: 6, total: 10) == .lower)
        // 딱 70%는 상위다.
        #expect(ReadingMockScoring.route(correct: 21, total: 30) == .upper)
    }

    @Test("푼 문항이 없으면 하위 모듈로 간다")
    func routesEmptyToLower() {
        #expect(ReadingMockScoring.route(correct: 0, total: 0) == .lower)
    }

    @Test("밴드는 정답률 구간을 따른다")
    func mapsAccuracyToBand() {
        let upper = ReadingMockDifficulty.upper
        #expect(ReadingMockScoring.band(correct: 10, total: 10, difficulty: upper) == 6)
        #expect(ReadingMockScoring.band(correct: 8, total: 10, difficulty: upper) == 5)
        #expect(ReadingMockScoring.band(correct: 6, total: 10, difficulty: upper) == 4)
        #expect(ReadingMockScoring.band(correct: 4, total: 10, difficulty: upper) == 3)
        #expect(ReadingMockScoring.band(correct: 2, total: 10, difficulty: upper) == 2)
        #expect(ReadingMockScoring.band(correct: 1, total: 10, difficulty: upper) == 1)
    }

    @Test("하위 모듈은 밴드가 4를 넘지 못한다")
    func capsLowerModuleAtFour() {
        // 쉬운 문제를 다 맞혔다고 최고 밴드를 줄 수는 없다.
        #expect(ReadingMockScoring.band(correct: 10, total: 10, difficulty: .lower) == 4)
        #expect(ReadingMockScoring.band(correct: 4, total: 10, difficulty: .lower) == 3)
    }

    @Test("문항 수를 두 단계로 쪼갠다")
    func splitsQuestionCount() {
        #expect(ReadingMockScoring.stageOneCount(6) == 3)
        #expect(ReadingMockScoring.stageTwoCount(6) == 3)
        #expect(ReadingMockScoring.stageOneCount(5) == 3)
        #expect(ReadingMockScoring.stageTwoCount(5) == 2)
        // Stage 1은 최소 2문항이라야 실력을 잴 수 있다.
        #expect(ReadingMockScoring.stageOneCount(1) == 2)
        #expect(ReadingMockScoring.stageTwoCount(1) == 1)
    }
}

@Suite("Reading 모의고사 정규화")
struct ReadingMockNormalizationTests {
    private func decode(_ json: String) throws -> RawReadingMockModule {
        try JSONCoding.decoder.decode(RawReadingMockModule.self, from: Data(json.utf8))
    }

    @Test("지문·질문·보기가 갖춰진 문항만 남긴다")
    func dropsIncompleteItems() throws {
        let raw = try decode("""
        {
          "stage": 1,
          "items": [
            { "id": "s1-1", "stimulus": "text", "prompt": "q", "options": ["A", "B"], "answerIndex": 1 },
            { "id": "s1-2", "stimulus": "", "prompt": "q", "options": ["A", "B"] },
            { "id": "s1-3", "stimulus": "text", "prompt": "", "options": ["A", "B"] },
            { "id": "s1-4", "stimulus": "text", "prompt": "q", "options": ["A"] }
          ]
        }
        """)

        let module = ReadingMockModule(raw, stage: 1, difficulty: .router)
        #expect(module.items.count == 1)
        #expect(module.items[0].id == "s1-1")
        #expect(module.items[0].answerIndex == 1)
    }

    @Test("id가 없으면 단계와 순번으로 만든다")
    func generatesMissingID() throws {
        let raw = try decode("""
        { "items": [{ "stimulus": "text", "prompt": "q", "options": ["A", "B"] }] }
        """)

        #expect(ReadingMockModule(raw, stage: 2, difficulty: .upper).items[0].id == "s2-1")
    }

    @Test("taskType으로 화면 라벨을 정한다")
    func mapsTaskLabel() throws {
        let raw = try decode("""
        {
          "items": [
            { "taskType": "complete-words", "stimulus": "t", "prompt": "q", "options": ["A", "B"] },
            { "taskType": "academic-passage", "stimulus": "t", "prompt": "q", "options": ["A", "B"] }
          ]
        }
        """)

        let items = ReadingMockModule(raw, stage: 1, difficulty: .router).items
        #expect(items[0].taskLabel == "Complete the Words")
        #expect(items[1].taskLabel == "Read an Academic Passage")
    }
}

/// 웹 `estimateWritingBand`와 같은 가중치를 써야 한다.
@Suite("Writing 모의고사 채점")
struct WritingMockScoringTests {
    @Test("문장 40% · 이메일 30% · 토론 30%로 가중한다")
    func weightsSections() {
        // 전부 만점이면 최고 밴드.
        #expect(
            WritingMockScoring.band(
                sentenceCorrect: 10, sentenceTotal: 10,
                emailScore: 5, discussionScore: 5
            ) == 6
        )
        // 전부 0점이면 최저.
        #expect(
            WritingMockScoring.band(
                sentenceCorrect: 0, sentenceTotal: 10,
                emailScore: 0, discussionScore: 0
            ) == 1
        )
    }

    @Test("문장만 다 맞히면 가중치 0.4라 중간 밴드에 머문다")
    func sentenceAloneIsNotEnough() {
        // 0.4 → 3밴드 구간(0.34~0.52).
        #expect(
            WritingMockScoring.band(
                sentenceCorrect: 10, sentenceTotal: 10,
                emailScore: 0, discussionScore: 0
            ) == 3
        )
    }

    @Test("글 두 편이 만점이면 0.6이라 4밴드다")
    func writingAloneReachesFour() {
        #expect(
            WritingMockScoring.band(
                sentenceCorrect: 0, sentenceTotal: 10,
                emailScore: 5, discussionScore: 5
            ) == 4
        )
    }

    @Test("문장 문항이 없어도 나눗셈이 깨지지 않는다")
    func handlesZeroSentences() {
        #expect(
            WritingMockScoring.band(
                sentenceCorrect: 0, sentenceTotal: 0,
                emailScore: 5, discussionScore: 5
            ) == 4
        )
    }
}

@Suite("Writing 모의고사 결과")
struct WritingMockFeedbackTests {
    private func decode(_ json: String) throws -> RawWritingMockFeedback {
        try JSONCoding.decoder.decode(RawWritingMockFeedback.self, from: Data(json.utf8))
    }

    @Test("두 점수를 0~5로 자르고 밴드를 계산한다")
    func clampsScoresAndComputesBand() throws {
        let feedback = WritingMockFeedback(
            try decode("{\"emailScore\": 9, \"discussionScore\": -1}"),
            sentenceCorrect: 5,
            sentenceTotal: 10
        )

        #expect(feedback.emailScore == 5)
        #expect(feedback.discussionScore == 0)
        #expect(feedback.constructedResponseScore == 5)
        // 0.2 + 0.3 + 0 = 0.5 → 3밴드
        #expect(feedback.band == 3)
    }

    @Test("문자열 점수도 읽는다")
    func readsStringScores() throws {
        let feedback = WritingMockFeedback(
            try decode("{\"emailScore\": \"4\", \"discussionScore\": \"3\"}"),
            sentenceCorrect: 0,
            sentenceTotal: 10
        )

        #expect(feedback.emailScore == 4)
        #expect(feedback.discussionScore == 3)
    }

    @Test("피드백 문구가 없으면 기본 문구를 쓴다")
    func fallsBackToDefault() throws {
        let feedback = WritingMockFeedback(try decode("{}"), sentenceCorrect: 0, sentenceTotal: 0)
        #expect(feedback.feedbackKo == "Writing 모의고사 피드백을 생성했습니다.")
    }
}

@Suite("Writing 모의고사 섹션")
struct WritingMockSectionTests {
    private func decode(_ json: String) throws -> RawWritingMockSection {
        try JSONCoding.decoder.decode(RawWritingMockSection.self, from: Data(json.utf8))
    }

    @Test("목표 문장이나 토큰이 없는 문항은 버린다")
    func dropsUnsolvableSentences() throws {
        // 웹 `normalizeSection`과 같은 기준이다.
        let raw = try decode("""
        {
          "sentenceItems": [
            {
              "id": 1, "context": "c", "sentenceFrame": "_____ _____ ?",
              "target": "Did you?", "words": ["Did", "you"], "answer": ["Did", "you"]
            },
            {
              "id": 2, "context": "c", "sentenceFrame": "_____ ?",
              "target": "", "words": ["a"], "answer": ["a"]
            },
            {
              "id": 3, "context": "c", "sentenceFrame": "_____ ?",
              "target": "t", "words": [], "answer": []
            }
          ],
          "emailTask": { "situation": "s" },
          "discussionTask": { "professorQuestion": "q" }
        }
        """)

        let section = WritingMockSection(raw)
        #expect(section.sentenceItems.count == 1)
        #expect(section.sentenceItems[0].id == 1)
        #expect(section.emailTask.taskType == .email)
        #expect(section.discussionTask.taskType == .academicDiscussion)
    }

    @Test("모델이 더 많이 만들어도 10문항까지만 쓴다")
    func capsSentenceCount() throws {
        let items = (1...14).map { index in
            """
            {
              "id": \(index), "context": "c", "sentenceFrame": "_____ ?",
              "target": "t\(index)", "words": ["a"], "answer": ["a"]
            }
            """
        }.joined(separator: ",")

        let raw = try decode("""
        {
          "sentenceItems": [\(items)],
          "emailTask": { "situation": "s" },
          "discussionTask": { "professorQuestion": "q" }
        }
        """)

        #expect(WritingMockSection(raw).sentenceItems.count == 10)
    }
}

/// 실제 생성물이 자주 어긋나는 지점이라 규칙을 못 박는다.
@Suite("Build a Sentence 문항 유효성")
struct BuildSentenceUsabilityTests {
    private func question(
        frame: String,
        target: String = "Did you book your flight yet?",
        words: [String] = ["flight", "did", "you", "book", "your", "yet"],
        answer: [String] = ["Did", "you", "book", "your", "flight", "yet"]
    ) throws -> BuildSentenceQuestion {
        let json = """
        {
          "id": 1,
          "context": "c",
          "sentenceFrame": "\(frame)",
          "target": "\(target)",
          "words": \(try encode(words)),
          "answer": \(try encode(answer))
        }
        """
        return try JSONCoding.decoder.decode(BuildSentenceQuestion.self, from: Data(json.utf8))
    }

    private func encode(_ values: [String]) throws -> String {
        String(data: try JSONEncoder().encode(values), encoding: .utf8) ?? "[]"
    }

    @Test("정답 토큰 대소문자가 조각과 달라도 쓸 수 있는 문항이다")
    func ignoresTokenCase() throws {
        // 웹 프롬프트의 예시 자체가 words는 소문자, answer는 대문자로 시작한다.
        // 대소문자를 따지면 정상 문항이 통째로 버려진다.
        let item = try question(frame: "_____ _____ _____ _____ _____ _____ ?")
        #expect(BuildSentenceEngine.isUsable(item))
    }

    @Test("빈칸 수와 정답 토큰 수가 다르면 버린다")
    func rejectsBlankCountMismatch() throws {
        // 채우다 만 문장이 되어 무엇을 놓아도 오답이 된다.
        let item = try question(frame: "_____ _____ _____ .")
        #expect(!BuildSentenceEngine.isUsable(item))
    }

    @Test("정답 토큰이 조각 목록에 없으면 버린다")
    func rejectsMissingToken() throws {
        let item = try question(
            frame: "_____ _____ ?",
            words: ["did", "you"],
            answer: ["Did", "never"]
        )
        #expect(!BuildSentenceEngine.isUsable(item))
    }

    @Test("정답 문장이나 조각이 비면 버린다")
    func rejectsEmptyFields() throws {
        #expect(!BuildSentenceEngine.isUsable(try question(frame: "_____ ?", target: "", words: ["a"], answer: ["a"])))
        #expect(!BuildSentenceEngine.isUsable(try question(frame: "_____ ?", words: [], answer: ["a"])))
        #expect(!BuildSentenceEngine.isUsable(try question(frame: "_____ ?", words: ["a"], answer: [])))
    }

    @Test("빈칸이 없는 자유 배열 문항은 정답 토큰만 있으면 쓸 수 있다")
    func allowsFramelessItems() throws {
        let item = try question(frame: "")
        #expect(BuildSentenceEngine.isUsable(item))
    }
}
