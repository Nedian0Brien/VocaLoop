import SwiftUI

/// 웹 `src/design-system/primitives/Button.jsx`의 SwiftUI 대응.
///
/// 시스템 `.borderedProminent` 대신 직접 만든 이유는 웹의 시그니처인
/// **brand glow 그림자**와 **큰 모서리**를 그대로 살리기 위해서다.
struct DSButtonStyle: ButtonStyle {
    enum Variant {
        case primary, secondary, ghost, danger, dark
    }

    enum Size {
        case sm, md, lg

        var height: CGFloat {
            switch self {
            case .sm: return 36
            case .md: return 44
            case .lg: return 56
            }
        }

        var horizontalPadding: CGFloat {
            switch self {
            case .sm: return 16
            case .md: return 20
            case .lg: return 28
            }
        }

        var radius: CGFloat {
            switch self {
            case .sm: return DS.Radius.sm
            case .md: return DS.Radius.md
            case .lg: return DS.Radius.lg
            }
        }

        var font: Font {
            switch self {
            case .sm, .md: return DS.Font.label
            case .lg: return DS.Font.bodyStrong
            }
        }
    }

    var variant: Variant = .primary
    var size: Size = .md
    var fullWidth: Bool = false

    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(size.font)
            .dsTightTracking(size == .lg ? 16 : 14)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(height: size.height)
            .padding(.horizontal, size.horizontalPadding)
            .background(background)
            .foregroundStyle(foreground)
            .clipShape(.rect(cornerRadius: size.radius))
            .dsShadow(shadow)
            // 웹은 hover로 밝기를 바꾸지만 터치에는 hover가 없다. 눌림으로 대신한다.
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }

    @ViewBuilder
    private var background: some View {
        if !isEnabled {
            DS.Surface.level200
        } else {
            switch variant {
            case .primary: DS.Solid.brand
            case .secondary: DS.Surface.level100
            case .ghost: Color.clear
            case .danger: DS.Solid.danger
            case .dark: DS.Solid.ink
            }
        }
    }

    private var foreground: Color {
        guard isEnabled else { return DS.Surface.level400 }

        switch variant {
        case .primary, .danger, .dark: return .white
        case .secondary: return DS.Surface.level900
        case .ghost: return DS.Surface.level600
        }
    }

    private var shadow: DS.Shadow {
        guard isEnabled, variant == .primary else {
            return DS.Shadow(color: .clear, radius: 0, y: 0)
        }
        return .glowBrand
    }
}

extension ButtonStyle where Self == DSButtonStyle {
    static func ds(
        _ variant: DSButtonStyle.Variant = .primary,
        size: DSButtonStyle.Size = .md,
        fullWidth: Bool = false
    ) -> DSButtonStyle {
        DSButtonStyle(variant: variant, size: size, fullWidth: fullWidth)
    }
}
