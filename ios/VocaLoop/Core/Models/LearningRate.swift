import SwiftUI

/// 웹 `src/utils/learningRate.js`의 이식.
///
/// 중요: 학습 상태는 서버의 `status` 필드가 아니라 **학습률에서 파생**한다.
/// 웹이 그렇게 하고 있고, 두 클라이언트가 같은 단어를 다르게 분류하면 안 된다.
enum LearningStatus: String, CaseIterable, Sendable {
    /// 0 ~ 39
    case difficult
    /// 40 ~ 79
    case learning
    /// 80 ~ 100
    case memorized

    init(rate: Int) {
        switch rate {
        case 80...: self = .memorized
        case 40...: self = .learning
        default: self = .difficult
        }
    }

    var label: String {
        switch self {
        case .difficult: return "어려워요"
        case .learning: return "학습 중"
        case .memorized: return "외웠어요"
        }
    }

    /// 목록 그룹 머리의 타일 기호.
    ///
    /// 셋이 한 흐름으로 읽혀야 한다 — 아직 모름 → 오르는 중 → 끝.
    /// 탭바가 쓰는 기호(book.closed·brain·arrow.trianglehead.clockwise·gearshape)는
    /// 뜻이 겹치므로 피한다.
    var symbolName: String {
        switch self {
        case .difficult: return "questionmark"
        case .learning: return "arrow.up.right"
        case .memorized: return "checkmark"
        }
    }

    // 웹은 같은 상태를 두 곳에서 서로 다른 팔레트로 그린다. 헷갈리기 쉬우니 나눠 둔다.
    //  - 목록 그룹 헤더(`LEARNING_STATUS_CONFIG`): Tailwind raw red/blue/green
    //  - 상태 배지(`LearningStatusBadge`): 디자인 토큰 danger/brand/success
    // 초록만 값이 다르다 (green-600 #16A34A vs success-600 #059669).

    /// 목록 그룹 헤더의 점 — red/blue/green-500.
    var dotColor: Color {
        switch self {
        case .difficult: return Color(hex: 0xEF4444)
        case .learning: return Color(hex: 0x3B82F6)
        case .memorized: return Color(hex: 0x22C55E)
        }
    }

    /// 목록 그룹 헤더의 글자 — red/blue/green-600.
    var textColor: Color {
        switch self {
        case .difficult: return Color.adaptive(light: 0xDC2626, dark: 0xFCA5A5)
        case .learning: return Color.adaptive(light: 0x2563EB, dark: 0x93C5FD)
        case .memorized: return Color.adaptive(light: 0x16A34A, dark: 0x86EFAC)
        }
    }

    /// 상태 배지의 점 — danger/brand/success-500.
    var badgeDotColor: Color {
        switch self {
        case .difficult: return Color(hex: 0xEF4444)
        case .learning: return Color(hex: 0x3B82F6)
        case .memorized: return Color(hex: 0x10B981)
        }
    }

    /// 상태 배지의 글자 — danger/brand/success-600.
    var badgeTextColor: Color {
        switch self {
        case .difficult: return Color.adaptive(light: 0xDC2626, dark: 0xFCA5A5)
        case .learning: return Color.adaptive(light: 0x2563EB, dark: 0x93C5FD)
        case .memorized: return Color.adaptive(light: 0x059669, dark: 0xA7F3D0)
        }
    }

    /// 상태 배지의 배경 — danger/brand/success-50.
    var badgeBackgroundColor: Color {
        switch self {
        case .difficult: return Color.adaptive(light: 0xFEF2F2, dark: 0xEF4444, darkAlpha: 0.12)
        case .learning: return Color.adaptive(light: 0xEFF6FF, dark: 0x3B82F6, darkAlpha: 0.12)
        case .memorized: return Color.adaptive(light: 0xECFDF5, dark: 0x10B981, darkAlpha: 0.12)
        }
    }
}

