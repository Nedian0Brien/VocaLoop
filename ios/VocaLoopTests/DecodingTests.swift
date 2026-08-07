import Foundation
import Testing

@testable import VocaLoop

@Suite("백엔드 응답 디코딩")
struct DecodingTests {
    @Test("타임존이 없는 datetime을 UTC로 읽는다")
    func parsesNaiveDates() throws {
        let withMicroseconds = try #require(JSONCoding.parseDate("2026-08-07T14:03:18.123456"))
        let withoutFraction = try #require(JSONCoding.parseDate("2026-08-07T14:03:18"))

        #expect(abs(withMicroseconds.timeIntervalSince(withoutFraction) - 0.123456) < 0.001)
    }

    @Test("타임존이 붙은 ISO8601도 읽는다")
    func parsesISO8601() throws {
        let zulu = try #require(JSONCoding.parseDate("2026-08-07T14:03:18Z"))
        let offset = try #require(JSONCoding.parseDate("2026-08-07T23:03:18+09:00"))

        #expect(zulu == offset)
    }

    @Test("알 수 없는 status는 new로 떨어진다")
    func unknownStatusFallsBack() throws {
        let json = """
        {
            "id": 1, "word": "test", "definitions": [], "definitions_ko": [],
            "examples": [], "synonyms": [], "is_flagged": false, "folder_ids": [],
            "learning_rate": 0, "status": "something-new-from-server",
            "stats": { "wrong_count": 0, "review_count": 0 },
            "created_at": "2026-08-07T10:00:00", "updated_at": "2026-08-07T10:00:00"
        }
        """
        let word = try JSONCoding.decoder.decode(Word.self, from: Data(json.utf8))
        #expect(word.status == .new)
    }

    @Test("meaning_ko가 없으면 한국어 정의, 그다음 영어 정의로 대체한다")
    func primaryMeaningFallsBack() throws {
        func decode(_ body: String) throws -> Word {
            let json = """
            {
                "id": 1, "word": "test", \(body),
                "examples": [], "synonyms": [], "is_flagged": false, "folder_ids": [],
                "learning_rate": 0, "status": "new",
                "stats": { "wrong_count": 0, "review_count": 0 },
                "created_at": "2026-08-07T10:00:00", "updated_at": "2026-08-07T10:00:00"
            }
            """
            return try JSONCoding.decoder.decode(Word.self, from: Data(json.utf8))
        }

        let withMeaning = try decode(
            #""meaning_ko": "시험", "definitions": ["a trial"], "definitions_ko": ["시도"]"#
        )
        #expect(withMeaning.primaryMeaning == "시험")

        let withKoreanDefinition = try decode(
            #""definitions": ["a trial"], "definitions_ko": ["시도"]"#
        )
        #expect(withKoreanDefinition.primaryMeaning == "시도")

        let englishOnly = try decode(#""definitions": ["a trial"], "definitions_ko": []"#)
        #expect(englishOnly.primaryMeaning == "a trial")
    }

    @Test("네이티브 로그인 응답에서 세션 토큰을 읽는다")
    func decodesAuthResponse() throws {
        let json = """
        {
            "user": { "id": 7, "email": "a@b.c", "display_name": "민재", "photo_url": null },
            "session_token": "7:1.abcdef"
        }
        """
        let response = try JSONCoding.decoder.decode(AuthResponse.self, from: Data(json.utf8))

        #expect(response.sessionToken == "7:1.abcdef")
        #expect(response.user.displayNameOrEmail == "민재")
        #expect(response.user.initials == "민")
    }

    @Test("웹 응답처럼 토큰이 null이어도 디코딩된다")
    func decodesAuthResponseWithoutToken() throws {
        let json = """
        { "user": { "id": 7, "email": "a@b.c" }, "session_token": null }
        """
        let response = try JSONCoding.decoder.decode(AuthResponse.self, from: Data(json.utf8))

        #expect(response.sessionToken == nil)
        #expect(response.user.displayNameOrEmail == "a@b.c")
    }
}

@Suite("AI 응답에서 JSON 추출")
struct JSONExtractionTests {
    @Test("코드펜스로 감싼 응답에서 객체를 뽑는다")
    func extractsFromCodeFence() throws {
        let text = """
        여기 결과입니다:
        ```json
        {"word": "test", "meaning_ko": "시험"}
        ```
        """
        let extracted = try #require(WordAnalysisService.extractJSONObject(from: text))
        #expect(extracted == #"{"word": "test", "meaning_ko": "시험"}"#)
    }

    @Test("중첩된 객체의 바깥 괄호까지 맞춰 뽑는다")
    func handlesNestedObjects() throws {
        let text = #"prefix {"a": {"b": 1}, "c": 2} suffix"#
        let extracted = try #require(WordAnalysisService.extractJSONObject(from: text))
        #expect(extracted == #"{"a": {"b": 1}, "c": 2}"#)
    }

    @Test("문자열 안의 중괄호에 속지 않는다")
    func ignoresBracesInsideStrings() throws {
        let text = #"{"note": "not a } brace", "n": 1}"#
        let extracted = try #require(WordAnalysisService.extractJSONObject(from: text))
        #expect(extracted == text)
    }

    @Test("이스케이프된 따옴표를 문자열 종료로 보지 않는다")
    func handlesEscapedQuotes() throws {
        let text = #"{"note": "say \"hi\" }", "n": 1}"#
        let extracted = try #require(WordAnalysisService.extractJSONObject(from: text))
        #expect(extracted == text)
    }

    @Test("JSON이 없으면 nil")
    func returnsNilWithoutJSON() {
        #expect(WordAnalysisService.extractJSONObject(from: "죄송합니다, 분석할 수 없습니다.") == nil)
    }
}
