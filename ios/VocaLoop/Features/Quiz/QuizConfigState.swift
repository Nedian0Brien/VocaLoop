import Foundation

/// 웹 `src/components/quizConfig/useQuizConfigState.js`의 이식.
///
/// 설정 모달이 들고 있는 값과 파생 계산을 모아 둔다. 시작 버튼이 넘기는
/// 결과(`QuizLaunch`)까지 여기서 만들어 화면은 그리기만 하게 했다.
@Observable
@MainActor
final class QuizConfigState {
    /// 웹의 `wordScope`.
    enum WordScope: Sendable {
        case all, flagged, folders
    }

    let mode: QuizModeInfo
    private let words: [Word]
    let folders: [Folder]

    var wordScope: WordScope = .all
    var selectedFolderIDs: [Int] = []
    var questionCount: Int
    var studySetSize: Int
    var mixedStages: [AdaptiveStage]
    var aiMode: Bool
    var soundEnabled: Bool
    var targetScore: ToeflDifficulty

    init(mode: QuizModeInfo, words: [Word], folders: [Folder]) {
        self.mode = mode
        self.words = words
        self.folders = folders

        // 웹은 모달을 열 때마다 저장값을 다시 읽는다.
        questionCount = QuizPreferences.questionCount
        studySetSize = QuizPreferences.studySetSize
        mixedStages = QuizPreferences.mixedStages
        aiMode = QuizPreferences.aiMode
        soundEnabled = QuizPreferences.soundEnabled
        targetScore = QuizPreferences.targetScore

        clampCounts()
    }

    // MARK: - 파생값

    var isMixed: Bool { mode.isMixed }
    var isToefl: Bool { mode.isToefl }

    /// 범위 필터를 타지 않는 전체 개수. "전체 단어" 버튼이 쓴다.
    var totalWordCount: Int { words.count }

    var flaggedCount: Int { words.count(where: \.isFlagged) }

    func wordCount(inFolder id: Int) -> Int {
        words.count { $0.folderIds.contains(id) }
    }

    var filteredWords: [Word] {
        switch wordScope {
        case .flagged:
            return words.filter(\.isFlagged)
        case .folders where !selectedFolderIDs.isEmpty:
            return words.filter { word in
                selectedFolderIDs.contains { word.folderIds.contains($0) }
            }
        case .all, .folders:
            return words
        }
    }

    /// 웹은 TOEFL만 10문항으로 묶고, 나머지는 범위 안 단어 수까지 허용한다.
    var maxQuestions: Int { isToefl ? 10 : max(1, filteredWords.count) }
    var maxStudySetSize: Int { max(1, filteredWords.count) }

    /// 복합 모드에서는 문항 수 대신 세트 크기를 고른다.
    var countValue: Int {
        isMixed ? min(studySetSize, maxStudySetSize) : questionCount
    }

    var countUpperBound: Int { isMixed ? maxStudySetSize : maxQuestions }
    var countTitle: String { isMixed ? "학습 세트 크기" : "문항 개수" }

    var countSubtitle: String {
        isMixed ? "한 번에 집중할 단어 묶음 크기를 정하세요" : "퀴즈당 출제될 문제 수를 정하세요"
    }

    var countBadge: String { isMixed ? "Words" : "Items" }
    var countMaxLabel: String { isMixed ? "Total Words" : "Max Questions" }
    var sliderLeadingLabel: String { isMixed ? "1 Word" : "1 Unit" }

    var sliderTrailingLabel: String {
        if isMixed { return "Set Size" }
        return isToefl ? "Limit 10" : "Adaptive Max"
    }

    var startDisabled: Bool {
        (!isToefl && filteredWords.isEmpty) || (isMixed && mixedStages.isEmpty)
    }

