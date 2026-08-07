import SwiftUI
import UIKit

/// VocaLoop 디자인 토큰 — "Modern Bold Editorial".
///
/// 값은 웹의 `src/design-system/tokens.js`와 `src/index.css`(@theme + 다크 오버라이드)에서
/// 그대로 가져왔다. 웹과 앱의 색이 어긋나면 두 파일을 함께 고쳐야 한다.
///
/// 웹 다크 테마는 색을 세 갈래로 다르게 다룬다. 이 구분을 그대로 옮기지 않으면
/// 다크 모드에서 CTA가 하늘색으로 뜨거나 soft 패널이 새까맣게 죽는다.
///  1. **텍스트 계열** — 반전한다 (brand-600 → 밝은 파랑).
///  2. **솔리드 배경·그라디언트** — 원래 딥 브랜드를 유지한다 (VocaLoop 파랑을 지키려고).
///  3. **soft 틴트 패널** — 브랜드색 12~20% 알파로 깐다.
enum DS {}

// MARK: - Color

extension Color {
    /// 라이트/다크에서 서로 다른 값을 쓰는 적응형 색.
    ///
    /// 알파를 테마별로 다르게 줄 수 있어야 한다. 웹은 라이트에서 이미 옅은 색을
    /// 불투명하게 쓰고, 다크에서는 원색을 낮은 알파로 깐다.
    static func adaptive(
        light: UInt32,
        lightAlpha: CGFloat = 1,
        dark: UInt32,
        darkAlpha: CGFloat = 1
    ) -> Color {
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: dark, alpha: darkAlpha)
                : UIColor(hex: light, alpha: lightAlpha)
        })
    }

    init(hex: UInt32) {
        self.init(uiColor: UIColor(hex: hex))
    }
}

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}

extension DS {
    /// 배경·보더·텍스트의 기본 팔레트 (슬레이트).
    /// 다크에서는 `index.css`의 다크 오버라이드 값을 쓴다 (tokens.js의 darkPalette가 아니라
    /// 실제로 웹에 적용되는 쪽이다).
    enum Surface {
        /// 카드 면. 라이트는 흰색, 다크는 배경보다 들린 색.
        static let level0 = Color.adaptive(light: 0xFFFFFF, dark: 0x1A2236)
        /// 화면 배경.
        static let level50 = Color.adaptive(light: 0xF8FAFC, dark: 0x0A1020)
        /// 카드 안쪽 한 단 들어간 띠.
        static let level100 = Color.adaptive(light: 0xF1F5F9, dark: 0x1F2942)
        /// 구분선·보더.
        static let level200 = Color.adaptive(light: 0xE2E8F0, dark: 0x2F3D5C)
        static let level300 = Color.adaptive(light: 0xCBD5E1, dark: 0x475569)
        static let level400 = Color.adaptive(light: 0x94A3B8, dark: 0x64748B)
        /// 보조 텍스트.
        static let level500 = Color.adaptive(light: 0x64748B, dark: 0x94A3B8)
        static let level600 = Color.adaptive(light: 0x475569, dark: 0xCBD5E1)
        static let level700 = Color.adaptive(light: 0x334155, dark: 0xE2E8F0)
        static let level800 = Color.adaptive(light: 0x1E293B, dark: 0xF1F5F9)
        /// 본문 텍스트.
        static let level900 = Color.adaptive(light: 0x0F172A, dark: 0xF8FAFC)
    }

    /// 텍스트·아이콘에 쓰는 브랜드색. 다크에서 밝게 반전된다.
    enum BrandText {
        static let base = Color.adaptive(light: 0x2563EB, dark: 0x93C5FD)
        static let strong = Color.adaptive(light: 0x1D4ED8, dark: 0xBFDBFE)
        static let accent = Color.adaptive(light: 0x6D28D9, dark: 0xDDD6FE)
        static let success = Color.adaptive(light: 0x047857, dark: 0xA7F3D0)
        static let warning = Color.adaptive(light: 0xB45309, dark: 0xFDE68A)
        static let danger = Color.adaptive(light: 0xB91C1C, dark: 0xFECACA)
    }

    /// 채워진 버튼·그라디언트에 쓰는 색. 두 테마에서 같은 값을 유지한다.
    enum Solid {
        static let brand = Color(hex: 0x2563EB)
        static let brandHover = Color(hex: 0x1D4ED8)
        static let brand500 = Color(hex: 0x3B82F6)
        static let indigo = Color(hex: 0x4F46E5)
        static let indigoDeep = Color(hex: 0x4338CA)
        static let accent = Color(hex: 0x7C3AED)
        static let accent500 = Color(hex: 0x8B5CF6)
        static let success = Color(hex: 0x10B981)
        static let successDeep = Color(hex: 0x059669)
        static let warning = Color(hex: 0xF59E0B)
        static let warningDeep = Color(hex: 0xD97706)
        static let danger = Color(hex: 0xEF4444)
        static let dangerDeep = Color(hex: 0xDC2626)
        /// 다크 카드 배경. 다크 테마에서도 어두운 값을 유지한다.
        static let ink = Color(hex: 0x0F172A)
    }

