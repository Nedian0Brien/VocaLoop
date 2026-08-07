import SwiftUI

/// 웹 `src/design-system/primitives/Card.jsx`의 SwiftUI 대응.
///
/// - 메인 콘텐츠 카드: `.elevated` + `.card`(32) + `.lg`
/// - 사이드바/소형:   `.flat`     + `.xl`(24)  + `.md`
/// - 푸터/CTA 강조:   `.dark`     + `.hero`(48) + `.xl`
/// - 강조 액션:       `.gradient` + `.card`(32) + `.lg`
struct DSCard<Content: View>: View {
    enum Variant {
        case elevated, flat, outlined, dark, gradient
    }

    enum Padding {
        case none, sm, md, lg, xl

        var value: CGFloat {
            switch self {
            case .none: return 0
            case .sm: return 16
            case .md: return 24
            case .lg: return 28
            case .xl: return 36
            }
        }
    }

    var variant: Variant = .elevated
    var radius: CGFloat = DS.Radius.card
    var padding: Padding = .lg
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding.value)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(background)
            .overlay(border)
            .clipShape(.rect(cornerRadius: radius))
            .dsShadow(shadow)
            .foregroundStyle(foreground)
    }

    @ViewBuilder
    private var background: some View {
        switch variant {
        case .elevated, .flat:
            DS.Surface.level0
        case .outlined:
            Color.clear
        case .dark:
            // 다크 카드는 두 테마 모두에서 어둡다. 브랜드 글로우를 한 겹 얹어
            // 웹의 blur 원(bg-brand-500/10)과 같은 인상을 만든다.
            DS.Solid.ink.overlay(alignment: .topTrailing) {
                Circle()
                    .fill(DS.Solid.brand500.opacity(0.18))
                    .frame(width: 220, height: 220)
                    .blur(radius: 70)
                    .offset(x: 70, y: -90)
            }
        case .gradient:
            DS.Gradient.cta.overlay(alignment: .topTrailing) {
                Circle()
                    .fill(.white.opacity(0.12))
                    .frame(width: 130, height: 130)
                    .blur(radius: 34)
                    .offset(x: 45, y: -55)
            }
        }
    }

    @ViewBuilder
    private var border: some View {
        switch variant {
        case .elevated, .flat:
            RoundedRectangle(cornerRadius: radius).strokeBorder(DS.Surface.level200, lineWidth: 1)
        case .outlined:
            RoundedRectangle(cornerRadius: radius).strokeBorder(DS.Surface.level200, lineWidth: 2)
        case .dark:
            RoundedRectangle(cornerRadius: radius).strokeBorder(.white.opacity(0.08), lineWidth: 1)
        case .gradient:
            EmptyView()
        }
    }

    private var shadow: DS.Shadow {
        switch variant {
        case .elevated: return .card
        case .flat, .outlined: return DS.Shadow(color: .clear, radius: 0, y: 0)
        case .dark: return .elevated
        case .gradient: return .glowIndigo
        }
    }

    private var foreground: Color {
        switch variant {
        case .dark, .gradient: return .white
        case .elevated, .flat, .outlined: return DS.Surface.level900
        }
    }
}
