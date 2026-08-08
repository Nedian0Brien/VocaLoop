import Foundation
import Testing

@testable import VocaLoop

/// AI 출력은 자주 어긋난다. 웹 `normalizeSet`과 같은 규칙으로 다듬어야
/// 풀 수 없는 문제가 화면에 올라가지 않는다.
@Suite("Reading task 정규화")
struct ReadingTaskNormalizationTests {
    private func decode(_ json: String) throws -> RawReadingTaskSet {
        try JSONCoding.decoder.decode(RawReadingTaskSet.self, from: Data(json.utf8))
    }

    @Test("정상 응답을 그대로 읽어낸다")
    func readsWellFormedSet() throws {
        let raw = try decode("""
        {
          "taskType": "daily-life",
          "title": "Library Notice",
          "stimulusLabel": "Notice",
          "stimulus": "The library will close early on Friday.",
          "topicTags": ["campus"],
          "questions": [
            {
              "id": 1,
              "prompt": "What is the purpose?",
              "options": ["A", "B", "C", "D"],
              "answerIndex": 2,
              "skillTag": "scanning",
              "explanationKo": "공지의 목적을 묻습니다.",
              "saveableWords": ["notice"]
            }
          ]
        }
        """)

        let set = ReadingTaskSet(raw, taskType: .dailyLife)
        #expect(set.taskType == .dailyLife)
        #expect(set.title == "Library Notice")
        #expect(set.questions.count == 1)
        #expect(set.questions[0].answerIndex == 2)
        #expect(set.questions[0].skillTag == "scanning")
    }

    @Test("보기가 둘도 안 되는 문항은 버린다")
    func dropsUnanswerableQuestions() throws {
        let raw = try decode("""
        {
          "stimulus": "text",
          "questions": [
            { "prompt": "ok", "options": ["A", "B"], "answerIndex": 0 },
            { "prompt": "broken", "options": ["only one"], "answerIndex": 0 },
            { "prompt": "", "options": ["A", "B"], "answerIndex": 0 }
          ]
        }
        """)

        let set = ReadingTaskSet(raw, taskType: .dailyLife)
        #expect(set.questions.count == 1)
        #expect(set.questions[0].prompt == "ok")
    }

    @Test("보기는 앞 4개만 쓴다")
    func keepsFirstFourOptions() throws {
        let raw = try decode("""
        {
          "stimulus": "text",
          "questions": [
            { "prompt": "q", "options": ["A", "B", "C", "D", "E"], "answerIndex": 1 }
          ]
        }
        """)

        #expect(ReadingTaskSet(raw, taskType: .dailyLife).questions[0].options.count == 4)
    }

    @Test("범위를 벗어난 정답 색인은 0으로 떨어뜨린다")
    func clampsOutOfRangeAnswerIndex() throws {
        // 그대로 두면 무엇을 고르든 항상 오답이 된다.
        let raw = try decode("""
        {
          "stimulus": "text",
          "questions": [
            { "prompt": "q", "options": ["A", "B"], "answerIndex": 7 }
          ]
        }
        """)

        #expect(ReadingTaskSet(raw, taskType: .dailyLife).questions[0].answerIndex == 0)
    }

    @Test("빠진 필드는 웹과 같은 기본값으로 채운다")
    func fillsMissingFields() throws {
        let raw = try decode("""
        {
          "stimulus": "text",
          "questions": [{ "prompt": "q", "options": ["A", "B"] }]
        }
        """)

        let set = ReadingTaskSet(raw, taskType: .academicPassage)
        #expect(set.title == "Read an Academic Passage")
        #expect(set.stimulusLabel == "Reading text")
        #expect(set.questions[0].id == 1)
        #expect(set.questions[0].skillTag == "general-reading")
        #expect(set.questions[0].explanationKo == "정답 근거를 다시 확인해보세요.")
    }

    @Test("학술 지문은 문항 수가 5개로 고정된다")
    func academicPassageFixesQuestionCount() {
        #expect(ReadingTaskType.academicPassage.questionCount(requested: 3) == 5)
        #expect(ReadingTaskType.dailyLife.questionCount(requested: 3) == 3)
    }
}

/// 웹 `buildToeflReadingReport`와 같은 값을 내야 한다.
@Suite("Reading 리포트")
struct ToeflReadingReportTests {
    private func question(
        id: Int,
        answerIndex: Int = 0,
        skill: String = "detail"
    ) -> ReadingQuestion {
        ReadingQuestion(
            RawReadingQuestion(
                id: id,
                prompt: "질문 \(id)",
                options: ["A", "B", "C", "D"],
                answerIndex: answerIndex,
                skillTag: skill,
                explanationKo: "해설 \(id)",
                saveableWords: nil
            ),
            index: id - 1
        )
    }

    private func answer(
        _ question: ReadingQuestion,
        selected: Int?
    ) -> ToeflReadingReport.Answer {
        ToeflReadingReport.Answer(
            questionID: question.id,
            selectedIndex: selected,
            answerIndex: question.answerIndex,
            correct: selected == question.answerIndex,
            skillTag: question.skillTag
        )
    }

    @Test("정답률과 문항별 리뷰를 만든다")
    func buildsReviews() {
        let questions = [question(id: 1), question(id: 2, answerIndex: 1)]
        let report = ToeflReadingReport.build(
            questions: questions,
            answers: [answer(questions[0], selected: 0), answer(questions[1], selected: 3)],
            difficulty: .intermediate
        )

        #expect(report.totalCount == 2)
        #expect(report.correctCount == 1)
        #expect(report.wrongCount == 1)
        #expect(report.accuracy == 50)

        #expect(report.questionReviews[0].correct)
        #expect(report.questionReviews[0].selectedAnswer == "A")
        #expect(report.questionReviews[1].selectedAnswer == "D")
        #expect(report.questionReviews[1].correctAnswer == "B")
        #expect(report.questionReviews[1].answerLabel == "B")
    }

