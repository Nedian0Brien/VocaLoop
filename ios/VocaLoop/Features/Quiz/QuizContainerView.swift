import SwiftUI

/// 퀴즈 한 판의 껍데기. 진행 표시와 모드별 화면 전환만 맡는다.
struct QuizContainerView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    let session: QuizSession

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

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
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("그만두기") { dismiss() }
                        .tint(DS.Surface.level500)
                }
            }
        }
    }

    private var progressBar: some View {
        VStack(spacing: 8) {
            ProgressBar(value: session.progress, tint: DS.Solid.brand, height: 8)

            HStack {
                Text("\(session.index + 1) / \(session.questions.count)")
                    .foregroundStyle(DS.Surface.level500)
                Spacer()
                HStack(spacing: 5) {
                    Circle().fill(DS.Solid.success).frame(width: 6, height: 6)
                    Text("정답 \(session.correctCount)")
                        .foregroundStyle(DS.Surface.level600)
                }
            }
            .font(DS.Font.caption)
            .monospacedDigit()
        }
        .padding(.horizontal, 16)
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
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
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

        withAnimation(.smooth(duration: 0.3)) {
            session.submit(given, isCorrect: isCorrect)
        }

        // 서버 반영은 화면 진행을 막지 않는다.
        Task { await appState.vocabulary?.recordQuizResult(for: word, wasCorrect: isCorrect) }
    }
}
