import Foundation
import Testing

@testable import VocaLoop

/// 웹 `src/services/adaptiveQuizService.test.js`와 같은 동작을 보장한다.
/// 큐 조작이 어긋나면 같은 계정이 웹과 앱에서 다른 순서로 문제를 받게 된다.
private func words(_ count: Int) -> [Word] {
    (1...count).map { PreviewData.word(id: $0, "word-\($0)", "뜻 \($0)") }
}

@Suite("복합 퀴즈 단계")
struct AdaptiveStageTests {
    @Test("단계 순서와 id가 웹과 같다")
    func matchesWebOrder() {
        #expect(AdaptiveStage.allCases.map(\.rawValue) == [
            "flashcard", "multiple", "short-en-ko", "short-ko-en", "complete-word",
        ])
    }

    @Test("고른 순서와 상관없이 웹의 단계 순서로 정렬한다")
    func normalizesToCanonicalOrder() {
        let normalized = AdaptiveQuizEngine.normalize([.completeWord, .flashcard, .multiple])
        #expect(normalized == [.flashcard, .multiple, .completeWord])
    }

    @Test("중복은 제거하고, 비면 전체 단계를 쓴다")
    func dedupesAndFallsBack() {
        #expect(AdaptiveQuizEngine.normalize([.multiple, .multiple]) == [.multiple])
        #expect(AdaptiveQuizEngine.normalize([]) == AdaptiveStage.allCases)
    }

    @Test("학습률 가중치가 웹 QUIZ_TYPE_WEIGHT와 같다")
    func matchesWebWeights() {
        #expect(LearningRate.weight(for: AdaptiveStage.flashcard) == 0.5)
        #expect(LearningRate.weight(for: AdaptiveStage.multiple) == 1.0)
        #expect(LearningRate.weight(for: AdaptiveStage.shortEnKo) == 1.4)
        #expect(LearningRate.weight(for: AdaptiveStage.shortKoEn) == 1.4)
        #expect(LearningRate.weight(for: AdaptiveStage.completeWord) == 1.8)

        // 12 × 1.8 = 21.6 → 22
        #expect(LearningRate.rateAfterCorrect(currentRate: 0, stage: .completeWord) == 22)
    }
}

@Suite("복합 퀴즈 큐")
struct AdaptiveQuizEngineTests {
    @Test("기본 단계는 플래시카드부터 시작한다")
    func startsAtFlashcard() {
        let state = AdaptiveQuizEngine.create(words: words(1))

        #expect(state.stages == AdaptiveStage.allCases)
        #expect(state.currentStage == .flashcard)
        #expect(state.currentTask?.stageIndex == 0)
        #expect(state.totalStages == 5)
    }

    @Test("단어마다 첫 단계 문제를 하나씩 만든다")
    func buildsOneTaskPerWord() {
        let state = AdaptiveQuizEngine.create(words: words(2), stages: [.multiple, .shortEnKo])

        #expect(state.queue.count == 2)
        #expect(state.queue.allSatisfy { $0.stageIndex == 0 && $0.wrongStreak == 0 })
        #expect(state.queue.map(\.word.id) == [1, 2])
    }

    @Test("정답이면 다음 단계로 올라가고 마지막 단계를 넘으면 끝난다")
    func advancesThroughStages() {
        var state = AdaptiveQuizEngine.create(
            words: words(1),
            stages: [.multiple, .shortEnKo, .shortKoEn, .completeWord]
        )

        state = AdaptiveQuizEngine.resolve(state, isCorrect: true)
        #expect(state.completedStages == 1)
        #expect(state.currentTask?.stageIndex == 1)
        #expect(state.currentStage == .shortEnKo)

        state = AdaptiveQuizEngine.resolve(state, isCorrect: true)
        #expect(state.completedStages == 2)
        #expect(state.currentStage == .shortKoEn)

        state = AdaptiveQuizEngine.resolve(state, isCorrect: true)
        #expect(state.completedStages == 3)
        #expect(state.currentStage == .completeWord)

        state = AdaptiveQuizEngine.resolve(state, isCorrect: true)
        #expect(state.completedStages == 4)
        #expect(state.queue.isEmpty)
        #expect(state.isComplete)
    }

