import SwiftUI

/// 퀴즈 한 판의 껍데기. 진행 표시와 모드별 화면 전환만 맡는다.
struct QuizContainerView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    let session: QuizSession

    var body: some View {
        NavigationStack {
            Group {
                if session.isFinished {
                    QuizResultView(session: session) { dismiss() }
                } else {
                    VStack(spacing: 0) {
                        progressBar
                        question
                    }
                }
            }
            .navigationTitle(session.mode.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("그만두기") { dismiss() }
                }
            }
        }
    }

    private var progressBar: some View {
        VStack(spacing: 6) {
            ProgressView(value: session.progress)
                .tint(.brand)

            HStack {
                Text("\(session.index + 1) / \(session.questions.count)")
                Spacer()
                Text("정답 \(session.correctCount)")
            }
            .font(.caption.monospacedDigit())
            .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    @ViewBuilder
    private var question: some View {
        if let word = session.currentWord {
            switch session.mode {
            case .multipleChoice:
                MultipleChoiceQuizView(word: word, choices: session.currentChoices, onAnswer: record)
                    // 문제가 바뀌면 상태를 초기화해야 하므로 단어 id로 뷰 정체성을 준다.
                    .id(word.id)
            case .shortAnswer:
                ShortAnswerQuizView(word: word, onAnswer: record)
                    .id(word.id)
            case .flashcard:
                FlashcardQuizView(word: word, onAnswer: record)
                    .id(word.id)
            }
        }
    }

    private func record(given: String, isCorrect: Bool) {
        guard let word = session.currentWord else { return }
        session.submit(given, isCorrect: isCorrect)

        // 서버 반영은 화면 진행을 막지 않는다.
        Task { await appState.vocabulary?.recordQuizResult(for: word, wasCorrect: isCorrect) }
    }
}
