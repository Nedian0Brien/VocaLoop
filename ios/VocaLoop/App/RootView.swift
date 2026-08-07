import SwiftUI

/// 인증 상태에 따라 로그인 화면과 본 화면을 가른다.
struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Group {
            switch appState.phase {
            case .launching:
                LaunchView()
            case .signedOut:
                LoginView()
            case .signedIn:
                MainTabView()
            }
        }
        // 로그인/로그아웃은 화면 전체가 바뀌는 전환이라 페이드가 자연스럽다.
        .animation(.smooth(duration: 0.3), value: appState.phase.kind)
        .task {
            // 저장된 Keychain 토큰으로 세션 복원을 시도한다.
            await appState.restoreSession()
        }
    }
}

/// 세션 복원 동안 잠깐 보이는 화면. 로그인 화면과 이어지도록 같은 그라디언트를 쓴다.
private struct LaunchView: View {
    var body: some View {
        ZStack {
            DS.Gradient.hero.ignoresSafeArea()
            VocaLoopMark(size: 64)
        }
    }
}
