import Foundation

/// 한 번의 API 호출을 값으로 표현한다.
struct Endpoint: Sendable {
    enum Method: String, Sendable {
        case get = "GET"
        case post = "POST"
        case patch = "PATCH"
        case put = "PUT"
        case delete = "DELETE"
    }

    var path: String
    var method: Method = .get
    var queryItems: [URLQueryItem] = []
    var body: Data?

    func url(relativeTo baseURL: URL) -> URL {
        var components = URLComponents(
            url: baseURL.appending(path: path),
            resolvingAgainstBaseURL: false
        )
        if !queryItems.isEmpty {
            components?.queryItems = queryItems
        }
        // path는 모두 코드 안의 리터럴이라 여기서 실패할 수 없다.
        return components?.url ?? baseURL.appending(path: path)
    }

    /// JSON 본문을 갖는 엔드포인트.
    static func json(
        _ path: String,
        method: Method,
        body: some Encodable,
        queryItems: [URLQueryItem] = []
    ) throws -> Endpoint {
        Endpoint(
            path: path,
            method: method,
            queryItems: queryItems,
            body: try JSONCoding.encoder.encode(body)
        )
    }
}

/// 백엔드와 맞춘 인코딩/디코딩 규칙을 한 곳에 모은다.
enum JSONCoding {
    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { decoder in
            let raw = try decoder.singleValueContainer().decode(String.self)
            guard let date = parseDate(raw) else {
                throw DecodingError.dataCorruptedError(
                    in: try decoder.singleValueContainer(),
                    debugDescription: "Unrecognized date: \(raw)"
                )
            }
            return date
        }
        return decoder
    }()

    static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    /// SQLAlchemy가 내려주는 datetime은 타임존이 없을 수도, 소수점 초가 없을 수도 있다.
    /// 네 조합을 모두 받아준다.
    static func parseDate(_ raw: String) -> Date? {
        for formatter in isoFormatters {
            if let date = formatter.date(from: raw) { return date }
        }
        for formatter in naiveFormatters {
            if let date = formatter.date(from: raw) { return date }
        }
        return nil
    }

    /// 타임존이 붙은 형태. 소수점 초 유무를 모두 시도한다.
    ///
    /// 생성 후 설정을 바꾸지 않고 `date(from:)`만 호출한다.
    /// DateFormatter 계열은 iOS 7부터 이런 읽기 전용 사용에 대해 스레드 안전하다고
    /// 문서화되어 있으므로 `nonisolated(unsafe)`로 공유한다.
    private nonisolated(unsafe) static let isoFormatters: [ISO8601DateFormatter] = {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]

        return [withFraction, plain]
    }()

    /// 타임존이 빠진 "2026-08-05T12:58:06[.123456]" 형태. 백엔드가 UTC로 저장하므로 UTC로 읽는다.
    /// DateFormatter는 선택적 구간을 지원하지 않아 포맷별로 하나씩 만든다.
    private nonisolated(unsafe) static let naiveFormatters: [DateFormatter] = {
        ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS", "yyyy-MM-dd'T'HH:mm:ss.SSS", "yyyy-MM-dd'T'HH:mm:ss"]
            .map { format in
                let formatter = DateFormatter()
                formatter.locale = Locale(identifier: "en_US_POSIX")
                formatter.timeZone = TimeZone(secondsFromGMT: 0)
                formatter.dateFormat = format
                return formatter
            }
    }()
}
