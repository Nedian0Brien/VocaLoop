import Foundation

/// 웹 `src/services/toeflAssetApi.js`의 이식.
///
/// AI로 만든 TOEFL 세트를 서버에 저장해 두었다가 나중에 다시 연다.
/// 생성에 20~40초가 걸리므로, 한 번 만든 세트를 버리지 않는 것이 중요하다.
struct ToeflAssetService: Sendable {
    let api: APIClient

    // MARK: - 저장

    private struct CreatePayload: Encodable {
        let mode: String
        let taskType: String?
        let title: String
        let payload: JSONValue
        let metadata: JSONValue
    }

    /// 세트를 저장한다.
    ///
    /// 저장 실패는 학습을 막지 않는다 — 다시 열지 못할 뿐이라 조용히 넘긴다.
    @discardableResult
    func save<P: Encodable>(
        mode: String,
        taskType: String?,
        title: String,
        payload: P,
        metadata: ToeflAssetMetadata
    ) async -> ToeflAsset? {
        do {
            let endpoint = try Endpoint.json(
                "/api/toefl/assets",
                method: .post,
                body: CreatePayload(
                    mode: mode,
                    taskType: taskType,
                    title: title,
                    payload: try JSONValue.encoding(payload),
                    metadata: try JSONValue.encoding(metadata)
                )
            )
            return try await api.send(endpoint, as: ToeflAsset.self)
        } catch {
            return nil
        }
    }

    // MARK: - 불러오기

    func list(limit: Int = 20) async throws -> [ToeflAsset] {
        // 쿼리는 반드시 `queryItems`로 넘긴다. path에 "?"를 넣으면 통째로
        // 퍼센트 인코딩돼 404가 난다.
        try await api.send(
            Endpoint(
                path: "/api/toefl/assets",
                queryItems: [URLQueryItem(name: "limit", value: String(limit))]
            ),
            as: [ToeflAsset].self
        )
    }

    func asset(id: Int) async throws -> ToeflAsset {
        try await api.send(Endpoint(path: "/api/toefl/assets/\(id)"), as: ToeflAsset.self)
    }

    // MARK: - 시도 기록

    private struct AttemptPayload: Encodable {
        let answers: JSONValue
        let results: JSONValue
        let correctCount: Int
        let totalCount: Int
        let score: JSONValue
    }

    /// 푼 결과를 남긴다. 실패해도 학습 흐름을 막지 않는다.
    func recordAttempt(
        assetID: Int,
        correctCount: Int,
        totalCount: Int,
        score: [String: Double] = [:]
    ) async {
        let scoreValue = JSONValue.object(score.mapValues { JSONValue.number($0) })

        do {
            let endpoint = try Endpoint.json(
                "/api/toefl/assets/\(assetID)/attempts",
                method: .post,
                body: AttemptPayload(
                    answers: .emptyObject,
                    results: .emptyObject,
                    correctCount: correctCount,
                    totalCount: totalCount,
                    score: scoreValue
                )
            )
            _ = try await api.send(endpoint, as: ToeflAttempt.self)
        } catch {
            // 기록 실패는 조용히 넘긴다.
        }
    }
}

// MARK: - 모델

/// 서버에 저장된 TOEFL 세트 하나.
struct ToeflAsset: Identifiable, Decodable, Sendable {
    let id: Int
    let mode: String
    let taskType: String?
    let title: String
    let payload: JSONValue
    let metadata: JSONValue
    let createdAt: Date
    let updatedAt: Date

    /// 학습 탭 카드로 되돌리기 위한 모드 정보.
    var modeInfo: QuizModeInfo? { QuizModeRegistry.byID[mode] }

    /// 저장된 세트를 원하는 타입으로 푼다.
    func decodePayload<T: Decodable>(as type: T.Type) throws -> T {
        try payload.decode(as: type)
    }
}

struct ToeflAttempt: Decodable, Sendable {
    let id: Int
    let assetId: Int
    let correctCount: Int
    let totalCount: Int
    let createdAt: Date
}

/// 세트를 만들 때 같이 남기는 조건. 나중에 어떤 설정으로 만든 세트인지 알 수 있다.
struct ToeflAssetMetadata: Encodable, Sendable {
    var targetScore: String
    var questionCount: Int?
    var stage: Int?
    var difficulty: String?
    var vocabSampleCount: Int

    init(
        difficulty: ToeflDifficulty,
        questionCount: Int? = nil,
        stage: Int? = nil,
        moduleDifficulty: String? = nil,
        vocabSampleCount: Int
    ) {
        targetScore = difficulty.rawValue
        self.questionCount = questionCount
        self.stage = stage
        self.difficulty = moduleDifficulty
        self.vocabSampleCount = vocabSampleCount
    }
}
