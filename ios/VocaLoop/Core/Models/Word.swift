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
    var status: LearningStatus
    var stats: WordStats
    var createdAt: Date
    var updatedAt: Date

    /// 서버가 새 상태값을 추가해도 디코딩이 깨지지 않도록 알 수 없는 값은 `.new`로 떨어뜨린다.
    enum LearningStatus: String, Codable, CaseIterable, Sendable {
        case new
        case learning
        case mastered

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = LearningStatus(rawValue: raw) ?? .new
        }

        var label: String {
            switch self {
            case .new: return "새 단어"
            case .learning: return "학습 중"
            case .mastered: return "완료"
            }
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
