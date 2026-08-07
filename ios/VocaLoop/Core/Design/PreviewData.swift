#if DEBUG
import Foundation

/// 프리뷰 전용 목 데이터.
///
/// 로그인 없이 단어장·퀴즈 화면을 Xcode 캔버스에서 확인하려면 필요하다.
/// `#if DEBUG`라 릴리스 빌드에는 포함되지 않는다.
enum PreviewData {
    static func word(
        id: Int,
        _ text: String,
        _ meaning: String,
        pronunciation: String? = nil,
        pos: String? = nil,
        status: Word.LearningStatus = .new,
        learningRate: Int = 0,
        isFlagged: Bool = false,
        definitions: [String] = [],
        definitionsKo: [String] = [],
        examples: [WordExample] = [],
        synonyms: [String] = [],
        nuance: String? = nil,
        stats: WordStats = WordStats()
    ) -> Word {
        Word(
            id: id,
            word: text,
            meaningKo: meaning,
            pronunciation: pronunciation,
            pronunciationAudioUrl: nil,
            pos: pos,
            definitions: definitions,
            definitionsKo: definitionsKo,
            examples: examples,
            synonyms: synonyms,
            nuance: nuance,
            isFlagged: isFlagged,
            folderIds: [],
            learningRate: learningRate,
            status: status,
            stats: stats,
            createdAt: .distantPast,
            updatedAt: .distantPast
        )
    }

    static let serendipity = word(
        id: 1,
        "Serendipity",
        "뜻밖의 행운",
        pronunciation: "/ˌserənˈdipədē/",
        pos: "Noun",
        status: .learning,
        learningRate: 60,
        isFlagged: true,
        definitions: ["The occurrence of events by chance in a happy or beneficial way."],
        definitionsKo: ["우연히 일어난 일이 좋은 결과로 이어지는 것."],
        examples: [
            WordExample(
                en: "Finding this restaurant was pure serendipity.",
                ko: "이 식당을 발견한 것은 정말 뜻밖의 행운이었다."
            )
        ],
        synonyms: ["chance", "fluke", "luck"],
        nuance: "계획하지 않았는데 좋은 결과를 얻었을 때 씁니다.",
        stats: WordStats(wrongCount: 2, reviewCount: 8)
    )

    static let words: [Word] = [
        serendipity,
        word(id: 2, "Ephemeral", "덧없는", pos: "Adjective", status: .new, learningRate: 10),
        word(
            id: 3,
            "Eloquent",
            "웅변의, 유창한",
            pos: "Adjective",
            status: .mastered,
            learningRate: 100
        ),
        word(id: 4, "Resilience", "회복력", pos: "Noun", status: .learning, learningRate: 45),
        word(
            id: 5,
            "Ubiquitous",
            "어디에나 있는",
            pos: "Adjective",
            status: .new,
            learningRate: 5,
            isFlagged: true
        ),
    ]
}
#endif
