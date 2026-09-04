import Foundation

/// 웹 `src/services/dictionaryAutocompleteService.js`의 이식.
///
/// 웹은 `/dictionaries/en-ko-autocomplete.json`을 받아 브라우저에서 찾는다.
/// 앱은 같은 파일을 번들해 같은 규칙으로 찾는다. 서버를 타지 않으므로
/// 비행기 모드에서도 뜬다.
///
/// 사전 출처와 라이선스는 `Resources/Dictionaries/en-ko-autocomplete.notice.txt`.
actor DictionaryAutocomplete {
    /// 화면에 뿌릴 제안 한 줄.
    struct Suggestion: Identifiable, Hashable, Sendable {
        let word: String
        let meaningKo: String
        let pos: String?

        var id: String { word }
    }

    /// 찾기에 쓰는 형태. 정규화한 값을 미리 담아 매 입력마다 다시 만들지 않는다.
    struct Entry: Sendable {
        let word: String
        let meaningKo: String
        let pos: String?
        let normalized: String

        init(word: String, meaningKo: String, pos: String?) {
            self.word = word.trimmingCharacters(in: .whitespacesAndNewlines)
            self.meaningKo = meaningKo.trimmingCharacters(in: .whitespacesAndNewlines)
            let trimmedPos = pos?.trimmingCharacters(in: .whitespacesAndNewlines)
            self.pos = (trimmedPos?.isEmpty ?? true) ? nil : trimmedPos
            normalized = DictionaryAutocomplete.normalize(word)
        }
    }

    /// 웹과 같은 값. 두 글자부터 찾고 다섯 개까지 보여준다.
    static let minQueryLength = 2
    static let defaultLimit = 5

    static let shared = DictionaryAutocomplete()

    private var cached: [Entry]?

    nonisolated static func normalize(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    /// 찾기 규칙. 웹 `findDictionaryAutocompleteSuggestions`와 같다.
    ///
    /// 부분 일치를 모두 담되 앞에서부터 맞는 것을 먼저 놓고, 같은 자리면 사전순이다.
    /// 사전에 같은 단어가 두 번 있으면 앞의 것만 남긴다.
    nonisolated static func match(
        _ entries: [Entry],
        query: String,
        limit: Int = defaultLimit
    ) -> [Suggestion] {
        let needle = normalize(query)
        guard needle.count >= minQueryLength else { return [] }

        var seen = Set<String>()
        return entries
            .filter { entry in
                guard !entry.normalized.isEmpty, seen.insert(entry.normalized).inserted else {
                    return false
                }
                return entry.normalized.contains(needle)
            }
            .sorted { first, second in
                let firstIsPrefix = first.normalized.hasPrefix(needle)
                let secondIsPrefix = second.normalized.hasPrefix(needle)
                if firstIsPrefix != secondIsPrefix { return firstIsPrefix }
                return first.normalized < second.normalized
            }
            .prefix(limit)
            .map { Suggestion(word: $0.word, meaningKo: $0.meaningKo, pos: $0.pos) }
    }

    func suggestions(for query: String, limit: Int = defaultLimit) async -> [Suggestion] {
        guard Self.normalize(query).count >= Self.minQueryLength else { return [] }
        return Self.match(await entries(), query: query, limit: limit)
    }

    private func entries() async -> [Entry] {
        if let cached { return cached }

        let loaded = Self.loadBundled()
        cached = loaded
        return loaded
    }

    /// 번들이 없거나 깨져 있으면 조용히 빈 목록이다. 자동완성은 보조 기능이라
    /// 여기서 실패해도 단어 추가 자체는 그대로 되어야 한다.
    private static func loadBundled() -> [Entry] {
        guard let url = Bundle.main.url(
            forResource: "en-ko-autocomplete",
            withExtension: "json"
        ), let data = try? Data(contentsOf: url) else {
            return []
        }

        struct RawEntry: Decodable {
            let word: String?
            let meaningKo: String?
            let pos: String?
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        // 파일은 배열이지만 웹은 `{ entries: [...] }`도 받아 준다. 둘 다 받는다.
        struct Wrapper: Decodable {
            let entries: [RawEntry]
        }

        let raw: [RawEntry]
        if let list = try? decoder.decode([RawEntry].self, from: data) {
            raw = list
        } else if let wrapped = try? decoder.decode(Wrapper.self, from: data) {
            raw = wrapped.entries
        } else {
            return []
        }

        return raw.compactMap { item in
            guard let word = item.word, !word.isEmpty,
                  let meaning = item.meaningKo, !meaning.isEmpty else { return nil }
            return Entry(word: word, meaningKo: meaning, pos: item.pos)
        }
    }
}
