import Foundation

enum QuizMode: String, CaseIterable, Identifiable, Sendable {
    case multipleChoice
    case shortAnswer
    case flashcard

    var id: String { rawValue }

    var title: String {
        switch self {
        case .multipleChoice: return "객관식"
        case .shortAnswer: return "주관식"
        case .flashcard: return "플래시카드"
        }
    }

    var detail: String {
        switch self {
        case .multipleChoice: return "네 개 보기 중 뜻 고르기"
        case .shortAnswer: return "뜻을 보고 단어 입력하기"
        case .flashcard: return "카드를 넘기며 빠르게 훑기"
        }
    }

    var symbolName: String {
        switch self {
        case .multipleChoice: return "list.bullet"
        case .shortAnswer: return "keyboard"
        case .flashcard: return "rectangle.on.rectangle"
        }
    }
}

/// 객관식 한 문제.
struct MultipleChoiceQuestion: Identifiable, Sendable {
    let id: Int
    let word: Word
    let options: [String]
    let answer: String
}

/// 진행 중인 퀴즈 한 판의 상태를 소유한다.
///
/// 정답 판정과 진행은 순수 로직이라 뷰에서 분리해 두면 테스트할 수 있다.
@Observable
@MainActor
final class QuizSession {
    struct Answer: Identifiable, Sendable {
        let id: Int
        let word: Word
        let wasCorrect: Bool
        let given: String
    }

    let mode: QuizMode
    private(set) var questions: [Word]
    private(set) var index = 0
    private(set) var answers: [Answer] = []
    private(set) var isFinished = false

    /// 객관식 보기. 문제마다 새로 뽑으면 화면이 다시 그려질 때 보기 순서가
    /// 흔들리므로 세션 생성 시 한 번만 만들어 고정한다.
    private(set) var choices: [Int: [String]] = [:]

    init(mode: QuizMode, words: [Word], questionCount: Int) {
        self.mode = mode
        let pool = words.filter { !$0.primaryMeaning.isEmpty }
        self.questions = Array(pool.shuffled().prefix(max(1, questionCount)))

        if mode == .multipleChoice {
            choices = Self.buildChoices(for: questions, pool: pool)
        }
    }

    var currentWord: Word? {
        guard index < questions.count else { return nil }
        return questions[index]
    }

    var currentChoices: [String] {
        guard let word = currentWord else { return [] }
        return choices[word.id] ?? []
    }

    var progress: Double {
        guard !questions.isEmpty else { return 0 }
        return Double(index) / Double(questions.count)
    }

    var correctCount: Int {
        answers.count { $0.wasCorrect }
    }

    var accuracy: Int {
        guard !answers.isEmpty else { return 0 }
        return Int((Double(correctCount) / Double(answers.count) * 100).rounded())
    }

    /// 답을 기록하고 다음 문제로 넘어간다.
    ///
    /// 마지막 문제에서는 `index`를 올리지 않아 `currentWord`가 계속 유효하므로,
    /// 끝난 뒤 들어오는 제출(더블탭, 지연된 콜백)을 여기서 막지 않으면 중복 기록된다.
    func submit(_ given: String, isCorrect: Bool) {
        guard !isFinished, let word = currentWord else { return }

        answers.append(Answer(id: word.id, word: word, wasCorrect: isCorrect, given: given))

        if index + 1 >= questions.count {
            isFinished = true
        } else {
            index += 1
        }
    }

    /// 주관식 채점. 대소문자와 앞뒤 공백은 무시한다.
    /// 순수 함수라 어느 스레드에서나 호출할 수 있다.
    nonisolated static func isShortAnswerCorrect(_ given: String, for word: Word) -> Bool {
        let normalized = given.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty else { return false }
        return normalized == word.word.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    /// 오답 보기는 같은 단어장 안의 다른 뜻에서 뽑는다. 후보가 모자라면
    /// 가능한 만큼만 넣어 문제 자체가 사라지지 않게 한다.
    private nonisolated static func buildChoices(for questions: [Word], pool: [Word]) -> [Int: [String]] {
        var result: [Int: [String]] = [:]

        for word in questions {
            let answer = word.primaryMeaning
            let distractors = pool
                .filter { $0.id != word.id && $0.primaryMeaning != answer }
                .map(\.primaryMeaning)
                .uniqued()
                .shuffled()
                .prefix(3)

            result[word.id] = ([answer] + distractors).shuffled()
        }

        return result
    }
}

private extension Array where Element: Hashable {
    func uniqued() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}
