import Foundation

/// 앱 전체의 인증 상태. 루트 뷰가 이걸 보고 로그인 화면과 본 화면을 가른다.
@Observable
@MainActor
final class AppState {
    enum Phase: Equatable {
        case launching
        case signedOut
        case signedIn(User)

        /// 화면 전체가 바뀌는 전환만 구분한다. 사용자 정보만 갱신될 때는
        /// 같은 값이라 루트 전환 애니메이션이 다시 돌지 않는다.
        enum Kind: Equatable {
            case launching, signedOut, signedIn
        }

        var kind: Kind {
            switch self {
            case .launching: return .launching
            case .signedOut: return .signedOut
            case .signedIn: return .signedIn
            }
        }
    }

    private(set) var phase: Phase = .launching

    let api: APIClient
    let auth: AuthService

    /// 로그인한 뒤에만 만들어지는 단어장 스토어. 로그아웃 시 버려서
    /// 다른 계정의 데이터가 남지 않게 한다.
    private(set) var vocabulary: VocabularyStore?

    init() {
        let sessionStore = SessionStore()
        let api = APIClient(sessionStore: sessionStore)
        self.api = api
        self.auth = AuthService(api: api, sessionStore: sessionStore)
    }

    var currentUser: User? {
        if case let .signedIn(user) = phase { return user }
        return nil
    }

    func restoreSession() async {
        #if DEBUG
        // 디자인 확인용. 서버 없이 목 데이터로 화면을 띄운다.
        //   xcrun simctl launch <udid> kr.lawdigest.vocaloop -VocaLoopUseMockData YES
        if UserDefaults.standard.bool(forKey: "VocaLoopUseMockData") {
            signInWithMockData()
            return
        }
        #endif

        if let user = await auth.restoreSession() {
            signIn(user)
        } else {
            phase = .signedOut
        }
    }

    #if DEBUG
    private func signInWithMockData() {
        let store = VocabularyStore(api: api)
        store.loadPreviewData(PreviewData.words, folders: PreviewData.folders)
        vocabulary = store
        phase = .signedIn(User(id: 1, email: "preview@vocaloop.app", displayName: "미리보기"))
    }
    #endif

    func signIn(_ user: User) {
        vocabulary = VocabularyStore(api: api)
        phase = .signedIn(user)
    }

    func updateCurrentUser(_ user: User) {
        guard case .signedIn = phase else { return }
        phase = .signedIn(user)
    }

    func signOut() async {
        await auth.logout()
        vocabulary = nil
        phase = .signedOut
    }

    /// 401을 받았을 때 앱 어디에서든 로그인 화면으로 되돌린다.
    func handleUnauthorized() {
        vocabulary = nil
        phase = .signedOut
    }
}