    /// 배지·soft 패널 배경.
    /// 라이트는 옅은 색을 그대로 쓰고, 다크는 원색을 낮은 알파로 깐다.
    /// 알파 값은 `index.css`의 다크 오버라이드와 동일하다.
    enum Wash {
        static let brand = Color.adaptive(light: 0xEFF6FF, dark: 0x2563EB, darkAlpha: 0.12)
        static let brandStrong = Color.adaptive(light: 0xDBEAFE, dark: 0x2563EB, darkAlpha: 0.18)
        static let accent = Color.adaptive(light: 0xFAF5FF, dark: 0x7C3AED, darkAlpha: 0.14)
        static let success = Color.adaptive(light: 0xECFDF5, dark: 0x10B981, darkAlpha: 0.12)
        static let warning = Color.adaptive(light: 0xFFFBEB, dark: 0xF59E0B, darkAlpha: 0.14)
        static let danger = Color.adaptive(light: 0xFEF2F2, dark: 0xEF4444, darkAlpha: 0.12)
        /// 중립 배지·칩.
        static let neutral = Color.adaptive(light: 0xF1F5F9, dark: 0x1F2942)
    }

    /// 브랜드 그라디언트. 웹의 `from-indigo-pair-600 to-brand-700`과 히어로 3색 그라디언트.
    enum Gradient {
        /// CTA 카드 (Card variant="gradient").
        static let cta = LinearGradient(
            colors: [Solid.indigo, Color(hex: 0x1D4ED8)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        /// 히어로 — VocaLoop 파랑→인디고→보라.
        static let hero = LinearGradient(
            colors: [Solid.brand, Solid.indigo, Solid.accent],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

// MARK: - Radius

extension DS {
    /// 의미 기반 모서리. 임의 값을 쓰지 말 것.
    enum Radius {
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 20
        static let xl: CGFloat = 24
        /// 메인 카드 시그니처.
        static let card: CGFloat = 32
        /// 히어로·푸터 카드.
        static let hero: CGFloat = 48
    }
}

// MARK: - Shadow

extension DS {
    struct Shadow {
        var color: Color
        var radius: CGFloat
        var y: CGFloat

        /// CSS blur 값의 절반이 SwiftUI radius와 대략 맞는다.
        static let soft = Shadow(color: shadowInk.opacity(0.06), radius: 1.5, y: 1)
        static let card = Shadow(color: shadowInk.opacity(0.08), radius: 3, y: 4)
        static let cardHover = Shadow(color: shadowInk.opacity(0.12), radius: 10, y: 6)
        static let elevated = Shadow(color: shadowInk.opacity(0.18), radius: 20, y: 10)
        static let floating = Shadow(color: shadowInk.opacity(0.25), radius: 30, y: 15)

        /// 핵심 액션에만. 남발 금지.
        static let glowBrand = Shadow(color: DS.Solid.brand.opacity(0.35), radius: 15, y: 10)
        static let glowIndigo = Shadow(color: DS.Solid.indigo.opacity(0.35), radius: 15, y: 10)

        /// 다크에서는 그림자가 더 진해야 면이 분리된다.
        private static let shadowInk = Color.adaptive(light: 0x0F172A, dark: 0x000000)
    }
}

extension View {
    func dsShadow(_ shadow: DS.Shadow) -> some View {
        self.shadow(color: shadow.color, radius: shadow.radius, x: 0, y: shadow.y)
    }
}

// MARK: - Typography

extension DS {
    /// 웹의 타입 스케일과 무게 규칙을 옮긴 것.
    ///
    /// 웹은 Inter + Noto Sans KR을 쓰지만 앱은 시스템 서체를 쓴다.
    /// SF Pro는 Inter와 같은 계열의 중립 그로테스크이고 한글 렌더링도 훨씬 낫다.
    /// 편집 디자인의 인상은 서체 이름이 아니라 **굵기(900)와 좁은 자간**에서 나오므로
    /// 그 두 가지를 그대로 지킨다.
    enum Font {
        /// 히어로 48pt / black
        static let hero = SwiftUI.Font.system(size: 48, weight: .black)
        /// 페이지 헤딩 36pt / black
        static let pageTitle = SwiftUI.Font.system(size: 34, weight: .black)
        /// KPI 숫자 30pt / black
        static let kpi = SwiftUI.Font.system(size: 30, weight: .black)
        /// 섹션 헤딩 24pt / black
        static let sectionTitle = SwiftUI.Font.system(size: 24, weight: .black)
        /// 카드 제목 20pt / black
        static let cardTitle = SwiftUI.Font.system(size: 20, weight: .black)
        /// 강조 본문 18pt / bold
        static let bodyLarge = SwiftUI.Font.system(size: 18, weight: .bold)
        /// 본문 16pt / medium
        static let body = SwiftUI.Font.system(size: 16, weight: .medium)
        /// 본문 강조 16pt / bold
        static let bodyStrong = SwiftUI.Font.system(size: 16, weight: .bold)
        /// 보조 본문·버튼 14pt / bold
        static let label = SwiftUI.Font.system(size: 14, weight: .bold)
        /// 메타 14pt / semibold
        static let meta = SwiftUI.Font.system(size: 14, weight: .semibold)
        /// 캡션 12pt / semibold
        static let caption = SwiftUI.Font.system(size: 12, weight: .semibold)
        /// eyebrow caps 10pt / black — 반드시 대문자 + 넓은 자간과 함께 쓴다.
        static let eyebrow = SwiftUI.Font.system(size: 10, weight: .black)
    }

    /// 웹의 `tracking-tight`(-0.02em) 대응. 큰 글자일수록 좁혀야 편집 느낌이 산다.
    enum Tracking {
        static func tight(_ size: CGFloat) -> CGFloat { -0.02 * size }
        static func tighter(_ size: CGFloat) -> CGFloat { -0.04 * size }
        /// eyebrow caps (0.18em)
        static let widest: CGFloat = 0.18 * 10
    }
}

extension View {
    /// 큰 제목에 편집 디자인 느낌의 좁은 자간을 준다.
    func dsTightTracking(_ size: CGFloat) -> some View {
        tracking(DS.Tracking.tight(size))
    }
}
