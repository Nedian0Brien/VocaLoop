import SwiftUI

@main
struct VocaLoopApp: App {
    @State private var appState = AppState()

    init() {
        #if DEBUG
        SerifFont.assertRegistered()
        #endif
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
        }
    }
}
