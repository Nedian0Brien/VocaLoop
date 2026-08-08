import Foundation
import Testing

@testable import VocaLoop

/// 웹 `toeflReadingStats.js`와 같은 집계 규칙이어야, 두 클라이언트가 같은
/// "가장 약한 갈래"를 가리킨다.
@Suite("TOEFL Reading 통계", .serialized)
@MainActor
struct ToeflReadingStatsTests {
    init() { ToeflReadingStats.clear() }

    private func result(_ correct: Bool, _ skill: String) -> ToeflReadingStats.Result {
        ToeflReadingStats.Result(isCorrect: correct, skillTag: skill)
    }

    @Test("스킬은 문항별로, 주제는 판 성적을 태그마다 더한다")
    func splitsBySkillAndTopic() {
        ToeflReadingStats.record(
            taskType: "daily-life",
            topicTags: ["campus", "health"],
            results: [result(true, "detail"), result(false, "inference")]
        )

        let snapshot = ToeflReadingStats.read()
        #expect(snapshot.totals == .init(correct: 1, total: 2))
        #expect(snapshot.byTask["daily-life"] == .init(correct: 1, total: 2))
        #expect(snapshot.bySkill["detail"] == .init(correct: 1, total: 1))
        #expect(snapshot.bySkill["inference"] == .init(correct: 0, total: 1))
        // 주제는 판 전체 성적이 각 태그에 그대로 들어간다.
        #expect(snapshot.byTopic["campus"] == .init(correct: 1, total: 2))
        #expect(snapshot.byTopic["health"] == .init(correct: 1, total: 2))
    }

    @Test("주제 태그가 없으면 general로 모은다")
    func fallsBackToGeneralTopic() {
        ToeflReadingStats.record(
            taskType: "academic-passage",
            topicTags: [],
            results: [result(true, "main-idea")]
        )

        #expect(ToeflReadingStats.read().byTopic["general"] == .init(correct: 1, total: 1))
    }

    @Test("여러 판을 누적한다")
    func accumulatesAcrossAttempts() {
        ToeflReadingStats.record(taskType: "daily-life", topicTags: ["campus"], results: [result(true, "detail")])
        ToeflReadingStats.record(taskType: "daily-life", topicTags: ["campus"], results: [result(false, "detail")])

        #expect(ToeflReadingStats.read().byTask["daily-life"] == .init(correct: 1, total: 2))
    }

    @Test("빈 결과나 빈 taskType은 무시한다")
    func ignoresEmptyInput() {
        ToeflReadingStats.record(taskType: "daily-life", topicTags: [], results: [])
        ToeflReadingStats.record(taskType: "", topicTags: [], results: [result(true, "detail")])

        #expect(ToeflReadingStats.read().totals.total == 0)
    }

    @Test("가장 약한 갈래는 정답률이 낮은 쪽, 같으면 많이 푼 쪽")
    func picksWeakest() {
        ToeflReadingStats.record(
            taskType: "daily-life",
            topicTags: ["campus"],
            results: [result(true, "detail"), result(true, "detail")]
        )
        ToeflReadingStats.record(
            taskType: "academic-passage",
            topicTags: ["biology"],
            results: [result(false, "inference"), result(true, "inference")]
        )

        let summary = ToeflReadingStats.summarize()
        #expect(summary.total == 4)
        #expect(summary.correct == 3)
        #expect(summary.accuracy == 75)
        #expect(summary.weakestTask?.id == "academic-passage")
        #expect(summary.weakestTopic?.id == "biology")
        #expect(summary.weakestSkill?.id == "inference")
        #expect(summary.nextTaskID == "academic-passage")
    }

    @Test("기록이 없으면 daily-life를 권한다")
    func defaultsToDailyLife() {
        let summary = ToeflReadingStats.summarize()
        #expect(!summary.hasData)
        #expect(summary.nextTaskID == "daily-life")
    }

    @Test("task 이름은 웹 라벨과 같다")
    func labelsMatchWeb() {
        #expect(ToeflReadingStats.label(forTask: "daily-life") == "Read in Daily Life")
        #expect(ToeflReadingStats.label(forTask: "academic-passage") == "Read an Academic Passage")
        #expect(ToeflReadingStats.label(forTask: "complete-words") == "Complete the Words")
        // 모의고사처럼 라벨이 없는 값은 그대로 보여준다.
        #expect(ToeflReadingStats.label(forTask: "mock-test") == "mock-test")
    }
}
