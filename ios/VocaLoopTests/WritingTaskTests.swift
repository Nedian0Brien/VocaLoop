import Foundation
import Testing

@testable import VocaLoop

/// 웹 `normalizeEmailTask` / `normalizeDiscussionTask`와 같은 규칙으로 다듬어야 한다.
@Suite("Writing 과제 정규화")
struct WritingTaskNormalizationTests {
    private func decode(_ json: String) throws -> RawWritingTask {
        try JSONCoding.decoder.decode(RawWritingTask.self, from: Data(json.utf8))
    }

    @Test("이메일 과제를 읽어낸다")
    func readsEmailTask() throws {
        let raw = try decode("""
        {
          "taskType": "email",
          "title": "Requesting an Extension",
          "situation": "You need more time for a group project.",
          "requirements": ["Explain the reason", "Propose a new date", "Thank the professor"],
          "recipient": "Professor Harper",
          "timeLimitMinutes": 7,
          "wordTarget": "Answer completely and politely."
        }
        """)

        let task = WritingTask(raw, taskType: .email)
        #expect(task.title == "Requesting an Extension")
        #expect(task.requirements.count == 3)
        #expect(task.recipient == "Professor Harper")
        #expect(task.timeLimitMinutes == 7)
    }

    @Test("토론 과제의 학생 글은 두 개까지만 쓴다")
    func keepsTwoStudentPosts() throws {
        let raw = try decode("""
        {
          "taskType": "academic-discussion",
          "course": "Nursing Ethics",
          "professorQuestion": "How should schools prepare students?",
          "studentPosts": [
            { "name": "Mina", "text": "First opinion." },
            { "name": "Daniel", "text": "Second opinion." },
            { "name": "Extra", "text": "Third opinion." }
          ]
        }
        """)

        let task = WritingTask(raw, taskType: .academicDiscussion)
        #expect(task.studentPosts.count == 2)
        #expect(task.studentPosts.map(\.name) == ["Mina", "Daniel"])
        #expect(task.timeLimitMinutes == 10, "빠지면 유형 기본값을 쓴다")
    }

    @Test("이름 없는 학생 글에도 번호를 붙인다")
    func fillsMissingStudentName() throws {
        let raw = try decode("""
        {
          "professorQuestion": "질문",
          "studentPosts": [{ "text": "의견" }]
        }
        """)

        let task = WritingTask(raw, taskType: .academicDiscussion)
        #expect(task.studentPosts[0].name == "Student 1")
    }

    @Test("빠진 필드는 유형별 기본값으로 채운다")
    func fillsDefaults() throws {
        let raw = try decode("{}")

        let email = WritingTask(raw, taskType: .email)
        #expect(email.title == "Email task")
        #expect(email.recipient == "Recipient")
        #expect(email.timeLimitMinutes == 7)
        #expect(email.wordTarget.contains("politely"))

        let discussion = WritingTask(raw, taskType: .academicDiscussion)
        #expect(discussion.title == "Academic discussion")
        #expect(discussion.course == "Academic seminar")
        #expect(discussion.timeLimitMinutes == 10)
        #expect(discussion.wordTarget == "Write at least 100 words.")
    }

    @Test("채점 프롬프트에 유형별 필드를 실어 보낸다")
    func buildsPromptJSON() throws {
        let raw = try decode("""
        {
          "situation": "상황",
          "requirements": ["A"],
          "recipient": "Prof"
        }
        """)

        let json = WritingTask(raw, taskType: .email).promptJSON
        #expect(json.contains("\"situation\""))
        #expect(json.contains("\"requirements\""))
        // 이메일 과제에 토론 필드가 섞이면 채점자가 헷갈린다.
        #expect(!json.contains("professorQuestion"))
    }
}

/// 점수 하나 때문에 피드백 전체가 날아가면 안 된다.
@Suite("Writing 채점 결과")
struct WritingFeedbackTests {
    private func decode(_ json: String) throws -> RawWritingFeedback {
        try JSONCoding.decoder.decode(RawWritingFeedback.self, from: Data(json.utf8))
    }

    @Test("0~5 밖의 점수는 잘라낸다")
    func clampsScore() throws {
        #expect(WritingFeedback(try decode("{\"score\": 9}")).score == 5)
        #expect(WritingFeedback(try decode("{\"score\": -3}")).score == 0)
        #expect(WritingFeedback(try decode("{\"score\": 4}")).score == 4)
    }

    @Test("문자열로 온 점수도 읽는다")
    func readsStringScore() throws {
        // 웹은 `Number(score)`로 읽어 문자열도 받는다.
        #expect(WritingFeedback(try decode("{\"score\": \"3\"}")).score == 3)
    }

    @Test("점수가 없거나 이상하면 0으로 둔다")
    func handlesMissingScore() throws {
        #expect(WritingFeedback(try decode("{}")).score == 0)
        #expect(WritingFeedback(try decode("{\"score\": \"없음\"}")).score == 0)
    }

    @Test("피드백 문구가 없으면 기본 문구를 쓴다")
    func fallsBackToDefaultFeedback() throws {
        let feedback = WritingFeedback(try decode("{\"score\": 3}"))
        #expect(feedback.feedbackKo == "피드백을 불러왔습니다.")
        #expect(feedback.strengths.isEmpty)
    }
}

@Suite("Writing 단어 수")
struct WritingWordCountTests {
    @Test("공백으로 끊어 세고 빈 조각은 버린다")
    func countsWords() {
        #expect(WritingWordCount.count("Hello world") == 2)
        #expect(WritingWordCount.count("  Hello   world  ") == 2)
        #expect(WritingWordCount.count("") == 0)
        #expect(WritingWordCount.count("   ") == 0)
        #expect(WritingWordCount.count("one\ntwo\tthree") == 3)
    }
}
