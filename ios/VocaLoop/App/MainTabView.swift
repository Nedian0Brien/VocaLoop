import SwiftUI

/// 웹과 같은 4칸 구조. 네비게이션 바는 iOS 기본 탭바를 쓴다.
struct MainTabView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        TabView {
            Tab("Words", systemImage: "book.closed") {
                VocabularyListView()
            }

            Tab("Study", systemImage: "brain") {
                StudyHomeView()
            }

            Tab("Review", systemImage: "arrow.trianglehead.clockwise") {
                ReviewView()
            }

            Tab("Settings", systemImage: "gearshape") {
                SettingsView()
            }
        }
        // 스크롤해도 탭바를 접지 않는다. 접히면 지금 어느 탭인지 알기 어렵다.
        .tabBarMinimizeBehavior(.never)
        .tint(DS.BrandText.base)
        .task {
            await appState.vocabulary?.loadIfNeeded()
        }
    }
}
