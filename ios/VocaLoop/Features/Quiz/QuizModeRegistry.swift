import Foundation

/// 웹 `src/components/quizModeRegistry.js`의 이식.
///
/// 학습 탭에 깔리는 모드 카드의 원본이다. id·제목·설명은 웹과 한 글자도
/// 다르면 안 된다. 두 화면을 보고 같은 앱이라고 느끼게 하는 건 이 문구들이다.
struct QuizModeInfo: Identifiable, Hashable, Sendable {
    /// 카드 강조색. 웹의 `color: 'blue' | 'purple'`에 대응한다.
    enum Accent: Sendable {
        case brand, accent
    }

    let id: String
    let title: String
    let detail: String
    let symbolName: String
    let accent: Accent
    var recommended: Bool = false
    /// 아직 앱에 퀴즈 화면이 없는 모드. 웹의 `disabled`와 같은 자리를 쓴다.
    var comingSoon: Bool = false

    var isToefl: Bool { id.hasPrefix("toefl") }
    var isMixed: Bool { id == "mixed" }
}

enum QuizModeRegistry {
    /// 웹 `VOCABULARY_MODES`.
    ///
    /// 앱에만 있던 단독 플래시카드 카드는 웹에 없어서 뺐다. 플래시카드는 웹과 같이
    /// 복합 퀴즈의 첫 단계로만 나온다.
    static let vocabulary: [QuizModeInfo] = [
        QuizModeInfo(
            id: "mixed",
            title: "AI 복합 퀴즈",
            detail: "객관식, 주관식, Complete word를 섞어 단어별 난이도를 단계적으로 올리고 오답은 다시 출제합니다.",
            symbolName: "brain.head.profile",
            accent: .brand,
            recommended: true
        ),
        QuizModeInfo(
            id: "multiple",
            title: "객관식 퀴즈",
            detail: "4가지 뜻 중 올바른 정답을 선택하세요. 가장 빠르고 효과적인 학습 방식입니다.",
            symbolName: "checkmark.circle",
            accent: .brand
        ),
        QuizModeInfo(
            id: "short",
            title: "주관식 퀴즈",
            detail: "단어의 철자와 뜻을 직접 입력하여 암기 수준을 완벽하게 검증합니다.",
            symbolName: "square.and.pencil",
            accent: .accent
        ),
    ]

    /// 웹 `TOEFL_READING_MODES`.
    static let toeflReading: [QuizModeInfo] = [
        QuizModeInfo(
            id: "toefl-reading-mock",
            title: "TOEFL Reading Mock Test",
            detail: "Stage 1 결과에 따라 Stage 2 난이도가 갈리는 실전형 Reading 모의고사입니다.",
            symbolName: "target",
            accent: .accent,
            recommended: true
        ),
        QuizModeInfo(
            id: "toefl-complete",
            title: "Complete the Words",
            detail: "2026 TOEFL Reading의 단어 완성 task에 맞춰 문맥 속 빠진 철자를 완성합니다.",
            symbolName: "sparkles",
            accent: .brand,
            recommended: true
        ),
        QuizModeInfo(
            id: "toefl-daily-life",
            title: "Read in Daily Life",
            detail: "이메일, 공지, 일정표 등 실생활 텍스트에서 목적과 세부 정보를 빠르게 파악합니다.",
            symbolName: "book",
            accent: .brand
        ),
        QuizModeInfo(
            id: "toefl-academic-passage",
            title: "Read an Academic Passage",
            detail: "학술 지문을 읽고 중심 생각, 추론, 어휘 맥락, 수사적 관계를 풉니다.",
            symbolName: "bolt.fill",
            accent: .accent
        ),
    ]

    /// 웹 `TOEFL_WRITING_MODES`.
    static let toeflWriting: [QuizModeInfo] = [
        QuizModeInfo(
            id: "toefl-writing-mock",
            title: "TOEFL Writing Mock Test",
            detail: "Build a Sentence 10문항, Email 1문항, Academic Discussion 1문항을 이어서 풉니다.",
            symbolName: "doc.text",
            accent: .accent,
            recommended: true
        ),
        QuizModeInfo(
            id: "toefl-build",
            title: "Build a Sentence",
            detail: "주어진 토큰을 TOEFL 수준의 문법과 논리 흐름에 맞게 배열해 완성 문장을 만듭니다.",
            symbolName: "square.and.pencil",
            accent: .accent
        ),
        QuizModeInfo(
            id: "toefl-writing-email",
            title: "Write an Email",
            detail: "상황과 요구사항을 반영해 공손하고 목적이 분명한 이메일을 작성합니다.",
            symbolName: "envelope",
            accent: .brand
        ),
        QuizModeInfo(
            id: "toefl-writing-discussion",
            title: "Write for an Academic Discussion",
            detail: "교수 질문과 학생 의견을 읽고 100단어 이상으로 학술 토론에 기여합니다.",
            symbolName: "text.quote",
            accent: .accent
        ),
    ]

    static let all: [QuizModeInfo] = vocabulary + toeflReading + toeflWriting

    static let byID: [String: QuizModeInfo] = Dictionary(
        uniqueKeysWithValues: all.map { ($0.id, $0) }
    )

    /// 제목으로 되찾기. 최근 활동 기록이 제목만 들고 있어서 필요하다.
    static func mode(titled title: String) -> QuizModeInfo? {
        all.first { $0.title == title }
    }
}
