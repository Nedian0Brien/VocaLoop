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
        status: Word.ServerStatus = .new,
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

    static let folders: [Folder] = [
        Folder(id: 1, name: "TOEFL", color: "purple", icon: "trophy", order: 0, createdAt: .distantPast, updatedAt: .distantPast),
        Folder(id: 2, name: "수능 필수", color: "green", icon: "book", order: 1, createdAt: .distantPast, updatedAt: .distantPast),
    ]

    static let words: [Word] = [
        serendipity,
        word(
            id: 2,
            "Ephemeral",
            "덧없는",
            pronunciation: "/əˈfem(ə)rəl/",
            pos: "Adjective",
            learningRate: 10,
            definitions: ["Lasting for a very short time."],
            definitionsKo: ["아주 짧은 시간만 지속되는."],
            examples: [WordExample(en: "Fashions are ephemeral.", ko: "유행은 덧없다.")],
            synonyms: ["transient", "fleeting"]
        ),
        word(
            id: 3,
            "Eloquent",
            "웅변의, 유창한",
            pronunciation: "/ˈeləkwənt/",
            pos: "Adjective",
            status: .mastered,
            learningRate: 100,
            definitions: ["Fluent or persuasive in speaking or writing."],
            definitionsKo: ["말이나 글이 유창하고 설득력 있는."],
            examples: [WordExample(en: "She gave an eloquent speech.", ko: "그는 유창한 연설을 했다.")],
            synonyms: ["articulate", "expressive"]
        ),
        word(
            id: 4,
            "Resilience",
            "회복력",
            pronunciation: "/rɪˈzɪlyəns/",
            pos: "Noun",
            status: .learning,
            learningRate: 45,
            definitions: ["The capacity to recover quickly from difficulties."],
            definitionsKo: ["어려움에서 빠르게 회복하는 능력."],
            examples: [WordExample(en: "Her resilience impressed everyone.", ko: "그의 회복력은 모두를 놀라게 했다.")],
            synonyms: ["toughness", "flexibility"],
            nuance: "사람의 정신력이나 물체의 탄성 모두에 씁니다."
        ),
        word(
            id: 5,
            "Ubiquitous",
            "어디에나 있는",
            pronunciation: "/yo͞oˈbikwədəs/",
            pos: "Adjective",
            learningRate: 5,
            isFlagged: true,
            definitions: ["Present, appearing, or found everywhere."],
            definitionsKo: ["어디에서나 보이거나 발견되는."],
            examples: [WordExample(en: "Smartphones are ubiquitous.", ko: "스마트폰은 어디에나 있다.")],
            synonyms: ["omnipresent", "pervasive"]
        ),
    ]
}
#endif
