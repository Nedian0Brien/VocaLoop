import Foundation

/// 복합 퀴즈 한 판의 상태를 소유한다.
///
/// 큐 조작은 전부 `AdaptiveQuizEngine`(순수 함수)에 있고, 여기서는 화면이 필요한
/// 것들 — 누적 정답/오답, 객관식 보기, 세트별 학습률 변화 — 만 얹는다.
@Observable
@MainActor
final class MixedQuizSession {
    /// 세트 휴식 화면에 보여줄 단어별 학습률 변화.
    struct WordProgress: Identifiable, Sendable {
        let id: Int
        let word: String
        let meaning: String
        let startRate: Int
        var latestRate: Int

        var delta: Int { latestRate - startRate }
    }

    private(set) var state: AdaptiveQuizState
    private(set) var correctCount = 0
    private(set) var wrongCount = 0
    /// 세트 휴식에서 "여기서 마치기"를 누른 경우.
    private(set) var stoppedEarly = false
    /// 객관식 단계의 보기. 다시 그릴 때 순서가 흔들리지 않게 세트 시작 시 한 번만 만든다.
    private(set) var choices: [Int: [String]] = [:]
    /// 현재 세트 단어들의 학습률 변화. 세트가 바뀌면 새로 잡는다.
    private(set) var setProgress: [WordProgress] = []

    /// 오답 보기 후보. 전체 단어에서 뽑아야 보기가 빈약해지지 않는다.
    private let pool: [Word]

    /// 설정에서 AI 모드를 켰는지.
    let aiMode: Bool

    init(words: [Word], stages: [AdaptiveStage], setSize: Int, aiMode: Bool = false) {
        self.aiMode = aiMode
        let usable = words.filter { !$0.primaryMeaning.isEmpty }
        // 웹 `startQuiz`와 같이 학습률이 낮은 단어부터 내보낸다.
        let ordered = LearningRate.sortedByRate(usable)

        pool = usable
        state = AdaptiveQuizEngine.create(words: ordered, stages: stages, setSize: setSize)
        beginSet()
    }

    // MARK: - 진행 상태

    var currentTask: AdaptiveTask? { state.currentTask }
    var currentStage: AdaptiveStage? { state.currentStage }
    var currentWord: Word? { state.currentTask?.word }

    var currentChoices: [String] {
        guard let word = currentWord else { return [] }
        return choices[word.id] ?? []
    }

    var progress: (current: Int, total: Int, completed: Int) { state.progress }

    /// 세트 사이 휴식 화면을 띄워야 하는지.
    var isAtSetBreak: Bool { state.isSetComplete && !stoppedEarly }

    var isFinished: Bool { state.isComplete || stoppedEarly }

    var answeredCount: Int { correctCount + wrongCount }

    var accuracy: Int {
        guard answeredCount > 0 else { return 0 }
        return Int((Double(correctCount) / Double(answeredCount) * 100).rounded())
    }

    var setNumber: Int { state.currentSetIndex + 1 }
    var totalSets: Int { state.totalSets }

    /// 세트 전체의 학습률 증감 합.
    var setRateDelta: Int { setProgress.reduce(0) { $0 + $1.delta } }

    // MARK: - 조작

    func submit(isCorrect: Bool) {
        guard !isFinished, state.currentTask != nil else { return }

        if isCorrect {
            correctCount += 1
        } else {
            wrongCount += 1
        }

        state = AdaptiveQuizEngine.resolve(state, isCorrect: isCorrect)
    }

    func startNextSet() {
        state = AdaptiveQuizEngine.startNextSet(state)
        beginSet()
    }

    func finishNow() {
        stoppedEarly = true
    }

    /// 서버에 반영된 학습률을 세트 요약에 되먹인다.
    func updateRate(wordID: Int, rate: Int) {
        guard let index = setProgress.firstIndex(where: { $0.id == wordID }) else { return }
        setProgress[index].latestRate = rate
    }

    // MARK: - 내부

    /// 새 세트가 시작될 때 보기와 학습률 스냅샷을 다시 잡는다.
    private func beginSet() {
        let words = state.currentSetWords
        choices = QuizChoiceBuilder.build(for: words, pool: pool)
        setProgress = words.map {
            WordProgress(
                id: $0.id,
                word: $0.word,
                meaning: $0.primaryMeaning,
                startRate: $0.learningRate,
                latestRate: $0.learningRate
            )
        }
    }
}

extension MixedQuizSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