    @Test("고르지 않은 문항은 '선택 없음'으로 남는다")
    func handlesUnanswered() {
        let questions = [question(id: 1)]
        let report = ToeflReadingReport.build(
            questions: questions,
            answers: [answer(questions[0], selected: nil)],
            difficulty: .beginner
        )

        #expect(!report.questionReviews[0].correct)
        #expect(report.questionReviews[0].selectedAnswer == "선택 없음")
        #expect(report.questionReviews[0].selectedLabel.isEmpty)
    }

    @Test("스킬별 묶음은 정답률이 낮은 순으로 나온다")
    func sortsBreakdownByWeakest() {
        let questions = [
            question(id: 1, skill: "detail"),
            question(id: 2, skill: "detail"),
            question(id: 3, skill: "inference"),
        ]
        let report = ToeflReadingReport.build(
            questions: questions,
            answers: [
                answer(questions[0], selected: 0),
                answer(questions[1], selected: 0),
                answer(questions[2], selected: 2),
            ],
            difficulty: .advanced
        )

        // detail 2/2 = 100%, inference 0/1 = 0% → 약한 쪽이 먼저다.
        #expect(report.skillBreakdown.map(\.label) == ["inference", "detail"])
        #expect(report.skillBreakdown[0].accuracy == 0)
        #expect(report.skillBreakdown[1].accuracy == 100)
    }

    @Test("다 맞히면 다른 조언이 나온다")
    func praisesPerfectRun() {
        let questions = [question(id: 1)]
        let report = ToeflReadingReport.build(
            questions: questions,
            answers: [answer(questions[0], selected: 0)],
            difficulty: .intermediate
        )

        #expect(report.wrongItems.isEmpty)
        #expect(report.feedback.headline.contains("안정적"))
        #expect(report.feedback.nextSteps.count == 2)
    }

    @Test("틀리면 약한 스킬을 짚어 준다")
    func pointsAtWeakestSkill() {
        let questions = [question(id: 1, skill: "inference")]
        let report = ToeflReadingReport.build(
            questions: questions,
            answers: [answer(questions[0], selected: 3)],
            difficulty: .intermediate
        )

        #expect(report.feedback.headline.contains("inference"))
        #expect(report.feedback.detail.contains("해설 1"))
    }
}

/// 프롬프트에 붙는 블록이 웹과 같아야 모델이 같은 형태를 낸다.
@Suite("TOEFL 프롬프트 블록")
struct ToeflPromptTests {
    @Test("단어장 블록에 품사와 뜻을 함께 넣는다")
    func includesPosAndMeaning() {
        let word = PreviewData.word(id: 1, "serendipity", "뜻밖의 행운", pos: "Noun")
        let block = ToeflPrompt.vocabularyBlock([word])

        #expect(block.contains("LEARNER VOCABULARY"))
        #expect(block.contains("- serendipity [Noun] (한글 뜻: 뜻밖의 행운)"))
    }

    @Test("단어가 없으면 블록을 아예 붙이지 않는다")
    func skipsEmptyBlock() {
        #expect(ToeflPrompt.vocabularyBlock([]).isEmpty)
        #expect(ToeflPrompt.topicsBlock([]).isEmpty)
    }

    @Test("난이도 문구가 웹 getToeflDifficultyPrompt와 같다")
    func matchesWebDifficultyPrompt() {
        #expect(ToeflDifficulty.beginner.promptLine.hasPrefix("Difficulty level: beginner."))
        #expect(ToeflDifficulty.intermediate.promptLine.contains("standard TOEFL-like contexts"))
        #expect(ToeflDifficulty.advanced.promptLine.contains("denser language and harder inference"))
    }
}

/// 실제 AI 응답이 끝까지 통과하는지 본다. 스키마가 바뀌면 여기서 먼저 깨진다.
@Suite("실제 Reading 응답 처리")
struct RealReadingResponseTests {
    @Test("실제 학술 지문 응답을 정규화한다")
    func normalizesRealResponse() throws {
        let data = Data(RealReadingResponseFixture.academicPassageJSON.utf8)
        let raw = try JSONCoding.decoder.decode(RawReadingTaskSet.self, from: data)
        let set = ReadingTaskSet(raw, taskType: .academicPassage)

        #expect(set.taskType == .academicPassage)
        #expect(set.questions.count == 5)
        #expect(!set.stimulus.isEmpty)
        #expect(set.questions.allSatisfy { $0.options.count == 4 })
        #expect(set.questions.allSatisfy { !$0.explanationKo.isEmpty })

        // 학술 지문은 blueprint 순서가 고정이다.
        #expect(set.questions.map(\.skillTag) == [
            "vocabulary-context", "detail", "inference", "rhetorical-purpose", "idea-relationship",
        ])
    }

    @Test("정답이 한 위치에 몰리지 않는다")
    func spreadsAnswerPositions() throws {
        // 프롬프트에 분산 규칙을 넣기 전에는 5문항 정답이 전부 같은 자리에 몰렸다.
        let data = Data(RealReadingResponseFixture.academicPassageJSON.utf8)
        let raw = try JSONCoding.decoder.decode(RawReadingTaskSet.self, from: data)
        let set = ReadingTaskSet(raw, taskType: .academicPassage)

        #expect(Set(set.questions.map(\.answerIndex)).count > 1)
    }
}
