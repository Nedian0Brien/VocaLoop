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

    func updateStatus(_ word: Word, to status: Word.ServerStatus) async {
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

    /// 퀴즈 결과를 반영한다.
    ///
    /// 학습률 계산은 웹 `quizAnswerFlow.js`와 같은 공식을 쓴다.
    /// 웹은 `status` 필드를 건드리지 않으므로 여기서도 보내지 않는다.
    /// 화면에 보이는 상태는 학습률에서 파생되기 때문에 그것만으로 충분하다.
    func recordQuizResult(for word: Word, wasCorrect: Bool, stage: AdaptiveStage) async {
        var stats = word.stats
        stats.reviewCount += 1

        let nextRate: Int
        if wasCorrect {
            nextRate = LearningRate.rateAfterCorrect(currentRate: word.learningRate, stage: stage)
        } else {
            nextRate = LearningRate.rateAfterWrong(
                currentRate: word.learningRate,
                wrongCount: stats.wrongCount
            )
            stats.wrongCount += 1
        }

        await patch(word, body: [
            "stats": ["wrong_count": stats.wrongCount, "review_count": stats.reviewCount],
            "learning_rate": nextRate,
        ])
    }

    /// AI 재검토로 인정된 답을 단어에 저장한다 (웹 `buildAcceptedAnswerPatch`).
    ///
    /// 영→한이면 뜻 목록에도 덧붙인다. 그래야 다음부터는 AI 없이 로컬 채점만으로도
    /// 같은 답이 정답으로 인정된다.
    func saveAcceptedAnswer(
        for word: Word,
        answer: String,
        direction: ShortAnswerDirection,
        feedback: String?
    ) async {
        let trimmed = answer.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let mode = AcceptedAnswer.mode(for: direction)
        let existingAnswers = word.acceptedAnswers ?? []
        let alreadySaved = existingAnswers.contains {
            $0.mode == mode && $0.answer.caseInsensitiveCompare(trimmed) == .orderedSame
        }

        let nextMeaning = meaningAdding(trimmed, to: word, direction: direction)
        let shouldUpdateMeaning = nextMeaning != (word.meaningKo ?? "")

        guard !alreadySaved || shouldUpdateMeaning else { return }

        var body: [String: Any] = [:]
        if shouldUpdateMeaning {
            body["meaning_ko"] = nextMeaning
        }
        if !alreadySaved {
            let existing = existingAnswers.map {
                [
                    "mode": $0.mode,
                    "answer": $0.answer,
                    "source": $0.source,
                    "feedback": $0.feedback as Any,
                ] as [String: Any]
            }
            body["accepted_answers"] = existing + [[
                "mode": mode,
                "answer": trimmed,
                "source": "ai-review",
                "feedback": feedback as Any,
            ] as [String: Any]]
        }

        await patch(word, body: body)
    }

    /// 영→한에서만 뜻 목록에 덧붙인다. 한→영은 정답이 영어 단어라 뜻을 건드리면 안 된다.
    private func meaningAdding(
        _ answer: String,
        to word: Word,
        direction: ShortAnswerDirection
    ) -> String {
        let current = word.meaningKo ?? ""
        guard direction == .enToKo else { return current }

        let items = current
            .split(whereSeparator: { $0 == "," || $0 == "，" })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        guard !items.contains(where: { $0.caseInsensitiveCompare(answer) == .orderedSame }) else {
            return current.isEmpty ? answer : current
        }
        return (items + [answer]).joined(separator: ", ")
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

    // MARK: - 폴더

    private struct FolderPayload: Encodable {
        var name: String?
        var color: String?
        var icon: String?
    }

    private struct ReorderPayload: Encodable {
        var folderIds: [Int]
    }

    @discardableResult
    func createFolder(name: String, color: FolderColor, icon: FolderIcon?) async -> Folder? {
        do {
            let endpoint = try Endpoint.json(
                "/api/folders",
                method: .post,
                body: FolderPayload(name: name, color: color.rawValue, icon: icon?.rawValue)
            )
            let created = try await api.send(endpoint, as: Folder.self)
            folders.append(created)
            folders.sort { $0.order < $1.order }
            return created
        } catch {
            report(error)
            return nil
        }
    }

    func updateFolder(_ folder: Folder, name: String, color: FolderColor, icon: FolderIcon?) async {
        do {
            let endpoint = try Endpoint.json(
                "/api/folders/\(folder.id)",
                method: .patch,
                body: FolderPayload(name: name, color: color.rawValue, icon: icon?.rawValue)
            )
            let updated = try await api.send(endpoint, as: Folder.self)
            if let index = folders.firstIndex(where: { $0.id == updated.id }) {
                folders[index] = updated
            }
        } catch {
            report(error)
        }
    }

    /// `deleteWords`가 참이면 폴더 안의 단어까지 함께 지운다 (웹과 같은 선택지).
    func deleteFolder(_ folder: Folder, deleteWords: Bool) async {
        let folderSnapshot = folders
        let wordSnapshot = words

        // 낙관적 반영. 실패하면 되돌린다.
        folders.removeAll { $0.id == folder.id }
        if deleteWords {
            words.removeAll { $0.folderIds.contains(folder.id) }
        } else {
            for index in words.indices {
                words[index].folderIds.removeAll { $0 == folder.id }
            }
        }
        if selection == .folder(folder.id) { selection = .all }
        recomputeVisibleWords()

        do {
            try await api.send(Endpoint(
                path: "/api/folders/\(folder.id)",
                method: .delete,
                queryItems: deleteWords ? [URLQueryItem(name: "delete_words", value: "true")] : []
            ))
        } catch {
            folders = folderSnapshot
            words = wordSnapshot
            recomputeVisibleWords()
            report(error)
        }
    }

    func reorderFolders(_ ordered: [Folder]) async {
        let snapshot = folders
        folders = ordered

        do {
            let endpoint = try Endpoint.json(
                "/api/folders/reorder",
                method: .post,
                body: ReorderPayload(folderIds: ordered.map(\.id))
            )
            folders = try await api.send(endpoint, as: [Folder].self).sorted { $0.order < $1.order }
        } catch {
            folders = snapshot
            report(error)
        }
    }

    /// 단어를 폴더로 옮긴다. 웹은 단어당 폴더 하나를 쓰므로 통째로 교체한다.
    func moveWord(_ word: Word, to folderID: Folder.ID?) async {
        await patch(word, body: ["folder_ids": folderID.map { [$0] } ?? []])
    }

    private func report(_ error: Error) {
        errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
    }

    #if DEBUG
    /// 디자인 확인용. 서버 호출 없이 목록을 채운다.
    func loadPreviewData(_ words: [Word], folders: [Folder] = []) {
        self.words = words
        self.folders = folders
        recomputeVisibleWords()
    }
    #endif

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
