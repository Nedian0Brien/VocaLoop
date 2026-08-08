import Foundation

/// 웹 `src/services/toefl/promptUtils.js`의 이식.
///
/// 프롬프트에 붙는 공통 블록들. 문구가 웹과 다르면 같은 모델이 다른 형태의
/// 결과를 내놓아 검증에 걸리므로 임의로 바꾸지 않는다.
enum ToeflPrompt {
    /// 같은 지문이 반복되지 않게 넣는 난수. 웹은 시각+난수를 36진수로 붙인다.
    static func randomNonce() -> String {
        let stamp = String(Int(Date().timeIntervalSince1970 * 1000), radix: 36)
        let random = String(UInt32.random(in: 0..<UInt32.max), radix: 36)
        return "\(stamp)-\(random)"
    }

    /// 내 단어장을 지문에 섞어 달라는 블록.
    ///
    /// 웹은 단어만 나열하지 않고 품사와 뜻까지 함께 준다. 그래야 모델이 뜻에 맞게
    /// 문맥을 만든다. 최대 40개까지만 보낸다.
    static func vocabularyBlock(_ words: [Word]) -> String {
        let lines = words
            .filter { !$0.word.trimmingCharacters(in: .whitespaces).isEmpty }
            .prefix(40)
            .map { word -> String in
                let pos = (word.pos?.isEmpty == false) ? " [\(word.pos!)]" : ""
                let meaning = word.primaryMeaning.isEmpty ? "" : " (한글 뜻: \(word.primaryMeaning))"
                return "- \(word.word)\(pos)\(meaning)"
            }

        guard !lines.isEmpty else { return "" }

        return """


        LEARNER VOCABULARY (use as many of these as possible — they are the priority for this practice set):
        \(lines.joined(separator: "\n"))

        """
    }

    /// 주제를 고정하는 블록. 지금은 앱에서 주제 선택 UI가 없어 비어 있다.
    static func topicsBlock(_ topics: [ToeflTopic]) -> String {
        let lines = topics
            .filter { !$0.label.trimmingCharacters(in: .whitespaces).isEmpty }
            .map { topic -> String in
                let description = topic.description.map { " — \($0)" } ?? ""
                return "- \(topic.label)\(description)"
            }

        guard !lines.isEmpty else { return "" }

        return """


        TOPIC FOCUS (write the passage so it clearly belongs to one or more of these academic fields):
        \(lines.joined(separator: "\n"))

        """
    }

    /// 0~5 같은 점수를 범위 안으로 자른다 (웹 `clampScore`).
    static func clampScore(_ score: Double, _ minimum: Double, _ maximum: Double) -> Double {
        guard score.isFinite else { return minimum }
        return max(minimum, min(maximum, score))
    }
}

/// 웹 `topicSets`의 주제 하나. 앱은 아직 주제 선택 UI가 없어 값만 정의해 둔다.
struct ToeflTopic: Identifiable, Hashable, Sendable {
    let id: String
    let label: String
    var description: String?
}
