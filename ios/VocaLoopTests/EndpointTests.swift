import Foundation
import Testing

@testable import VocaLoop

@Suite("엔드포인트 타임아웃")
struct EndpointTimeoutTests {
    @Test("일반 요청은 기본 60초를 쓴다")
    func defaultTimeout() {
        #expect(Endpoint(path: "/api/words").timeout == 60)
    }

    /// 백엔드가 CODEX_CLI_TIMEOUT_SECONDS(운영 180초)까지 기다리므로
    /// 앱이 60초에 끊으면 서버가 정상 작업 중인데도 실패로 보인다.
    @Test("AI 생성용 타임아웃은 백엔드 상한보다 길다")
    func aiTimeoutExceedsBackendLimit() {
        #expect(Endpoint.aiTimeout > 180)
    }

    @Test("json 헬퍼가 타임아웃을 전달한다")
    func jsonHelperCarriesTimeout() throws {
        struct Body: Encodable { let value: Int }

        let endpoint = try Endpoint.json(
            "/api/ai/codex",
            method: .post,
            body: Body(value: 1),
            timeout: Endpoint.aiTimeout
        )

        #expect(endpoint.timeout == Endpoint.aiTimeout)
        #expect(endpoint.method == .post)
        #expect(endpoint.body != nil)
    }

    @Test("쿼리 파라미터가 URL에 붙는다")
    func buildsURLWithQuery() {
        let endpoint = Endpoint(
            path: "/api/folders/3",
            method: .delete,
            queryItems: [URLQueryItem(name: "delete_words", value: "true")]
        )
        let url = endpoint.url(relativeTo: URL(string: "https://example.com")!)

        #expect(url.absoluteString == "https://example.com/api/folders/3?delete_words=true")
    }
}
