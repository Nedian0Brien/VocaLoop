import Foundation
import Testing

@testable import VocaLoop

private func makeWord(
    id: Int,
    word: String,
    meaning: String,
    learningRate: Int = 0
) -> Word {
    let json = """
    {
        "id": \(id),
        "word": "\(word)",
        "meaning_ko": "\(meaning)",
        "definitions": [],
        "definitions_ko": [],
        "examples": [],
        "synonyms": [],
        "is_flagged": false,
        "folder_ids": [],
        "learning_rate": \(learningRate),
        "status": "new",
        "stats": { "wrong_count": 0, "review_count": 0 },
        "created_at": "2026-08-07T10:00:00",
        "updated_at": "2026-08-07T10:00:00"
    }
    """
    return try! JSONCoding.decoder.decode(Word.self, from: Data(json.utf8))
}

@Suite("주관식 채점")
struct ShortAnswerGradingTests {
    private let word = makeWord(id: 1, word: "Serendipity", meaning: "뜻밖의 행운")

    @Test("대소문자와 앞뒤 공백은 무시한다")
    func ignoresCaseAndWhitespace() {
        #expect(QuizSession.isShortAnswerCorrect("serendipity", for: word))
        #expect(QuizSession.isShortAnswerCorrect("  Serendipity  ", for: word))
        #expect(QuizSession.isShortAnswerCorrect("SERENDIPITY", for: word))
    }

    @Test("빈 입력과 오답은 틀린 것으로 본다")
    func rejectsEmptyAndWrong() {
        #expect(!QuizSession.isShortAnswerCorrect("", for: word))
        #expect(!QuizSession.isShortAnswerCorrect("   ", for: word))
        #expect(!QuizSession.isShortAnswerCorrect("serendipty", for: word))
    }
}

@Suite("퀴즈 세션 진행")
@MainActor
struct QuizSessionTests {
    private func pool(_ count: Int) -> [Word] {
        (1...count).map { makeWord(id: $0, word: "word\($0)", meaning: "뜻\($0)") }
    }

    @Test("요청한 문제 수만큼만 출제한다")
    func limitsQuestionCount() {
        let session = QuizSession(mode: .flashcard, words: pool(10), questionCount: 4)
        #expect(session.questions.count == 4)
    }

    @Test("단어가 모자라면 있는 만큼만 출제한다")
    func clampsToAvailableWords() {
        let session = QuizSession(mode: .flashcard, words: pool(3), questionCount: 10)
        #expect(session.questions.count == 3)
    }

    @Test("뜻이 없는 단어는 출제하지 않는다")
    func skipsWordsWithoutMeaning() {
        let words = pool(3) + [makeWord(id: 99, word: "empty", meaning: "")]
        let session = QuizSession(mode: .flashcard, words: words, questionCount: 10)
        #expect(session.questions.count == 3)
        #expect(!session.questions.contains { $0.id == 99 })
    }

    @Test("객관식 보기에는 정답이 항상 들어 있다")
    func choicesAlwaysContainAnswer() {
        let session = QuizSession(mode: .multipleChoice, words: pool(8), questionCount: 5)

        for word in session.questions {
            let choices = session.choices[word.id] ?? []
            #expect(choices.contains(word.primaryMeaning))
            #expect(choices.count == 4)
            #expect(Set(choices).count == choices.count, "보기에 중복이 있으면 안 된다")
        }
    }

    @Test("후보가 모자라면 보기 수가 줄어도 정답은 남는다")
    func choicesDegradeGracefully() {
        let session = QuizSession(mode: .multipleChoice, words: pool(2), questionCount: 2)

        for word in session.questions {
            let choices = session.choices[word.id] ?? []
            #expect(choices.contains(word.primaryMeaning))
            #expect(choices.count <= 4)
        }
    }

    @Test("마지막 문제를 답하면 끝난 상태가 된다")
    func finishesAfterLastQuestion() {
        let session = QuizSession(mode: .flashcard, words: pool(2), questionCount: 2)

        session.submit("a", isCorrect: true)
        #expect(!session.isFinished)
        #expect(session.index == 1)

        session.submit("b", isCorrect: false)
        #expect(session.isFinished)
        #expect(session.answers.count == 2)
        #expect(session.correctCount == 1)
        #expect(session.accuracy == 50)
    }

    @Test("끝난 뒤 추가 제출은 무시한다")
    func ignoresSubmissionsAfterFinish() {
        let session = QuizSession(mode: .flashcard, words: pool(1), questionCount: 1)
        session.submit("a", isCorrect: true)
        session.submit("b", isCorrect: false)

        #expect(session.answers.count == 1)
        #expect(session.accuracy == 100)
    }
}
