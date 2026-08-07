import Foundation

/// 로그인·회원가입·세션 복원을 담당한다.
///
/// 백엔드는 `X-VocaLoop-Client` 헤더가 붙은 요청에만 `session_token`을 내려주고,
/// `APIClient`가 그 헤더를 항상 붙이므로 여기서는 응답의 토큰만 저장하면 된다.
struct AuthService: Sendable {
    let api: APIClient
    let sessionStore: SessionStore

    private struct Credentials: Encodable {
        let email: String
        let password: String
        var displayName: String?
    }

    func login(email: String, password: String) async throws -> User {
        let endpoint = try Endpoint.json(
            "/api/auth/login",
            method: .post,
            body: Credentials(email: email, password: password)
        )
        return try await authenticate(with: endpoint)
    }

    func signup(email: String, password: String, displayName: String?) async throws -> User {
        let endpoint = try Endpoint.json(
            "/api/auth/signup",
            method: .post,
            body: Credentials(email: email, password: password, displayName: displayName)
        )
        return try await authenticate(with: endpoint)
    }

    /// 저장된 토큰으로 세션을 되살린다. 토큰이 없거나 죽었으면 nil.
    func restoreSession() async -> User? {
        guard await sessionStore.token != nil else { return nil }

        do {
            let response = try await api.send(
                Endpoint(path: "/api/auth/me"),
                as: AuthResponse.self
            )
            return response.user
        } catch {
            // 401이면 APIClient가 이미 토큰을 지웠다. 그 외 오류(네트워크 등)는
            // 토큰을 남겨둬야 다음 실행에서 다시 시도할 수 있다.
            return nil
        }
    }

    func logout() async {
        // 서버 호출이 실패해도 기기에 남은 토큰은 반드시 지운다.
        try? await api.send(Endpoint(path: "/api/auth/logout", method: .post))
        await sessionStore.clear()
    }

    private func authenticate(with endpoint: Endpoint) async throws -> User {
        let response = try await api.send(endpoint, as: AuthResponse.self)

        guard let token = response.sessionToken else {
            // 서버가 네이티브 클라이언트로 인식하지 못한 경우. 쿠키만으로는
            // 이후 요청이 인증되지 않으므로 조용히 넘어가면 안 된다.
            throw APIError.server(
                status: 200,
                message: "서버가 세션 토큰을 내려주지 않았습니다. 백엔드 버전을 확인해 주세요."
            )
        }

        await sessionStore.save(token)
        return response.user
    }
}
