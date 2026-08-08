import SwiftUI

/// 웹 `src/components/quizConfig/QuizConfigControls.jsx`의 이식.
/// 수치는 웹을 375pt로 렌더링해 측정한 값이다.

/// 설정 모달 안쪽의 작은 섹션 머리. 대시보드의 `SectionHeading`보다 한 단 작다.
struct QuizConfigSectionHead: View {
    enum Tone {
        case neutral, brand, warning, accent

        var background: Color {
            switch self {
            case .neutral: return DS.Surface.level100
            case .brand: return DS.Wash.brand
            case .warning: return DS.Wash.warning
            case .accent: return DS.Wash.accent
            }
        }

        var foreground: Color {
            switch self {
            case .neutral: return DS.Surface.level600
            case .brand: return DS.BrandText.base
            case .warning: return DS.BrandText.warning
            case .accent: return DS.BrandText.accent
            }
        }
    }

    let title: String
    let subtitle: String
    var systemImage: String
    var tone: Tone = .neutral

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(tone.foreground)
                .frame(width: 36, height: 36)
                .background(tone.background, in: .rect(cornerRadius: DS.Radius.lg))
                .dsShadow(.soft)

            VStack(alignment: .leading, spacing: 0) {
                Text(title)
                    .font(.system(size: 14, weight: .black))
                    .tracking(-0.35)
                    .foregroundStyle(DS.Surface.level900)
                Text(subtitle)
                    .font(.system(size: 11, weight: .bold))
                    .lineSpacing(4.13)
                    .foregroundStyle(DS.Surface.level400)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
    }
}

/// 웹 `ToggleCard` — 큰 카드 안에 스위치가 들어간 형태.
struct QuizToggleCard: View {
    enum Tone {
        case brand, warning, accent

        var activeBackground: Color {
            switch self {
            case .brand: return DS.Wash.brand.opacity(0.5)
            case .warning: return DS.Wash.warning.opacity(0.5)
            case .accent: return DS.Wash.accent.opacity(0.5)
            }
        }

        var activeBorder: Color {
            switch self {
            case .brand: return DS.Solid.brand500
            case .warning: return Color(hex: 0xFCD34D)
            case .accent: return Color(hex: 0xC4B5FD)
            }
        }

        var track: Color {
            switch self {
            case .brand: return DS.Solid.brand500
            case .warning: return DS.Solid.warning
            case .accent: return DS.Solid.accent
            }
        }

        /// 켜졌을 때의 제목색 — 웹은 *-900을 쓴다.
        var activeText: Color {
            switch self {
            case .brand: return DS.BrandText.deep
            case .warning: return Color.adaptive(light: 0x78350F, dark: 0xFEF3C7)
            case .accent: return Color.adaptive(light: 0x4C1D95, dark: 0xEDE9FE)
            }
        }

        var glow: Color {
            switch self {
            case .brand: return DS.Solid.brand500.opacity(0.1)
            case .warning: return DS.Solid.warning.opacity(0.1)
            case .accent: return DS.Solid.accent.opacity(0.1)
            }
        }

        var knobSymbolColor: Color {
            switch self {
            case .brand: return DS.Solid.brand500
            case .warning: return DS.Solid.warning
            case .accent: return DS.Solid.accent
            }
        }
    }

    @Binding var isOn: Bool
    let title: String
    let detail: String
    var tone: Tone = .brand
    /// 켜졌을 때 손잡이 안에 들어가는 아이콘.
    var activeSymbol: String

