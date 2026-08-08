import Foundation

/// VocaLoop FastAPI 백엔드와 통신하는 단일 진입점.
///
/// 웹 프론트엔드는 HttpOnly 쿠키를 쓰지만 네이티브는 Bearer 토큰을 쓴다.
/// (backend/app/auth.py가 두 경로를 모두 지원하고, Bearer가 쿠키보다 우선한다.)
actor APIClient {
    private let baseURL: URL
    private let session: URLSession
    private let sessionStore: SessionStore

    init(
        baseURL: URL = AppEnvironment.apiBaseURL,
        sessionStore: SessionStore,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.sessionStore = sessionStore
        self.session = session
    }

    // MARK: - Requests

    /// 본문이 있는 응답을 디코딩해서 돌려준다.
    func send<Response: Decodable>(_ endpoint: Endpoint, as _: Response.Type) async throws -> Response {
        let data = try await perform(endpoint)

        do {
            return try JSONCoding.decoder.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding(String(describing: error))
        }
    }

    /// 204처럼 본문을 쓰지 않는 요청.
    func send(_ endpoint: Endpoint) async throws {
        _ = try await perform(endpoint)
    }

    private func perform(_ endpoint: Endpoint) async throws -> Data {
        var request = URLRequest(url: endpoint.url(relativeTo: baseURL))
        request.httpMethod = endpoint.method.rawValue
        request.timeoutInterval = endpoint.timeout
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(
            AppEnvironment.clientHeaderValue,
            forHTTPHeaderField: AppEnvironment.clientHeaderName
        )

        if let body = endpoint.body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        if let token = await sessionStore.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError {
            throw APIError.network(Self.message(for: error))
        } catch {
            throw APIError.network(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("서버 응답이 올바르지 않습니다.")
        }

        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 {
                // 토큰이 죽었으면 들고 있어봐야 의미가 없다.
                await sessionStore.clear()
                throw APIError.unauthorized
            }

            let body = try? JSONCoding.decoder.decode(APIErrorBody.self, from: data)
            throw APIError.server(
                status: http.statusCode,
                message: body?.message ?? "요청이 실패했습니다 (\(http.statusCode))"
            )
        }

        return data
    }

    /// 사용자에게 보여줄 만한 네트워크 오류 문구.
    private static func message(for error: URLError) -> String {
        switch error.code {
        case .notConnectedToInternet:
            return "인터넷에 연결되어 있지 않습니다."
        case .timedOut:
            return "서버 응답이 너무 오래 걸립니다."
        case .cannotFindHost, .cannotConnectToHost:
            return "서버에 연결할 수 없습니다."
        default:
            return error.localizedDescription
        }
    }
}
