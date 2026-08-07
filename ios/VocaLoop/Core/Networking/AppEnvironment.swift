import Foundation

/// API 서버 주소를 한 곳에서 결정한다.
///
/// 기본값은 운영 서버이고, 로컬 백엔드로 붙을 때는 스킴의 환경 변수나
/// 실행 인자로 덮어쓴다. Info.plist에 URL을 박으면 빌드마다 다시 서명해야 해서
/// 런타임 오버라이드를 두는 편이 개발 중에 훨씬 편하다.
///
/// ```
/// xcrun simctl launch --console <udid> kr.lawdigest.vocaloop \
///     -VocaLoopAPIBaseURL "http://localhost:3050"
/// ```
enum AppEnvironment {
    static let productionBaseURL = URL(string: "https://vocaloop.lawdigest.kr")!

    private static let overrideKey = "VocaLoopAPIBaseURL"

    static var apiBaseURL: URL {
        // UserDefaults는 `-VocaLoopAPIBaseURL <url>` 실행 인자도 함께 읽어준다.
        if let raw = UserDefaults.standard.string(forKey: overrideKey),
           let url = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)),
           url.scheme != nil {
            return url
        }

        if let raw = ProcessInfo.processInfo.environment[overrideKey],
           let url = URL(string: raw), url.scheme != nil {
            return url
        }

        return productionBaseURL
    }

    /// 백엔드가 네이티브 클라이언트를 식별하는 헤더.
    /// 이 헤더가 붙은 요청에만 로그인 응답에 `session_token`이 실린다.
    /// (backend/app/auth.py의 CLIENT_HEADER_NAME과 값이 일치해야 한다.)
    static let clientHeaderName = "X-VocaLoop-Client"
    static let clientHeaderValue = "ios"
}
