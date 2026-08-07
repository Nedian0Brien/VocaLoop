import Foundation

/// 단어 하나. `backend/app/schemas/words.py`의 `WordRead`와 대응한다.
struct Word: Identifiable, Codable, Hashable, Sendable {
    let id: Int
    var word: String
    var meaningKo: String?
    var pronunciation: String?
    var pronunciationAudioUrl: String?
    var pos: String?
    var definitions: [String]
    var definitionsKo: [String]
    var examples: [WordExample]
    var synonyms: [String]
    var nuance: String?
    var isFlagged: Bool
    var folderIds: [Int]
    var learningRate: Int
    var status: ServerStatus
    var stats: WordStats
    var createdAt: Date
    var updatedAt: Date

    /// 서버의 `status` 필드를 그대로 담는다.
    ///
    /// 화면에 보여주는 학습 상태(어려워요/학습 중/외웠어요)는 이 값이 아니라
    /// `learningRate`에서 파생한다 (`LearningRate.swift`의 `LearningStatus`).
    /// 웹이 그렇게 하고 있어서, 이걸로 분류하면 두 클라이언트가 어긋난다.
    enum ServerStatus: String, Codable, CaseIterable, Sendable {
        case new
        case learning
        case mastered

        /// 서버가 새 값을 추가해도 디코딩이 깨지지 않게 알 수 없는 값은 `.new`로 떨어뜨린다.
        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = ServerStatus(rawValue: raw) ?? .new
        }
    }
}

struct WordExample: Codable, Hashable, Sendable {
    var en: String
    var ko: String
}

struct WordStats: Codable, Hashable, Sendable {
    var wrongCount: Int
    var reviewCount: Int

    init(wrongCount: Int = 0, reviewCount: Int = 0) {
        self.wrongCount = wrongCount
        self.reviewCount = reviewCount
    }
}

// MARK: - 표시용 파생값

extension Word {
    /// 카드 부제목에 쓸 한 줄 요약. 한국어 뜻이 없으면 영어 정의로 대체한다.
    var primaryMeaning: String {
        if let meaningKo, !meaningKo.isEmpty { return meaningKo }
        if let first = definitionsKo.first, !first.isEmpty { return first }
        return definitions.first ?? ""
    }

    var hasPronunciation: Bool {
        !(pronunciation ?? "").isEmpty
    }
}
