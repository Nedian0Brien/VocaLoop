import Foundation

/// 스키마를 모르는 JSON 조각.
///
/// TOEFL 세트를 서버에 저장할 때 `payload`는 모드마다 모양이 다르다. 서버는
/// 그냥 JSON 객체로 받아 두므로, 앱도 형태를 고정하지 않고 이 타입으로 담았다가
/// 필요할 때 원하는 타입으로 풀어 쓴다.
enum JSONValue: Codable, Hashable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "알 수 없는 JSON 값입니다."
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .null: try container.encodeNil()
        case let .bool(value): try container.encode(value)
        case let .number(value): try container.encode(value)
        case let .string(value): try container.encode(value)
        case let .array(value): try container.encode(value)
        case let .object(value): try container.encode(value)
        }
    }

    // MARK: - 변환

    /// 도메인 타입을 그대로 담는다.
    ///
    /// 키 변환 전략이 서로 달라 사고가 나기 쉬우므로, 변환 없는 인코더/디코더를
    /// 써서 **넣은 모양 그대로** 담고 그대로 꺼낸다.
    static func encoding<T: Encodable>(_ value: T) throws -> JSONValue {
        let data = try plainEncoder.encode(value)
        return try plainDecoder.decode(JSONValue.self, from: data)
    }

    func decode<T: Decodable>(as type: T.Type) throws -> T {
        let data = try Self.plainEncoder.encode(self)
        return try Self.plainDecoder.decode(T.self, from: data)
    }

    /// 객체일 때 키로 꺼낸다.
    subscript(key: String) -> JSONValue? {
        if case let .object(fields) = self { return fields[key] }
        return nil
    }

    var stringValue: String? {
        if case let .string(value) = self { return value }
        return nil
    }

    var isEmptyObject: Bool {
        if case let .object(fields) = self { return fields.isEmpty }
        return false
    }

    static let emptyObject = JSONValue.object([:])

    private nonisolated(unsafe) static let plainEncoder = JSONEncoder()
    private nonisolated(unsafe) static let plainDecoder = JSONDecoder()
}
