import Foundation

/// 스크린샷에서 영어 단어를 뽑아 오는 서비스.
/// 웹 `src/services/vocabularyImportApi.js`와 같은 엔드포인트를 쓴다.
struct VocabularyImportService: Sendable {
    /// 서버가 돌려주는 결과. `backend/app/schemas/ai.py`의 스키마와 같다.
    struct Extraction: Decodable, Sendable {
        var words: [String]
        var suggestedFolderName: String?
    }

    /// 서버 상한과 같은 값. 넘기면 서버가 422로 거절하므로 앱에서 먼저 막는다.
    static let maxImageBytes = 5 * 1024 * 1024

    let api: APIClient

    func extractWords(from imageData: Data, fileName: String = "screenshot.jpg") async throws -> Extraction {
        guard imageData.count <= Self.maxImageBytes else {
            throw APIError.network("이미지가 5MB를 넘습니다. 더 작은 이미지를 골라 주세요.")
        }

        let endpoint = Endpoint.multipart(
            "/api/vocabulary-imports/screenshot/extract",
            fileName: fileName,
            mimeType: "image/jpeg",
            fileData: imageData
        )

        return try await api.send(endpoint, as: Extraction.self)
    }
}
