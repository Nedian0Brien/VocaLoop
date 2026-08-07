import Foundation
import Security

/// 세션 토큰처럼 민감한 짧은 문자열을 Keychain에 보관한다.
///
/// Capacitor 버전에서는 UserDefaults(@capacitor/preferences)를 썼지만,
/// 네이티브에서는 Keychain을 쓸 수 있으므로 그렇게 한다.
/// `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`라 기기 잠금 해제 후에만
/// 읽히고 백업으로 다른 기기에 넘어가지 않는다.
struct KeychainStore: Sendable {
    enum StoreError: Error {
        case unexpectedStatus(OSStatus)
    }

    let service: String

    init(service: String = "kr.lawdigest.vocaloop") {
        self.service = service
    }

    private func baseQuery(account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    func string(for account: String) throws -> String? {
        var query = baseQuery(account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        switch status {
        case errSecSuccess:
            guard let data = item as? Data else { return nil }
            return String(data: data, encoding: .utf8)
        case errSecItemNotFound:
            return nil
        default:
            throw StoreError.unexpectedStatus(status)
        }
    }

    func set(_ value: String?, for account: String) throws {
        guard let value, let data = value.data(using: .utf8) else {
            try remove(account: account)
            return
        }

        let query = baseQuery(account: account)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess { return }

        guard updateStatus == errSecItemNotFound else {
            throw StoreError.unexpectedStatus(updateStatus)
        }

        var insertQuery = query
        insertQuery.merge(attributes) { current, _ in current }
        let addStatus = SecItemAdd(insertQuery as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw StoreError.unexpectedStatus(addStatus)
        }
    }

    func remove(account: String) throws {
        let status = SecItemDelete(baseQuery(account: account) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw StoreError.unexpectedStatus(status)
        }
    }
}
