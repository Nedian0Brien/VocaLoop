import SwiftUI

/// 웹 `src/design-system/primitives/Badge.jsx`의 SwiftUI 대응.
///
/// `.pill`은 대문자 + 넓은 자간의 eyebrow 스타일이다. 이 조합이
/// "Modern Bold Editorial"의 인상을 만드는 핵심이라 임의로 바꾸지 않는다.
struct DSBadge: View {
    enum Tone {
        case brand, accent, success, warning, danger, neutral, dark
        /// 그라디언트·다크 카드 위에 올릴 때. 배경을 반투명 흰색으로 깐다.
        case onDark

        var background: Color {
            switch self {
            case .brand: return DS.Wash.brand
            case .accent: return DS.Wash.accent
            case .success: return DS.Wash.success
            case .warning: return DS.Wash.warning
            case .danger: return DS.Wash.danger
            case .neutral: return DS.Wash.neutral
            case .dark: return DS.Solid.ink
            case .onDark: return .white.opacity(0.18)
            }
        }

        var foreground: Color {
            switch self {
            case .brand: return DS.BrandText.base
            case .accent: return DS.BrandText.accent
            case .success: return DS.BrandText.success
            case .warning: return DS.BrandText.warning
            case .danger: return DS.BrandText.danger
            case .neutral: return DS.Surface.level600
            case .dark, .onDark: return .white
            }
        }

        var dot: Color {
            switch self {
            case .brand: return DS.Solid.brand500
            case .accent: return DS.Solid.accent500
            case .success: return DS.Solid.success
            case .warning: return DS.Solid.warning
            case .danger: return DS.Solid.danger
            case .neutral: return DS.Surface.level400
            case .dark, .onDark: return .white
            }
        }
    }

    enum Style {
        /// 대문자 + 넓은 자간 (editorial eyebrow)
        case pill
        /// 일반 라벨
        case tag
        /// 왼쪽 점 인디케이터
        case dot
    }

    let text: String
    var tone: Tone = .brand
    var style: Style = .pill
    var systemImage: String?

    var body: some View {
        HStack(spacing: 5) {
            if style == .dot {
                Circle()
                    .fill(tone.dot)
                    .frame(width: 6, height: 6)
            }
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 9, weight: .black))
            }
            Text(style == .pill ? text.uppercased() : text)
                .font(style == .pill ? DS.Font.eyebrow : DS.Font.caption)
                .tracking(style == .pill ? DS.Tracking.widest : 0)
        }
        .padding(.horizontal, style == .pill ? 9 : 10)
        .padding(.vertical, 5)
        .background(tone.background, in: .capsule)
        .foregroundStyle(tone.foreground)
        .accessibilityLabel(text)
    }
}

/// 웹 `SectionHeading` — 아이콘 박스 + 제목 + 부제.
struct DSSectionHeading: View {
    let title: String
    var subtitle: String?
    var systemImage: String
    var tone: DSBadge.Tone = .brand

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: systemImage)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(tone.foreground)
                .frame(width: 44, height: 44)
                .background(tone.background, in: .rect(cornerRadius: DS.Radius.lg))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(DS.Font.cardTitle)
                    .dsTightTracking(20)
                    .foregroundStyle(DS.Surface.level900)
                if let subtitle {
                    Text(subtitle)
                        .font(DS.Font.caption)
                        .foregroundStyle(DS.Surface.level500)
                }
            }

            Spacer(minLength: 0)
        }
    }
}

/// 웹 `Stat` — 대시보드 KPI 카드.
struct DSStat: View {
    let title: String
    let value: String
    var subValue: String?
    var systemImage: String
    var tone: DSBadge.Tone = .brand

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(tone.foreground)
                .frame(width: 34, height: 34)
                .background(tone.background, in: .rect(cornerRadius: DS.Radius.md))

            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(DS.Font.kpi)
                    .dsTightTracking(30)
                    .foregroundStyle(DS.Surface.level900)
                    .monospacedDigit()
                    .contentTransition(.numericText())

                Text(title)
                    .font(DS.Font.caption)
                    .foregroundStyle(DS.Surface.level500)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