    var body: some View {
        Button {
            isOn.toggle()
        } label: {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(title)
                        .font(.system(size: 16, weight: .black))
                        .tracking(-0.4)
                        .foregroundStyle(isOn ? tone.activeText : DS.Surface.level700)
                        .padding(.bottom, 6)

                    Text(detail)
                        .font(.system(size: 12, weight: .bold))
                        .lineSpacing(7.5)
                        .foregroundStyle(DS.Surface.level400.opacity(0.8))
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)

                switchTrack
            }
            .padding(24)
            .frame(maxWidth: .infinity, minHeight: 116, alignment: .leading)
            .background(
                isOn ? tone.activeBackground : DS.Surface.level0,
                in: .rect(cornerRadius: DS.Radius.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.card).strokeBorder(
                    isOn ? tone.activeBorder : DS.Surface.level100,
                    lineWidth: 2
                )
            )
            .shadow(color: isOn ? tone.glow : .clear, radius: 12, y: 10)
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.3), value: isOn)
        .accessibilityAddTraits(.isToggle)
        .accessibilityValue(isOn ? "켜짐" : "꺼짐")
    }

    /// 56×32 트랙에 24 손잡이. 꺼지면 왼쪽 4, 켜지면 오른쪽 4.
    private var switchTrack: some View {
        ZStack(alignment: isOn ? .trailing : .leading) {
            Capsule()
                .fill(isOn ? tone.track : DS.Surface.level200)
                .frame(width: 56, height: 32)

            Circle()
                .fill(Color.white)
                .frame(width: 24, height: 24)
                .dsShadow(.card)
                .overlay {
                    if isOn {
                        Image(systemName: activeSymbol)
                            .font(.system(size: 10, weight: .black))
                            .foregroundStyle(tone.knobSymbolColor)
                    }
                }
                .padding(.horizontal, 4)
        }
        .frame(width: 56, height: 32)
    }
}

/// 웹의 `<input type="range">`. 시스템 슬라이더는 트랙 두께와 색을 맞출 수 없어
/// 직접 그린다. 트랙 12pt, 브랜드색 채움, 흰 손잡이 20pt.
struct QuizCountSlider: View {
    let value: Int
    let range: ClosedRange<Int>
    let onChange: (Int) -> Void

    private var progress: Double {
        let span = Double(range.upperBound - range.lowerBound)
        guard span > 0 else { return 1 }
        return Double(value - range.lowerBound) / span
    }

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let thumbX = (width - 20) * progress + 10

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(DS.Surface.level100)
                    .frame(height: 12)

                Capsule()
                    .fill(DS.Solid.brand)
                    .frame(width: max(12, thumbX), height: 12)

                Circle()
                    .fill(DS.Solid.brand)
                    .frame(width: 20, height: 20)
                    .dsShadow(.card)
                    .position(x: thumbX, y: 10)
            }
            .frame(height: 20)
            .contentShape(.rect)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { gesture in
                        let ratio = (gesture.location.x - 10) / max(1, width - 20)
                        let span = Double(range.upperBound - range.lowerBound)
                        let next = Double(range.lowerBound) + (ratio * span).rounded()
                        onChange(max(range.lowerBound, min(range.upperBound, Int(next))))
                    }
            )
        }
        .frame(height: 20)
        .accessibilityElement()
        .accessibilityLabel("개수")
        .accessibilityValue("\(value)")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: onChange(min(range.upperBound, value + 1))
            case .decrement: onChange(max(range.lowerBound, value - 1))
            @unknown default: break
            }
        }
    }
}

/// 범위·폴더 선택에 쓰는 큰 선택 버튼.
struct QuizScopeButton: View {
    enum Tone {
        case brand, warning

        var selectedBackground: Color {
            self == .brand ? DS.Wash.brand : DS.Wash.warning
        }

        var selectedBorder: Color {
            self == .brand ? Color(hex: 0x93C5FD) : Color(hex: 0xFCD34D)
        }

        var selectedText: Color {
            self == .brand ? DS.BrandText.deep : Color.adaptive(light: 0x78350F, dark: 0xFEF3C7)
        }
    }

    let title: String
    let subtitle: String
    let isSelected: Bool
    var tone: Tone = .brand
    var minHeight: CGFloat = 72
    var trailing: AnyView?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(title)
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(isSelected ? tone.selectedText : DS.Surface.level700)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)

                    if !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(DS.Surface.level400)
                    }
                }

                Spacer(minLength: 0)

                if let trailing { trailing }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, minHeight: minHeight, alignment: .leading)
            .background(
                isSelected ? tone.selectedBackground : DS.Surface.level0,
                in: .rect(cornerRadius: DS.Radius.xl)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.xl).strokeBorder(
                    isSelected ? tone.selectedBorder : DS.Surface.level100,
                    lineWidth: 1
                )
            )
            .dsShadow(isSelected ? .card : .soft)
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.2), value: isSelected)
    }
}
