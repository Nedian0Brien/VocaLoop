import SwiftUI

/// 웹과 같은 4칸 구조. iOS 탭바 대신 떠 있는 캡슐 네비를 쓴다.
struct MainTabView: View {
    @Environment(AppState.self) private var appState
    @State private var selection: FloatingNavBar.Item = .vocabulary
    @State private var isNavHidden = false

    var body: some View {
        ZStack(alignment: .bottom) {
            DS.Surface.level50.ignoresSafeArea()

            Group {
                switch selection {
                case .vocabulary:
                    VocabularyListView()
                case .study:
                    StudyHomeView()
                case .review:
                    ReviewView()
                case .settings:
                    SettingsView()
                }
            }
            // 네비가 콘텐츠를 가리지 않도록 아래를 비워둔다.
            .safeAreaPadding(.bottom, 76)

            FloatingNavBar(selection: $selection, isHidden: isNavHidden)
                .padding(.bottom, 8)
        }
        .environment(\.navBarHidden, $isNavHidden)
        .task {
            await appState.vocabulary?.loadIfNeeded()
        }
    }
}

/// 스크롤 방향에 따라 네비를 숨기려면 화면 쪽에서 이 값을 바꿔야 한다.
extension EnvironmentValues {
    @Entry var navBarHidden: Binding<Bool> = .constant(false)
}

/// 아래로 훑으면 네비를 감추고, 위로 올리면 다시 보여준다.
/// 웹 `mobileNavAutoHide.js`와 같은 동작이다.
struct NavAutoHideModifier: ViewModifier {
    @Environment(\.navBarHidden) private var navBarHidden
    @State private var lastOffset: CGFloat = 0

    func body(content: Content) -> some View {
        content.onScrollGeometryChange(for: CGFloat.self) { geometry in
            geometry.contentOffset.y
        } action: { _, offset in
            let delta = offset - lastOffset
            // 작은 흔들림에는 반응하지 않는다.
            guard abs(delta) > 6 else { return }

            let shouldHide = delta > 0 && offset > 24
            if navBarHidden.wrappedValue != shouldHide {
                navBarHidden.wrappedValue = shouldHide
            }
            lastOffset = offset
        }
    }
}

extension View {
    func autoHidesNavBar() -> some View {
        modifier(NavAutoHideModifier())
    }
}
