import Foundation

/// 로그인한 사용자. `backend/app/schemas/auth.py`의 `UserRead`와 대응한다.
struct User: Identifiable, Codable, Hashable, Sendable {
    let id: Int
    var email: String
    var displayName: String?
    var photoUrl: String?

    var displayNameOrEmail: String {
        if let displayName, !displayName.isEmpty { return displayName }
        return email
    }

    /// 아바타 자리에 쓸 이니셜.
    var initials: String {
        let source = displayNameOrEmail
        return String(source.prefix(1)).uppercased()
    }
}

/// `/api/auth/*` 응답. `sessionToken`은 네이티브 클라이언트에만 채워진다.
struct AuthResponse: Decodable, Sendable {
    let user: User
    let sessionToken: String?
}
