import Foundation

/// 웹 `src/services/adaptiveQuizService.js`의 이식.
///
/// 복합 퀴즈는 단어 하나를 여러 단계(플래시카드 → 객관식 → 주관식 → 단어 완성)로
/// 밀어 올리는 모드다. 정답이면 다음 단계로 올라가고, 틀리면 같은 문제가 뒤로
/// 재출제되며, 같은 단계에서 연속으로 틀리면 한 단계 쉬운 문제로 되돌아간다.
///
/// 큐 조작은 전부 순수 함수라 웹과 같은지 테스트로 못 박을 수 있다.

/// 복합 퀴즈의 단계. rawValue는 웹의 모드 id와 같아야 한다.
enum AdaptiveStage: String, CaseIterable, Identifiable, Sendable {
    case flashcard
    case multiple
    case shortEnKo = "short-en-ko"
    case shortKoEn = "short-ko-en"
    case completeWord = "complete-word"

    var id: String { rawValue }

    /// 웹 `MixedModeSection`의 문구.
    var title: String {
        switch self {
        case .flashcard: return "플래시카드"
        case .multiple: return "객관식"
        case .shortEnKo: return "주관식 영→한"
        case .shortKoEn: return "주관식 한→영"
        case .completeWord: return "Complete word"
        }
    }

    var detail: String {
        switch self {
        case .flashcard: return "단어와 뜻을 먼저 확인"
        case .multiple: return "뜻 선택으로 빠르게 확인"
        case .shortEnKo: return "영어 단어를 보고 한국어 뜻 입력"
        case .shortKoEn: return "한국어 뜻을 보고 영어 단어 입력"
        case .completeWord: return "힌트로 영어 철자 완성"
        }
    }

    var symbolName: String {
        switch self {
        case .flashcard: return "rectangle.on.rectangle"
        case .multiple: return "checkmark.circle"
        case .shortEnKo, .shortKoEn: return "keyboard"
        case .completeWord: return "sparkles"
        }
    }

    /// 퀴즈 카드 헤더에 찍히는 라벨.
    var cardLabel: String {
        switch self {
        case .flashcard: return "Flashcard"
        case .multiple: return "Multiple Choice"
        case .shortEnKo: return "Short Answer"
        case .shortKoEn: return "Short Answer"
        case .completeWord: return "Complete Word"
        }
    }
}

/// 큐에 들어 있는 한 문제. 어떤 단어를 몇 단계에서 풀지, 몇 번 연속으로 틀렸는지.
struct AdaptiveTask: Sendable {
    let word: Word
    var stageIndex: Int
    var wrongStreak: Int
}

/// 복합 퀴즈 한 판의 상태. 값 타입이라 `resolve`가 새 상태를 돌려주는 방식이다.
struct AdaptiveQuizState: Sendable {
    /// 이번 판에서 쓸 단계들. 순서가 곧 난이도 순서다.
    var stages: [AdaptiveStage]
    var setSize: Int
    /// 단어를 세트 크기로 잘라 둔 것. 세트 하나를 끝내면 쉬어 간다.
    var studySets: [[Word]]
    var currentSetIndex: Int
    var queue: [AdaptiveTask]
    /// 현재 세트의 전체 단계 수 (단어 수 × 단계 수). 세트마다 새로 잡는다.
    var totalStages: Int
    var completedStages: Int
    var isSetComplete: Bool
    var isComplete: Bool

    var totalSets: Int { studySets.count }

    var currentSetWords: [Word] {
        guard studySets.indices.contains(currentSetIndex) else { return [] }
        return studySets[currentSetIndex]
    }

    var currentTask: AdaptiveTask? { queue.first }

    var currentStage: AdaptiveStage? {
        guard let task = currentTask, !stages.isEmpty else { return nil }
        return stages[max(0, min(task.stageIndex, stages.count - 1))]
    }

    /// 웹 `getAdaptiveProgress` — 현재 세트 안에서의 진행.
    var progress: (current: Int, total: Int, completed: Int) {
        let completed = max(0, completedStages)
        let total = max(1, totalStages)
        return (min(completed + 1, total), total, completed)
    }
}

enum AdaptiveQuizEngine {
    static let defaultStages = AdaptiveStage.allCases
    static let defaultSetSize = 5

    /// 중복을 없애고 웹의 단계 순서로 정렬한다. 비면 전체 단계를 쓴다.
    static func normalize(_ stages: [AdaptiveStage]) -> [AdaptiveStage] {
        let selected = Set(stages)
        guard !selected.isEmpty else { return defaultStages }
        return defaultStages.filter(selected.contains)
    }

    static func create(
        words: [Word],
        stages: [AdaptiveStage] = defaultStages,
        setSize: Int = defaultSetSize
    ) -> AdaptiveQuizState {
        let stages = normalize(stages)
        let size = clampSetSize(setSize, wordCount: words.count)
        let studySets = chunk(words, size: size)

        let base = AdaptiveQuizState(
            stages: stages,
            setSize: size,
            studySets: studySets,
            currentSetIndex: 0,
            queue: [],
            totalStages: 0,
            completedStages: 0,
            isSetComplete: words.isEmpty,
            isComplete: words.isEmpty
        )

        return words.isEmpty ? base : buildSet(base, at: 0)
    }

