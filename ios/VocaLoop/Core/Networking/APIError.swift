import Foundation

/// 화면에 그대로 보여줄 수 있는 형태로 정리한 API 오류.
enum APIError: Error, LocalizedError, Equatable {
    /// 인증 만료. 앱은 이걸 보면 로그인 화면으로 되돌린다.
    case unauthorized
    /// 서버가 detail을 내려준 경우 (FastAPI의 `{"detail": ...}`).
    case server(status: Int, message: String)
    case decoding(String)
    case network(String)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "세션이 만료되었습니다. 다시 로그인해 주세요."
        case let .server(_, message):
            return message
        case .decoding:
            return "서버 응답을 이해하지 못했습니다."
        case let .network(message):
            return message
        }
    }
}

/// FastAPI의 오류 본문. `detail`은 문자열이거나 검증 오류 배열이다.
struct APIErrorBody: Decodable {
    let message: String?

    private struct ValidationItem: Decodable {
        let msg: String?
        let message: String?
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        if let text = try? container.decode(String.self, forKey: .detail) {
            message = text
            return
        }

        if let items = try? container.decode([ValidationItem].self, forKey: .detail) {
            let joined = items.compactMap { $0.msg ?? $0.message }.joined(separator: ", ")
            message = joined.isEmpty ? nil : joined
            return
        }

        message = try? container.decode(String.self, forKey: .message)
    }

    private enum CodingKeys: String, CodingKey {
        case detail
        case message
    }
}