    /// 웹은 범위를 바꿀 때마다 상한을 넘은 값을 끌어내린다.
    func clampCounts() {
        if !isToefl, questionCount > maxQuestions {
            questionCount = min(10, maxQuestions)
        }
        if isMixed, studySetSize > maxStudySetSize {
            studySetSize = maxStudySetSize
        }
    }

    // MARK: - 조작

    func selectAllWords() {
        wordScope = .all
        selectedFolderIDs = []
        clampCounts()
    }

    func selectFlagged() {
        wordScope = .flagged
        selectedFolderIDs = []
        clampCounts()
    }

    func selectEveryFolder() {
        wordScope = .folders
        selectedFolderIDs = folders.map(\.id)
        clampCounts()
    }

    func toggleFolder(_ id: Int) {
        wordScope = .folders
        if let index = selectedFolderIDs.firstIndex(of: id) {
            selectedFolderIDs.remove(at: index)
        } else {
            selectedFolderIDs.append(id)
        }
        clampCounts()
    }

    func isFolderSelected(_ id: Int) -> Bool {
        wordScope == .folders && selectedFolderIDs.contains(id)
    }

    var isAllSelected: Bool { wordScope == .all && selectedFolderIDs.isEmpty }
    var isFlaggedSelected: Bool { wordScope == .flagged }

    /// 설정 화면이 카드 한 장으로 묶어 보여주는 주관식 두 방향.
    static let shortAnswerStages: [AdaptiveStage] = [.shortEnKo, .shortKoEn]

    var isShortAnswerSelected: Bool {
        mixedStages.contains { Self.shortAnswerStages.contains($0) }
    }

    /// 주관식 카드를 통째로 켜고 끈다.
    /// 켤 때는 사다리에서 먼저 오는 영→한부터 넣는다.
    func toggleShortAnswerGroup() {
        guard isShortAnswerSelected else {
            toggleStage(.shortEnKo)
            return
        }

        // 주관식만 남아 있으면 끄지 않는다. 다 끄면 풀 문제가 없어진다.
        let remaining = mixedStages.filter { !Self.shortAnswerStages.contains($0) }
        guard !remaining.isEmpty else { return }
        mixedStages = remaining
    }

    /// 마지막 한 단계는 끌 수 없다. 다 끄면 풀 문제가 없어진다.
    func toggleStage(_ stage: AdaptiveStage) {
        if mixedStages.contains(stage) {
            guard mixedStages.count > 1 else { return }
            mixedStages.removeAll { $0 == stage }
        } else {
            mixedStages = AdaptiveQuizEngine.normalize(mixedStages + [stage])
        }
    }

    func setCount(_ value: Int) {
        let clamped = max(1, min(value, countUpperBound))
        if isMixed {
            studySetSize = clamped
        } else {
            questionCount = clamped
        }
    }

    // MARK: - 시작

    /// 설정을 저장하고 실행에 필요한 값만 추려 돌려준다.
    func launch() -> QuizLaunch {
        QuizPreferences.questionCount = questionCount
        QuizPreferences.aiMode = aiMode
        QuizPreferences.soundEnabled = soundEnabled
        QuizPreferences.targetScore = targetScore
        if isMixed {
            QuizPreferences.mixedStages = mixedStages
            QuizPreferences.studySetSize = countValue
        }

        return QuizLaunch(
            mode: mode,
            words: filteredWords,
            questionCount: questionCount,
            stages: isMixed ? mixedStages : [],
            studySetSize: isMixed ? countValue : 0,
            difficulty: targetScore,
            soundEnabled: soundEnabled,
            aiMode: aiMode
        )
    }
}

/// 설정 모달이 학습 홈에 돌려주는 결과.
struct QuizLaunch: Identifiable, Sendable {
    let mode: QuizModeInfo
    let words: [Word]
    let questionCount: Int
    let stages: [AdaptiveStage]
    let studySetSize: Int
    let difficulty: ToeflDifficulty
    let soundEnabled: Bool
    let aiMode: Bool

    var id: String { mode.id }
}
