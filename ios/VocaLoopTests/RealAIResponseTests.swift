import Foundation
import Testing

@testable import VocaLoop

/// 실제 AI 응답으로 파이프라인 전체를 통과시켜 본다.
/// 프롬프트만 맞다고 되는 게 아니라, 모델이 실제로 규격을 지키는지가 관건이다.
@Suite("실제 AI 응답 처리")
struct RealAIResponseTests {
    @Test("코드펜스 없이 와도 JSON을 뽑아낸다")
    func extractsJSON() throws {
        let extracted = try #require(
            WordAnalysisService.extractJSONObject(from: RealAIResponse.completeWords)
        )
        #expect(extracted.hasPrefix("{"))
        #expect(extracted.hasSuffix("}"))
    }

    @Test("앱의 디코더로 문항을 읽어낸다")
    func decodesQuestions() throws {
        struct Set: Decodable { let questions: [CompleteWordQuestion] }

        let json = try #require(
            WordAnalysisService.extractJSONObject(from: RealAIResponse.completeWords)
        )
        let set = try JSONCoding.decoder.decode(Set.self, from: Data(json.utf8))

        #expect(set.questions.count == 3)
        #expect(set.questions.allSatisfy { $0.blanks.count == 5 })
        // revealCount가 실제로 채워져 오는지 (nil이면 기본 규칙으로 떨어진다)
        #expect(set.questions.allSatisfy { $0.blanks.allSatisfy { $0.revealCount != nil } })
    }

    /// 이 픽스처는 완화 전 기준(70~100단어 / 2~10자 정답)에서 세 문항 모두 걸렸다.
    /// 실패 사유는 101·102단어와 11자 정답 "substantial"이었고,
    /// 둘 다 학습 효과와 무관해 기준을 넓혔다. 이제는 통과해야 한다.
    @Test("완화된 기준으로는 실제 응답이 통과한다")
    func passesWithRelaxedRules() throws {
        struct Set: Decodable { let questions: [CompleteWordQuestion] }

        let json = try #require(
            WordAnalysisService.extractJSONObject(from: RealAIResponse.completeWords)
        )
        let set = try JSONCoding.decoder.decode(Set.self, from: Data(json.utf8))

        // 완화 전이라면 걸렸을 값이 실제로 들어 있는지 먼저 확인한다.
        let wordCounts = set.questions.map {
            $0.fullParagraph.split(whereSeparator: \.isWhitespace).count
        }
        #expect(wordCounts.contains { $0 > 100 }, "101단어 이상 지문이 없어 전제가 깨졌다")
        #expect(
            set.questions.flatMap(\.blanks).contains { $0.answer.count > 10 },
            "11자 이상 정답이 없어 전제가 깨졌다"
        )

        try CompleteWordValidator.validate(
            set.questions,
            questionCount: 3,
            blanksPerQuestion: 5
        )
    }

    @Test("빈칸 조각 계산은 실제 정답에도 잘 동작한다")
    func buildsSegmentsForRealAnswers() throws {
        struct Set: Decodable { let questions: [CompleteWordQuestion] }

        let json = try #require(
            WordAnalysisService.extractJSONObject(from: RealAIResponse.completeWords)
        )
        let set = try JSONCoding.decoder.decode(Set.self, from: Data(json.utf8))

        for question in set.questions {
            for blank in question.blanks {
                let prepared = PreparedBlank(blank)
                // 어떤 정답이든 채울 칸이 최소 하나는 남아야 문제가 성립한다.
                #expect(
                    !CompleteWordEngine.editableIndices(prepared.segments).isEmpty,
                    "‘\(blank.answer)’에 채울 칸이 없다"
                )
            }
        }
    }
}

@Suite("문항 단위 선별")
struct QuestionSalvageTests {
    private func realQuestions() throws -> [CompleteWordQuestion] {
        struct Set: Decodable { let questions: [CompleteWordQuestion] }
        let json = try #require(
            WordAnalysisService.extractJSONObject(from: RealAIResponse.completeWords)
        )
        return try JSONCoding.decoder.decode(Set.self, from: Data(json.utf8)).questions
    }

    /// 검증이 문항 단위라, 세트 하나가 통째로 버려지지 않는다.
    /// 완화 후 이 픽스처는 세 문항 모두 살아남는다.
    @Test("선별은 통과한 문항을 그대로 돌려준다")
    func salvagesPerQuestion() throws {
        let questions = try realQuestions()
        let salvaged = CompleteWordValidator.valid(in: questions, blanksPerQuestion: 5)
        #expect(salvaged.count == questions.count)
    }

    @Test("규격을 지킨 문항은 선별을 통과한다")
    func keepsValidQuestion() throws {
        // 규칙을 모두 지킨 최소 문항: 70~100단어, 4문장, 기능어 2개, 첫/끝 문장 제외
        let body = String(repeating: "Researchers examined regional patterns carefully. ", count: 12)
        let json = """
        {
          "paragraph": "Opening sentence provides context here. \(body)Middle uses {{1}} and {{2}} terms. Closing sentence adds nothing new.",
          "fullParagraph": "Opening sentence provides context here. \(body)Middle uses the and with terms. Closing sentence adds nothing new.",
          "blanks": [
            { "id": 1, "answer": "the", "revealCount": 1 },
            { "id": 2, "answer": "with", "revealCount": 2 }
          ]
        }
        """
        let question = try JSONCoding.decoder.decode(
            CompleteWordQuestion.self, from: Data(json.utf8)
        )
        // 단어 수가 규격을 벗어나면 이 테스트의 전제가 깨지므로 먼저 확인한다.
        let wordCount = question.fullParagraph.split(whereSeparator: \.isWhitespace).count
        #expect((70...100).contains(wordCount), "픽스처 단어 수가 \(wordCount)라 전제가 깨졌다")

        let salvaged = CompleteWordValidator.valid(in: [question], blanksPerQuestion: 2)
        #expect(salvaged.count == 1)
    }
}
