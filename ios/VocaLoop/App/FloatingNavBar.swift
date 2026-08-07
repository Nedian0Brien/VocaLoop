import SwiftUI

/// 웹 `Header.jsx`의 `MobileNav` 이식.
///
/// iOS 기본 탭바가 아니라 화면 아래에 떠 있는 캡슐형 네비다.
/// 선택 표시는 색만 바뀌는 게 아니라 흰 pill 인디케이터가 미끄러져 이동한다.
struct FloatingNavBar: View {
    enum Item: String, CaseIterable, Identifiable {
        case vocabulary, study, review, settings

        var id: String { rawValue }

        /// 웹은 라벨을 영문으로 쓴다.
        var label: String {
            switch self {
            case .vocabulary: return "Words"
            case .study: return "Study"
            case .review: return "Review"
            case .settings: return "Settings"
            }
        }

        var symbol: String {
            switch self {
            case .vocabulary: return "book.closed"
            case .study: return "brain"
            case .review: return "arrow.trianglehead.clockwise"
            case .settings: return "gearshape"
            }
        }
    }

    @Binding var selection: Item
    /// 목록을 아래로 훑으면 네비가 내려가 사라진다 (웹의 auto-hide).
    var isHidden: Bool

    @Namespace private var indicator

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Item.allCases) { item in
                let isActive = selection == item

                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.78)) {
                        selection = item
                    }
                } label: {
                    VStack(spacing: 2) {
                        Image(systemName: item.symbol)
                            .font(.system(size: 18, weight: .medium))
                        Text(item.label)
                            .font(.system(size: 11, weight: .black))
                            .dsTightTracking(11)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .foregroundStyle(isActive ? DS.BrandText.strong : DS.Surface.level500)
                    .background {
                        if isActive {
                            // 인디케이터를 matchedGeometry로 옮겨 웹의 슬라이딩을 재현한다.
                            Capsule()
                                .fill(DS.Surface.level0)
                                .overlay(Capsule().strokeBorder(DS.Wash.brandStrong, lineWidth: 1))
                                .dsShadow(.soft)
                                .matchedGeometryEffect(id: "navIndicator", in: indicator)
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isActive ? [.isSelected] : [])
            }
        }
        .padding(4)
        .frame(maxWidth: 400)
        .background(.regularMaterial, in: .capsule)
        .overlay(Capsule().strokeBorder(DS.Surface.level200.opacity(0.8), lineWidth: 1))
        .dsShadow(.floating)
        .padding(.horizontal, 16)
        .offset(y: isHidden ? 140 : 0)
        .opacity(isHidden ? 0 : 1)
        .animation(.easeOut(duration: 0.28), value: isHidden)
    }
}

#if DEBUG
#Preview("떠 있는 네비") {
    @Previewable @State var selection = FloatingNavBar.Item.vocabulary

    ZStack(alignment: .bottom) {
        DS.Surface.level50.ignoresSafeArea()
        FloatingNavBar(selection: $selection, isHidden: false)
            .padding(.bottom, 16)
    }
}
#endif
