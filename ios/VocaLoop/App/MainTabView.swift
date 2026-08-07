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
        // 목록을 아래로 훑을 때 탭바가 접혀 내용에 집중된다.
        .tabBarMinimizeBehavior(.onScrollDown)
        .tint(DS.BrandText.base)
        .task {
            await appState.vocabulary?.loadIfNeeded()
        }
    }
}