    @Test("틀리면 재출제되고 연속 오답이면 한 단계 내려간다")
    func stepsDownAfterConsecutiveMisses() {
        var state = AdaptiveQuizEngine.create(
            words: words(1),
            stages: [.multiple, .shortEnKo, .completeWord]
        )
        state = AdaptiveQuizEngine.resolve(state, isCorrect: true)

        state = AdaptiveQuizEngine.resolve(state, isCorrect: false)
        #expect(state.currentTask?.stageIndex == 1)
        #expect(state.currentTask?.wrongStreak == 1)
        // 첫 오답만으로는 올려 뒀던 진행을 되돌리지 않는다.
        #expect(state.completedStages == 1)

        state = AdaptiveQuizEngine.resolve(state, isCorrect: false)
        #expect(state.currentTask?.stageIndex == 0)
        #expect(state.currentTask?.wrongStreak == 0)
        #expect(state.completedStages == 0)
    }

    @Test("틀린 문제는 다른 단어들 뒤로 밀어 둔다")
    func delaysMissedTaskBehindOthers() {
        let state = AdaptiveQuizEngine.create(
            words: words(4),
            stages: [.multiple, .shortEnKo],
            setSize: 4
        )

        let missed = AdaptiveQuizEngine.resolve(state, isCorrect: false)

        #expect(missed.queue.first?.word.id == 2)
        #expect(missed.queue.last?.word.id == 1)
        #expect(missed.queue.last?.stageIndex == 0)
        #expect(missed.queue.last?.wrongStreak == 1)
    }

    @Test("큐에 혼자 남았어도 같은 단어가 연달아 나오지 않게 자리를 고른다")
    func avoidsImmediateRepeatWhenQueueIsShort() {
        // 단어 하나짜리 세트에서 틀리면 붙일 자리가 그 자리뿐이라 그대로 남는다.
        var state = AdaptiveQuizEngine.create(words: words(1), stages: [.multiple, .shortEnKo])
        state = AdaptiveQuizEngine.resolve(state, isCorrect: false)

        #expect(state.queue.count == 1)
        #expect(state.queue.first?.word.id == 1)
    }

    @Test("진행도는 현재 세트의 단계 완료 수로 센다")
    func reportsProgressByStageCompletion() {
        var state = AdaptiveQuizEngine.create(words: words(2), stages: [.multiple, .shortEnKo])
        #expect(state.progress.total == 4)

        state = AdaptiveQuizEngine.resolve(state, isCorrect: true)
        #expect(state.progress.completed == 1)
        #expect(state.progress.current == 2)
    }

    @Test("세트 크기로 단어를 끊고 세트 안에서만 단계를 돈다")
    func splitsIntoStudySets() {
        var state = AdaptiveQuizEngine.create(
            words: words(6),
            stages: [.multiple, .shortEnKo, .completeWord],
            setSize: 5
        )

        #expect(state.totalSets == 2)
        #expect(state.currentSetIndex == 0)
        #expect(state.currentSetWords.count == 5)
        #expect(state.totalStages == 15)
        #expect(state.queue.count == 5)
        #expect(state.queue.allSatisfy { $0.stageIndex == 0 })

        var answered: Set<String> = []
        for _ in 0..<15 {
            if let task = state.currentTask, let stage = state.currentStage {
                answered.insert("\(task.word.id):\(stage.rawValue)")
            }
            state = AdaptiveQuizEngine.resolve(state, isCorrect: true)
        }

        #expect(state.isSetComplete)
        #expect(!state.isComplete)
        #expect(state.queue.isEmpty)
        // 5단어 × 3단계를 정확히 한 번씩 풀었다.
        #expect(answered.count == 15)
    }

