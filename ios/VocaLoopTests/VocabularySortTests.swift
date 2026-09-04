import Foundation
import Testing

@testable import VocaLoop

/// 웹 `VocabularyDashboard`의 `filteredWords`와 같은 순서를 내야 한다.
/// 여기가 어긋나면 같은 단어장을 열어도 앱과 웹이 다른 차례로 보여 준다.
@Suite("단어 목록 정렬")
@MainActor
struct VocabularySortTests {
    /// 학습률 순서와 등록일 순서가 서로 다르도록 섞어 둔 표본.
    /// bravo와 delta는 학습률이 같아 동점 처리까지 함께 본다.
    private func sample() -> [Word] {
        let rows: [(id: Int, text: String, rate: Int, created: TimeInterval)] = [
            (1, "alpha", 90, 100),
            (2, "bravo", 20, 300),
            (3, "charlie", 55, 200),
            (4, "delta", 20, 400),
        ]
        return rows.map { row in
            var word = PreviewData.word(id: row.id, row.text, "뜻 \(row.id)", learningRate: row.rate)
            word.createdAt = Date(timeIntervalSince1970: row.created)
            return word
        }
    }

    private func store(_ mode: WordSortMode) -> VocabularyStore {
        let store = VocabularyStore(api: APIClient(sessionStore: SessionStore()))
        store.sortMode = mode
        store.loadPreviewData(sample())
        return store
    }

    @Test("최신순은 등록일 내림차순이다")
    func sortsByNewest() {
        let store = store(.newest)
        #expect(store.visibleWords.map(\.word) == ["delta", "bravo", "charlie", "alpha"])
    }

    @Test("학습률 낮은 순은 오름차순, 동점이면 최근에 넣은 단어가 앞이다")
    func sortsByLearningRateAscending() {
        let store = store(.learningRateAscending)
        #expect(store.visibleWords.map(\.word) == ["delta", "bravo", "charlie", "alpha"])
        #expect(store.visibleWords.map(\.learningRate) == [20, 20, 55, 90])
    }

    @Test("학습률 높은 순은 내림차순이다")
    func sortsByLearningRateDescending() {
        let store = store(.learningRateDescending)
        #expect(store.visibleWords.map(\.learningRate) == [90, 55, 20, 20])
        #expect(store.visibleWords.map(\.word) == ["alpha", "charlie", "delta", "bravo"])
    }

    @Test("상태별 그룹은 웹처럼 학습률 오름차순으로 늘어놓는다")
    func sortsStatusGroupByLearningRate() {
        let store = store(.statusGroup)
        #expect(store.visibleWords.map(\.learningRate) == [20, 20, 55, 90])
        // 뷰가 이 순서를 상태로 나눠 묶는다 (어려워요 → 학습 중 → 외웠어요).
        #expect(store.visibleWords.map(\.learningStatus) == [.difficult, .difficult, .learning, .memorized])
    }

    @Test("정렬을 바꾸면 다시 불러오지 않아도 순서가 바뀐다")
    func resortsWithoutReloading() {
        let store = store(.newest)
        store.sortMode = .learningRateDescending

        #expect(store.visibleWords.map(\.word) == ["alpha", "charlie", "delta", "bravo"])
    }

    @Test("검색으로 걸러낸 목록에도 정렬이 적용된다")
    func sortsFilteredWords() {
        let store = store(.learningRateDescending)
        store.searchText = "l"

        // bravo만 철자에 l이 없다. 뜻("뜻 N")에도 없다.
        #expect(store.visibleWords.map(\.word) == ["alpha", "charlie", "delta"])
    }
}

/// 웹 `bulkWordAddService.js`와 같은 입력 규칙을 지켜야 한다.
/// 여기가 어긋나면 같은 목록을 붙여 넣어도 앱과 웹이 다른 단어를 만든다.
@Suite("여러 단어 추가 입력")
struct BulkWordAddInputTests {
    @Test("줄바꿈·쉼표·세미콜론으로 끊는다")
    func splitsOnSeparators() {
        let input = "abate, candid\nlucid; terse"
        #expect(BulkWordAddService.split(input) == ["abate", "candid", "lucid", "terse"])
    }