    /// 답 하나를 반영해 다음 상태를 만든다.
    static func resolve(_ state: AdaptiveQuizState, isCorrect: Bool) -> AdaptiveQuizState {
        guard let current = state.currentTask else {
            var next = state
            next.queue = []
            next.isComplete = true
            return next
        }

        var next = state
        let stages = normalize(state.stages)
        next.stages = stages

        let remaining = Array(state.queue.dropFirst())
        let stageIndex = max(0, min(current.stageIndex, stages.count - 1))
        let completed = max(0, state.completedStages)

        if isCorrect {
            var queue = remaining
            let nextStageIndex = stageIndex + 1
            if nextStageIndex < stages.count {
                // 정답으로 올라간 문제는 남은 문제들 뒤에 붙인다.
                queue.append(AdaptiveTask(
                    word: current.word,
                    stageIndex: nextStageIndex,
                    wrongStreak: 0
                ))
            }

            let setDone = queue.isEmpty
            let allDone = setDone && state.currentSetIndex >= state.totalSets - 1

            next.queue = queue
            next.completedStages = completed + 1
            next.isSetComplete = setDone && !allDone
            next.isComplete = allDone
            return next
        }

        // 같은 단계에서 두 번 연속 틀리면 한 단계 내린다.
        let wrongStreak = current.wrongStreak + 1
        let shouldStepDown = wrongStreak >= 2 && stageIndex > 0
        let nextStageIndex = shouldStepDown ? stageIndex - 1 : stageIndex

        // 내려갈 때는 올려 뒀던 진행 한 칸을 되돌린다. 다만 같은 단어의 같은
        // 단계가 이미 큐에 남아 있으면 이중으로 깎이므로 되돌리지 않는다.
        let rollback = shouldStepDown && !remaining.contains(where: {
            $0.word.id == current.word.id && $0.stageIndex == stageIndex
        }) ? 1 : 0

        let task = AdaptiveTask(
            word: current.word,
            stageIndex: nextStageIndex,
            wrongStreak: shouldStepDown ? 0 : wrongStreak
        )

        var queue = remaining
        queue.insert(task, at: missedInsertionIndex(queue: remaining, task: task))

        next.queue = queue
        next.completedStages = max(0, completed - rollback)
        next.isSetComplete = false
        next.isComplete = false
        return next
    }

    /// 세트 휴식 화면에서 "다음 학습으로"를 눌렀을 때.
    static func startNextSet(_ state: AdaptiveQuizState) -> AdaptiveQuizState {
        guard state.isSetComplete else { return state }

        let nextIndex = state.currentSetIndex + 1
        guard nextIndex < state.totalSets else {
            var next = state
            next.isSetComplete = false
            next.isComplete = true
            next.queue = []
            return next
        }

        var base = state
        base.isSetComplete = false
        return buildSet(base, at: nextIndex)
    }

    // MARK: - 내부

    /// 세트 하나를 첫 단계 문제들로 채운다. 진행도는 세트마다 새로 잡는다.
    private static func buildSet(_ state: AdaptiveQuizState, at index: Int) -> AdaptiveQuizState {
        var next = state
        next.currentSetIndex = index

        let words = next.currentSetWords
        next.queue = words.map { AdaptiveTask(word: $0, stageIndex: 0, wrongStreak: 0) }
        next.totalStages = words.count * next.stages.count
        next.completedStages = 0
        next.isSetComplete = words.isEmpty
        next.isComplete = words.isEmpty && index >= next.totalSets - 1
        return next
    }

    private static func clampSetSize(_ size: Int, wordCount: Int) -> Int {
        max(1, min(size, max(1, wordCount)))
    }

    private static func chunk(_ words: [Word], size: Int) -> [[Word]] {
        guard size > 0 else { return words.isEmpty ? [] : [words] }
        return stride(from: 0, to: words.count, by: size).map {
            Array(words[$0..<min($0 + size, words.count)])
        }
    }

    /// 틀린 문제를 다시 넣을 자리.
    ///
    /// 웹은 무작위 배치 옵션도 갖고 있지만 앱에서 쓰는 경로(`randomize: false`)와
    /// 같게, 맨 뒤에 붙이되 같은 단어가 연달아 나오지 않는 자리를 고른다.
    private static func missedInsertionIndex(queue: [AdaptiveTask], task: AdaptiveTask) -> Int {
        guard !queue.isEmpty else { return 0 }
        return avoidImmediateRepeatIndex(queue: queue, proposed: queue.count, task: task)
    }

    /// 앞뒤가 같은 단어가 되지 않는 첫 자리. 없으면 맨 앞 다음 칸.
    private static func avoidImmediateRepeatIndex(
        queue: [AdaptiveTask],
        proposed: Int,
        task: AdaptiveTask
    ) -> Int {
        guard !queue.isEmpty else { return 0 }

        let bounded = max(0, min(proposed, queue.count))
        let candidates = Array(bounded...queue.count) + Array(0..<bounded)

        let found = candidates.first { index in
            index > 0
                && queue[index - 1].word.id != task.word.id
                && (index >= queue.count || queue[index].word.id != task.word.id)
        }

        return found ?? min(1, queue.count)
    }
}
