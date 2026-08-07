import Foundation

/// 단어와 폴더 목록의 소유자.
///
/// 화면이 여러 개(목록·상세·퀴즈)라서 각자 로드하면 상태가 어긋난다.
/// 서버가 진실의 원본이고, 이 스토어가 그 사본을 하나만 들고 있는다.
@Observable
@MainActor
final class VocabularyStore {
    private(set) var words: [Word] = []
    private(set) var folders: [Folder] = []
    private(set) var isLoading = false
    var errorMessage: String?

    /// 목록 화면의 현재 필터. 뷰가 직접 바꾼다.
    var selection: FolderSelection = .all {
        didSet { recomputeVisibleWords() }
    }
    var searchText: String = "" {
        didSet { recomputeVisibleWords() }
    }

    /// 파생값을 저장 프로퍼티로 캐시한다. computed로 두면 `words` 전체에
    /// 의존성이 걸려 무관한 변경에도 목록이 다시 그려진다.
    private(set) var visibleWords: [Word] = []

    private let api: APIClient

    init(api: APIClient) {
        self.api = api
    }

    // MARK: - Loading

    func loadIfNeeded() async {
        guard words.isEmpty, folders.isEmpty, !isLoading else { return }
        await reload()
    }

    func reload() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // 단어와 폴더는 서로 독립이라 동시에 받는다.
            async let words = api.send(Endpoint(path: "/api/words"), as: [Word].self)
            async let folders = api.send(Endpoint(path: "/api/folders"), as: [Folder].self)

            self.words = try await words
            self.folders = try await folders.sorted { $0.order < $1.order }
            errorMessage = nil
            recomputeVisibleWords()
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    // MARK: - Mutations

    func toggleFlag(_ word: Word) async {
        await patch(word, body: ["is_flagged": !word.isFlagged])
    }

    func updateStatus(_ word: Word, to status: Word.LearningStatus) async {
        await patch(word, body: ["status": status.rawValue])
    }

    func delete(_ word: Word) async {
        // 낙관적 제거. 실패하면 되돌린다.
        let snapshot = words
        words.removeAll { $0.id == word.id }
        recomputeVisibleWords()

        do {
            try await api.send(Endpoint(path: "/api/words/\(word.id)", method: .delete))
        } catch {
            words = snapshot
            recomputeVisibleWords()
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// 퀴즈 결과를 반영한다. 오답 수와 학습률은 서버가 진실의 원본이므로
    /// 응답으로 받은 단어로 통째로 교체한다.
    func recordQuizResult(for word: Word, wasCorrect: Bool) async {
        var stats = word.stats
        stats.reviewCount += 1
        if !wasCorrect { stats.wrongCount += 1 }

        let nextRate = max(0, min(100, word.learningRate + (wasCorrect ? 10 : -5)))
        let nextStatus: Word.LearningStatus = nextRate >= 100 ? .mastered : .learning

        await patch(word, body: [
            "stats": ["wrong_count": stats.wrongCount, "review_count": stats.reviewCount],
            "learning_rate": nextRate,
            "status": nextStatus.rawValue,
        ])
    }

    private func patch(_ word: Word, body: [String: Any]) async {
        do {
            let data = try JSONSerialization.data(withJSONObject: body)
            let updated = try await api.send(
                Endpoint(path: "/api/words/\(word.id)", method: .patch, body: data),
                as: Word.self
            )
            replace(updated)
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    func insert(_ word: Word) {
        words.insert(word, at: 0)
        recomputeVisibleWords()
    }

    private func replace(_ word: Word) {
        guard let index = words.firstIndex(where: { $0.id == word.id }) else { return }
        words[index] = word
        recomputeVisibleWords()
    }

    // MARK: - Derived state

    private func recomputeVisibleWords() {
        var result = words

        switch selection {
        case .all:
            break
        case .flagged:
            result = result.filter(\.isFlagged)
        case let .folder(id):
            result = result.filter { $0.folderIds.contains(id) }
        }

        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !query.isEmpty {
            result = result.filter {
                $0.word.localizedCaseInsensitiveContains(query)
                    || $0.primaryMeaning.localizedCaseInsensitiveContains(query)
            }
        }

        visibleWords = result
    }

    func folder(withID id: Folder.ID) -> Folder? {
        folders.first { $0.id == id }
    }

    func count(for selection: FolderSelection) -> Int {
        switch selection {
        case .all: return words.count
        case .flagged: return words.count(where: \.isFlagged)
        case let .folder(id): return words.count { $0.folderIds.contains(id) }
        }
    }
}
