import Foundation

/// 웹 `src/services/bulkWordAddService.js`의 이식.
///
/// 규칙을 그대로 옮겼다. 이미 단어장에 있는 단어는 새로 만들지 않는다 —
/// 폴더를 골랐으면 그 폴더에 얹고(assigned), 이미 그 폴더에 있거나 폴더를
/// 고르지 않았으면 건너뛴다(skipped). 새 단어만 AI로 분석해 만든다(created).
@MainActor
struct BulkWordAddService {
    /// 화면에 보여줄 진행 상황.
    struct Progress: Equatable, Sendable {
        enum Phase: Equatable, Sendable {
            case analyzing, saving, done
        }

        var phase: Phase
        var completed: Int
        var total: Int
        var currentWord: String?
    }

    /// 한 번의 대량 추가 결과.
    struct Summary: Equatable, Sendable {
        var created: [String] = []
        var assigned: [String] = []
        var skipped: [String] = []
        var failed: [String] = []

        var isEmpty: Bool {
            created.isEmpty && assigned.isEmpty && skipped.isEmpty && failed.isEmpty
        }

        /// "3개 저장, 1개 폴더 추가, 2개 중복 스킵" 같은 한 줄 요약.
        var message: String {
            var parts: [String] = []
            if !created.isEmpty { parts.append("\(created.count)개 저장") }
            if !assigned.isEmpty { parts.append("\(assigned.count)개 폴더 추가") }
            if !skipped.isEmpty { parts.append("\(skipped.count)개 중복 건너뜀") }
            if !failed.isEmpty { parts.append("\(failed.count)개 실패") }
            return parts.isEmpty ? "저장할 새 단어가 없습니다." : parts.joined(separator: " · ")
        }
    }

    /// 웹과 같이 한 번에 분석할 단어 수. 프롬프트가 너무 길어지면 모델이 일부를 흘린다.
    static let chunkSize = 5

    let api: APIClient
    let store: VocabularyStore

    /// 입력을 줄바꿈·쉼표·세미콜론으로 끊는다. 웹 `splitWordInput`과 같은 규칙이다.
    nonisolated static func split(_ input: String) -> [String] {
        input
            .components(separatedBy: CharacterSet(charactersIn: "\n,;"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    /// 대소문자를 무시한 비교 키. 웹 `getVocabularyWordKey`와 같은 자리를 쓴다.
    nonisolated static func key(_ word: String) -> String {
        word.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    /// 중복을 없애고 순서를 지킨다.
    nonisolated static func uniqued(_ words: [String]) -> [String] {
        var seen = Set<String>()
        return words.filter { seen.insert(key($0)).inserted }
    }

    func run(
        words rawWords: [String],
        folderID: Folder.ID?,
        onProgress: @escaping (Progress) -> Void
    ) async -> Summary {
        let words = Self.uniqued(rawWords)
        var summary = Summary()
        guard !words.isEmpty else { return summary }

        let existing = Dictionary(
            store.words.map { (Self.key($0.word), $0) },
            uniquingKeysWith: { first, _ in first }
        )

        func report(_ phase: Progress.Phase, _ current: String?) {
            onProgress(
                Progress(
                    phase: phase,
                    completed: summary.created.count + summary.assigned.count + summary.skipped.count,
                    total: words.count,
                    currentWord: current
                )
            )
        }

        // 1) 이미 있는 단어는 폴더만 손본다.
        var toCreate: [String] = []
        for word in words {
            guard let match = existing[Self.key(word)] else {
                toCreate.append(word)
                continue
            }

            report(.saving, word)

            guard let folderID, !match.folderIds.contains(folderID) else {
                summary.skipped.append(word)
                continue
            }

            await store.addFolder(folderID, to: match)
            summary.assigned.append(word)
        }

        // 2) 새 단어는 묶어서 분석하고 하나씩 만든다.
        let analyzer = WordAnalysisService(api: api)
        for chunk in stride(from: 0, to: toCreate.count, by: Self.chunkSize).map({
            Array(toCreate[$0..<min($0 + Self.chunkSize, toCreate.count)])
        }) {
            report(.analyzing, chunk.first)

            let analyses = await analyze(chunk, with: analyzer)

            for word in chunk {
                report(.saving, word)

                let analysis = analyses.first { Self.key($0.word) == Self.key(word) }
                if await store.createWord(word, analysis: analysis, folderID: folderID) {
                    summary.created.append(word)
                } else {
                    summary.failed.append(word)
                }
            }
        }

        report(.done, nil)
        return summary
    }

    /// 묶음 분석이 실패하면 웹과 같이 한 단어씩 다시 시도한다.
    private func analyze(
        _ chunk: [String],
        with analyzer: WordAnalysisService
    ) async -> [WordAnalysis] {
        do {
            return try await analyzer.analyzeBatch(chunk)
        } catch {
            var results: [WordAnalysis] = []
            for word in chunk {
                if let single = try? await analyzer.analyze(word) {
                    results.append(single)
                }
            }
            return results
        }
    }
}
