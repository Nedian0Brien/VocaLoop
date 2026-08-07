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

/// 웹 `quizService.js`의 `gradeShortAnswer`와 결과가 같아야 한다.
@Suite("주관식 채점")
struct ShortAnswerGradingTests {
    private let word = makeWord(id: 1, word: "Serendipity", meaning: "뜻밖의 행운")

    @Test("한국어 뜻을 정답으로 본다 (기본 방향 en-ko)")
    func gradesAgainstKoreanMeaning() {
        #expect(QuizSession.isShortAnswerCorrect("뜻밖의 행운", for: word))
        // 영어 단어를 적는 건 이 방향에서는 정답이 아니다.
        #expect(!QuizSession.isShortAnswerCorrect("Serendipity", for: word))
    }

    @Test("앞뒤 공백과 연속 공백은 무시한다")
    func normalizesWhitespace() {
        #expect(QuizSession.isShortAnswerCorrect("  뜻밖의 행운  ", for: word))
        #expect(QuizSession.isShortAnswerCorrect("뜻밖의   행운", for: word))
    }

    @Test("대소문자는 무시한다")
    func ignoresCase() {
        let english = makeWord(id: 2, word: "Test", meaning: "Trial")
        #expect(QuizSession.isShortAnswerCorrect("trial", for: english))
        #expect(QuizSession.isShortAnswerCorrect("TRIAL", for: english))
    }

    @Test("쉼표로 나열된 뜻은 조각 하나만 맞아도 정답이다")
    func acceptsAnyCommaSeparatedPiece() {
        let multi = makeWord(id: 3, word: "Serendipity", meaning: "뜻밖의 행운, 우연한 발견")
        #expect(QuizSession.isShortAnswerCorrect("우연한 발견", for: multi))
        #expect(QuizSession.isShortAnswerCorrect("뜻밖의 행운", for: multi))
        #expect(QuizSession.isShortAnswerCorrect("뜻밖의 행운, 우연한 발견", for: multi))
    }

    @Test("괄호로 덧붙인 설명은 없어도 정답이다")
    func stripsParentheticalNotes() {
        let noted = makeWord(id: 4, word: "Resilience", meaning: "회복력(탄성)")
        #expect(QuizSession.isShortAnswerCorrect("회복력", for: noted))
        #expect(QuizSession.isShortAnswerCorrect("회복력(탄성)", for: noted))
    }

    @Test("빈 입력과 오답은 틀린 것으로 본다")
    func rejectsEmptyAndWrong() {
        #expect(!QuizSession.isShortAnswerCorrect("", for: word))
        #expect(!QuizSession.isShortAnswerCorrect("   ", for: word))
        #expect(!QuizSession.isShortAnswerCorrect("완전히 다른 뜻", for: word))
    }

    @Test("유사도 0.8이 합격선이다")
    func usesWebSimilarityThreshold() {
        #expect(ShortAnswerGrading.similarityThreshold == 0.8)
        // 한 글자 틀린 5글자 답: 유사도 0.8 → 정답
        #expect(ShortAnswerGrading.grade("뜻밖의 행운", against: "뜻밖의 행복").isCorrect)
        // 절반 이상 다르면 오답
        #expect(!ShortAnswerGrading.grade("행운", against: "뜻밖의 행운").isCorrect)
    }

    @Test("Levenshtein 거리 계산이 맞다")
    func computesLevenshtein() {
        #expect(ShortAnswerGrading.levenshteinDistance("kitten", "sitting") == 3)
        #expect(ShortAnswerGrading.levenshteinDistance("", "abc") == 3)
        #expect(ShortAnswerGrading.levenshteinDistance("same", "same") == 0)
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