    @Test("세트 경계에서 멈췄다가 요청하면 다음 세트를 시작한다")
    func pausesAtSetBoundary() {
        var state = AdaptiveQuizEngine.create(
            words: words(6),
            stages: [.multiple, .shortEnKo, .completeWord],
            setSize: 5
        )
        for _ in 0..<15 {
            state = AdaptiveQuizEngine.resolve(state, isCorrect: true)
        }

        let next = AdaptiveQuizEngine.startNextSet(state)
        #expect(next.currentSetIndex == 1)
        #expect(next.currentSetWords.count == 1)
        #expect(next.totalStages == 3)
        #expect(next.queue.count == 1)
        #expect(!next.isSetComplete)
        #expect(next.completedStages == 0)
    }

    @Test("마지막 세트를 끝내면 세트 휴식 없이 바로 종료다")
    func finishesAfterLastSet() {
        var state = AdaptiveQuizEngine.create(words: words(2), stages: [.multiple], setSize: 2)

        state = AdaptiveQuizEngine.resolve(state, isCorrect: true)
        state = AdaptiveQuizEngine.resolve(state, isCorrect: true)

        #expect(state.isComplete)
        #expect(!state.isSetComplete)
    }

    @Test("단어가 없으면 시작부터 끝난 상태다")
    func handlesEmptyWordList() {
        let state = AdaptiveQuizEngine.create(words: [])

        #expect(state.isComplete)
        #expect(state.queue.isEmpty)
        #expect(state.currentTask == nil)
    }
}

@Suite("복합 퀴즈 세션")
@MainActor
struct MixedQuizSessionTests {
    @Test("학습률이 낮은 단어부터 내보낸다")
    func ordersByLearningRate() {
        let pool = [
            PreviewData.word(id: 1, "high", "높음", learningRate: 90),
            PreviewData.word(id: 2, "low", "낮음", learningRate: 10),
            PreviewData.word(id: 3, "mid", "중간", learningRate: 50),
        ]
        let session = MixedQuizSession(words: pool, stages: [.multiple], setSize: 3)

        #expect(session.state.currentSetWords.map(\.id) == [2, 3, 1])
    }

    @Test("뜻이 없는 단어는 출제하지 않는다")
    func skipsWordsWithoutMeaning() {
        let pool = [
            PreviewData.word(id: 1, "ok", "뜻"),
            PreviewData.word(id: 2, "empty", ""),
        ]
        let session = MixedQuizSession(words: pool, stages: [.multiple], setSize: 5)

        #expect(session.state.currentSetWords.map(\.id) == [1])
    }

    @Test("정답/오답 누적과 정답률을 센다")
    func countsAnswers() {
        let session = MixedQuizSession(words: words(2), stages: [.multiple], setSize: 2)

        session.submit(isCorrect: true)
        session.submit(isCorrect: false)

        #expect(session.correctCount == 1)
        #expect(session.wrongCount == 1)
        #expect(session.answeredCount == 2)
        #expect(session.accuracy == 50)
    }

    @Test("세트를 끝내면 휴식 상태가 되고 마치기를 누르면 결과로 간다")
    func stopsAtSetBreak() {
        let session = MixedQuizSession(words: words(3), stages: [.multiple], setSize: 2)

        session.submit(isCorrect: true)
        session.submit(isCorrect: true)

        #expect(session.isAtSetBreak)
        #expect(!session.isFinished)

        session.finishNow()
        #expect(session.isFinished)
        #expect(!session.isAtSetBreak)
    }

    @Test("세트 요약은 학습률 변화를 되먹인 값으로 보여준다")
    func tracksRateDelta() {
        let pool = [PreviewData.word(id: 1, "word", "뜻", learningRate: 40)]
        let session = MixedQuizSession(words: pool, stages: [.multiple], setSize: 1)

        #expect(session.setProgress.first?.startRate == 40)
        #expect(session.setRateDelta == 0)

        session.updateRate(wordID: 1, rate: 52)
        #expect(session.setRateDelta == 12)
    }
}
