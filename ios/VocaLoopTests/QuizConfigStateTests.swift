import Foundation
import Testing

@testable import VocaLoop

/// 웹 `useQuizConfigState.js`와 같은 파생값을 내야 한다.
/// 여기가 어긋나면 같은 설정으로 시작해도 앱과 웹이 다른 범위를 출제한다.
@Suite("퀴즈 설정 상태")
@MainActor
struct QuizConfigStateTests {
    private func folder(_ id: Int, _ name: String) -> Folder {
        Folder(
            id: id,
            name: name,
            color: nil,
            icon: nil,
            order: id,
            createdAt: Date(timeIntervalSince1970: 0),
            updatedAt: Date(timeIntervalSince1970: 0)
        )
    }

    private func sample() -> (words: [Word], folders: [Folder]) {
        var words: [Word] = []
        for index in 1...6 {
            var word = PreviewData.word(id: index, "word\(index)", "뜻 \(index)")
            word.folderIds = index <= 4 ? [1] : [2]
            word.isFlagged = index % 3 == 0
            words.append(word)
        }
        return (words, [folder(1, "기본"), folder(2, "TOEFL")])
    }

    private func state(_ modeID: String) -> QuizConfigState {
        let data = sample()
        return QuizConfigState(
            mode: QuizModeRegistry.byID[modeID]!,
            words: data.words,
            folders: data.folders
        )
    }

    @Test("기본 범위는 전체 단어다")
    func defaultsToAllWords() {
        let config = state("multiple")
        #expect(config.isAllSelected)
        #expect(config.filteredWords.count == 6)
        #expect(config.totalWordCount == 6)
    }

    @Test("플래그 범위는 플래그한 단어만 남긴다")
    func filtersFlagged() {
        let config = state("multiple")
        config.selectFlagged()

        #expect(config.isFlaggedSelected)
        #expect(config.flaggedCount == 2)
        #expect(config.filteredWords.count == 2)
    }

    @Test("폴더를 고르면 그 폴더 단어만 남는다")
    func filtersByFolder() {
        let config = state("multiple")
        config.toggleFolder(2)

        #expect(config.isFolderSelected(2))
        #expect(config.filteredWords.count == 2)
        #expect(config.wordCount(inFolder: 1) == 4)

        // 두 폴더를 다 켜면 합집합이다.
        config.toggleFolder(1)
        #expect(config.filteredWords.count == 6)
    }

    @Test("폴더를 다시 누르면 해제되고 전체로 돌아간다")
    func togglesFolderOff() {
        let config = state("multiple")
        config.toggleFolder(2)
        config.toggleFolder(2)

        #expect(config.selectedFolderIDs.isEmpty)
        #expect(config.filteredWords.count == 6)
    }

    @Test("문항 수는 범위 안 단어 수를 넘지 않는다")
    func clampsQuestionCountToScope() {
        let config = state("multiple")
        config.questionCount = 10
        #expect(config.maxQuestions == 6)

        // 범위를 좁히면 상한도 같이 내려간다.
        config.selectFlagged()
        #expect(config.maxQuestions == 2)
        #expect(config.questionCount == 2)
    }

    @Test("TOEFL은 문항 수 상한이 10으로 고정된다")
    func toeflCapsAtTen() {
        let config = state("toefl-complete")
        #expect(config.isToefl)
        #expect(config.maxQuestions == 10)
        #expect(config.countTitle == "문항 개수")
    }

    @Test("복합 모드는 문항 수 대신 세트 크기를 고른다")
    func mixedUsesStudySetSize() {
        let config = state("mixed")

        #expect(config.isMixed)
        #expect(config.countTitle == "학습 세트 크기")
        #expect(config.countBadge == "Words")
        #expect(config.countMaxLabel == "Total Words")

        config.setCount(4)
        #expect(config.countValue == 4)
        #expect(config.studySetSize == 4)

        // 상한은 범위 안 단어 수다.
        config.setCount(99)
        #expect(config.countValue == 6)
    }

    @Test("복합 단계는 웹 순서로 정렬되고 마지막 하나는 못 끈다")
    func keepsAtLeastOneStage() {
        let config = state("mixed")
        config.mixedStages = [.multiple]

        config.toggleStage(.multiple)
        #expect(config.mixedStages == [.multiple], "마지막 단계는 꺼지지 않아야 한다")

        config.toggleStage(.flashcard)
        #expect(config.mixedStages == [.flashcard, .multiple], "웹 단계 순서로 정렬된다")
    }

    @Test("풀 단어가 없으면 시작할 수 없다")
    func disablesStartWithoutWords() {
        let config = QuizConfigState(
            mode: QuizModeRegistry.byID["multiple"]!,
            words: [],
            folders: []
        )
        #expect(config.startDisabled)
    }

    @Test("TOEFL은 단어장이 비어 있어도 시작할 수 있다")
    func toeflStartsWithoutWords() {
        let config = QuizConfigState(
            mode: QuizModeRegistry.byID["toefl-complete"]!,
            words: [],
            folders: []
        )
        #expect(!config.startDisabled)
    }

    @Test("시작하면 고른 범위와 설정이 그대로 넘어간다")
    func launchCarriesConfiguration() {
        let config = state("mixed")
        config.toggleFolder(2)
        config.setCount(2)
        config.soundEnabled = false

        let launch = config.launch()

        #expect(launch.mode.id == "mixed")
        #expect(launch.words.count == 2)
        #expect(launch.studySetSize == 2)
        #expect(!launch.soundEnabled)
        #expect(launch.stages == config.mixedStages)
    }
}

/// 학습 탭 카드 목록이 웹과 같아야 한다.
@Suite("퀴즈 모드 목록")
struct QuizModeRegistryTests {
    @Test("섹션별 모드 id가 웹과 같다")
    func matchesWebModes() {
        #expect(QuizModeRegistry.vocabulary.map(\.id) == ["mixed", "multiple", "short"])
        #expect(QuizModeRegistry.toeflReading.map(\.id) == [
            "toefl-reading-mock", "toefl-complete", "toefl-daily-life", "toefl-academic-passage",
        ])
        #expect(QuizModeRegistry.toeflWriting.map(\.id) == [
            "toefl-writing-mock", "toefl-build", "toefl-writing-email", "toefl-writing-discussion",
        ])
    }

    @Test("추천 배지가 붙는 모드가 웹과 같다")
    func matchesRecommended() {
        let recommended = QuizModeRegistry.all.filter(\.recommended).map(\.id)
        #expect(recommended == ["mixed", "toefl-reading-mock", "toefl-complete", "toefl-writing-mock"])
    }

    @Test("퀴즈 화면이 있는 모드만 열린다")
    func onlyImplementedModesOpen() {
        let playable = QuizModeRegistry.all.filter { !$0.comingSoon }.map(\.id)
        #expect(playable == ["mixed", "multiple", "short", "toefl-complete", "toefl-build"])
    }

    @Test("제목으로 모드를 되찾을 수 있다 (최근 활동 재실행)")
    func findsModeByTitle() {
        #expect(QuizModeRegistry.mode(titled: "객관식 퀴즈")?.id == "multiple")
        #expect(QuizModeRegistry.mode(titled: "없는 모드") == nil)
    }
}