enum LearningRate {
    /// 도넛 링 색. 구간 안에서 보간해 부드럽게 넘어간다.
    /// 0→39 빨강→파랑, 40→79 파랑→초록, 80+ 초록.
    static func color(for rate: Int) -> Color {
        let r = Double(max(0, min(100, rate)))

        if r < 40 {
            return interpolate(0xEF4444, 0x3B82F6, r / 39)
        }
        if r < 80 {
            return interpolate(0x3B82F6, 0x22C55E, (r - 40) / 39)
        }
        return Color(hex: 0x22C55E)
    }

    // MARK: - 학습률 변동
    //
    // 웹 `learningRate.js`의 상수를 그대로 쓴다. 값을 바꾸면 같은 계정의
    // 학습률이 웹에서 푸느냐 앱에서 푸느냐에 따라 달라진다.

    private static let baseCorrectGain = 12.0
    private static let firstWrongPenalty = -5.0
    private static let repeatedWrongPenalty = -10.0
    private static let maxWrongMultiplier = 3

    /// 퀴즈 유형별 보상 가중치. 웹 `QUIZ_TYPE_WEIGHT`와 값이 같아야 한다.
    static func weight(for stage: AdaptiveStage) -> Double {
        switch stage {
        case .flashcard: return 0.5      // 가벼운 확인
        case .multiple: return 1.0
        case .shortEnKo, .shortKoEn: return 1.4 // 40% 더 높은 보상
        case .completeWord: return 1.8   // 80% 더 높은 보상
        }
    }

    static func weight(for mode: QuizMode) -> Double { weight(for: mode.stage) }

    /// 정답 시 새 학습률.
    static func rateAfterCorrect(currentRate: Int, stage: AdaptiveStage) -> Int {
        clamp(Double(currentRate) + baseCorrectGain * weight(for: stage))
    }

    static func rateAfterCorrect(currentRate: Int, mode: QuizMode) -> Int {
        rateAfterCorrect(currentRate: currentRate, stage: mode.stage)
    }

    /// 오답 시 새 학습률. 반복해서 틀릴수록 더 크게 깎인다.
    static func rateAfterWrong(currentRate: Int, wrongCount: Int) -> Int {
        let penalty: Double = wrongCount == 0
            ? firstWrongPenalty
            : repeatedWrongPenalty * Double(min(wrongCount, maxWrongMultiplier))

        return clamp(Double(currentRate) + penalty)
    }

    private static func clamp(_ rate: Double) -> Int {
        max(0, min(100, Int(rate.rounded())))
    }

    /// 웹 `sortByLearningRate(words, 'asc')` — 학습률이 낮은 단어부터.
    ///
    /// 자바스크립트 `sort`는 안정 정렬이라 학습률이 같으면 원래 순서를 지킨다.
    /// Swift의 `sorted`는 그렇지 않아 색인을 함께 비교해 순서를 고정한다.
    static func sortedByRate(_ words: [Word]) -> [Word] {
        words.enumerated()
            .sorted {
                $0.element.learningRate == $1.element.learningRate
                    ? $0.offset < $1.offset
                    : $0.element.learningRate < $1.element.learningRate
            }
            .map(\.element)
    }

    static func interpolate(_ from: UInt32, _ to: UInt32, _ t: Double) -> Color {
        let t = max(0, min(1, t))
        let channel = { (shift: UInt32) -> CGFloat in
            let a = CGFloat((from >> shift) & 0xFF)
            let b = CGFloat((to >> shift) & 0xFF)
            return (a + (b - a) * t) / 255
        }

        // `Color(hex:)`와 같은 경로(UIColor)로 만들어야 두 색이 같은 값으로 비교된다.
        return Color(uiColor: UIColor(
            red: channel(16),
            green: channel(8),
            blue: channel(0),
            alpha: 1
        ))
    }
}

extension Word {
    /// 학습률에서 파생한 상태. 목록 그룹핑과 배지가 모두 이걸 쓴다.
    var learningStatus: LearningStatus {
        LearningStatus(rate: learningRate)
    }
}
