import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        TabView {
            Tab("단어장", systemImage: "book.closed") {
                VocabularyListView()
            }

            Tab("학습", systemImage: "brain.head.profile") {
                StudyHomeView()
            }

            Tab("설정", systemImage: "gearshape") {
                SettingsView()
            }
        }
        // 목록을 아래로 훑을 때 탭바가 접혀 내용에 집중된다.
        .tabBarMinimizeBehavior(.onScrollDown)
        .tint(.brand)
        .task {
            await appState.vocabulary?.loadIfNeeded()
        }
    }
}