    @Test("빈 조각과 앞뒤 공백은 버린다")
    func dropsBlanks() {
        #expect(BulkWordAddService.split("  abate ,, \n\n candid  ") == ["abate", "candid"])
        #expect(BulkWordAddService.split("   ").isEmpty)
    }

    @Test("중복은 대소문자를 무시하고 첫 번째만 남긴다")
    func uniquesIgnoringCase() {
        #expect(BulkWordAddService.uniqued(["Abate", "abate", "ABATE", "candid"]) == ["Abate", "candid"])
    }

    @Test("비교 키는 소문자에 앞뒤 공백을 턴 값이다")
    func normalizesKey() {
        #expect(BulkWordAddService.key("  Abate ") == "abate")
    }

    @Test("결과 요약은 처리한 갈래만 적는다")
    func summarizesOnlyWhatHappened() {
        var summary = BulkWordAddService.Summary()
        #expect(summary.message == "저장할 새 단어가 없습니다.")

        summary.created = ["abate", "candid"]
        summary.skipped = ["lucid"]
        #expect(summary.message == "2개 저장 · 1개 중복 건너뜀")

        summary.assigned = ["terse"]
        summary.failed = ["opaque"]
        #expect(summary.message == "2개 저장 · 1개 폴더 추가 · 1개 중복 건너뜀 · 1개 실패")
    }
}

/// 웹 `dictionaryAutocompleteService.js`와 같은 순서로 제안해야 한다.
@Suite("사전 자동완성")
struct DictionaryAutocompleteTests {
    private func entries() -> [DictionaryAutocomplete.Entry] {
        [
            .init(word: "candid", meaningKo: "솔직한", pos: "adjective"),
            .init(word: "candidate", meaningKo: "후보자", pos: "noun"),
            .init(word: "incandescent", meaningKo: "백열의", pos: "adjective"),
            .init(word: "Candid", meaningKo: "중복 항목", pos: nil),
            .init(word: "abate", meaningKo: "줄다", pos: "verb"),
        ]
    }

    @Test("앞에서부터 맞는 것을 먼저, 같은 자리면 사전순")
    func ordersPrefixMatchesFirst() {
        let found = DictionaryAutocomplete.match(entries(), query: "cand")
        #expect(found.map(\.word) == ["candid", "candidate", "incandescent"])
    }

    @Test("가운데만 맞아도 찾는다")
    func matchesSubstring() {
        let found = DictionaryAutocomplete.match(entries(), query: "candes")
        #expect(found.map(\.word) == ["incandescent"])
    }

    @Test("같은 단어는 대소문자를 무시하고 한 번만 나온다")
    func dropsDuplicates() {
        let found = DictionaryAutocomplete.match(entries(), query: "candid")
        #expect(found.map(\.word) == ["candid", "candidate"])
    }

    @Test("두 글자보다 짧으면 찾지 않는다")
    func requiresTwoCharacters() {
        #expect(DictionaryAutocomplete.match(entries(), query: "c").isEmpty)
        #expect(DictionaryAutocomplete.match(entries(), query: " ").isEmpty)
        #expect(!DictionaryAutocomplete.match(entries(), query: "ca").isEmpty)
    }

    @Test("개수 상한을 지킨다")
    func respectsLimit() {
        #expect(DictionaryAutocomplete.match(entries(), query: "a", limit: 2).isEmpty)
        #expect(DictionaryAutocomplete.match(entries(), query: "an", limit: 2).count <= 2)
    }

    @Test("품사가 비면 nil로 둔다")
    func normalizesEmptyPos() {
        let entry = DictionaryAutocomplete.Entry(word: "  candid ", meaningKo: " 솔직한 ", pos: "  ")
        #expect(entry.word == "candid")
        #expect(entry.meaningKo == "솔직한")
        #expect(entry.pos == nil)
        #expect(entry.normalized == "candid")
    }
}
