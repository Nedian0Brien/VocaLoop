import Foundation

/// Bearer 세션 토큰의 소유자.
///
/// `APIClient`가 매 요청마다 토큰을 읽어야 하므로 actor로 직렬화한다.
/// Keychain 접근은 느릴 수 있어 메모리 캐시를 두고, 캐시가 진실의 원본이다.
actor SessionStore {
    private static let account = "session-token"

    private let keychain: KeychainStore
    private var cachedToken: String?
    private var didLoadFromKeychain = false

    init(keychain: KeychainStore = KeychainStore()) {
        self.keychain = keychain
    }

    var token: String? {
        get {
            if didLoadFromKeychain { return cachedToken }
            // 첫 접근에서만 Keychain을 읽는다.
            cachedToken = try? keychain.string(for: Self.account)
            didLoadFromKeychain = true
            return cachedToken
        }
    }

    func save(_ token: String) {
        cachedToken = token
        didLoadFromKeychain = true
        try? keychain.set(token, for: Self.account)
    }

    func clear() {
        cachedToken = nil
        didLoadFromKeychain = true
        try? keychain.remove(account: Self.account)
    }
}
