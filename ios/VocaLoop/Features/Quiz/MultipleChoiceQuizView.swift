import SwiftUI

struct MultipleChoiceQuizView: View {
    let word: Word
    let choices: [String]
    let onAnswer: (String, Bool) -> Void

    @State private var selected: String?
    @State private var feedback: Bool?

    private var answer: String { word.primaryMeaning }

    var body: some View {
        VStack(spacing: 28) {
            prompt

            VStack(spacing: 12) {
                ForEach(choices, id: \.self) { choice in
                    ChoiceButton(
                        text: choice,
                        state: state(for: choice),
                        action: { select(choice) }
                    )
                }
            }

            Spacer()
        }
        .padding(20)
        .sensoryFeedback(.success, trigger: feedback) { _, new in new == true }
        .sensoryFeedback(.error, trigger: feedback) { _, new in new == false }
        .onAppear { SpeechSynthesizer.shared.speak(word.word) }
    }

    private var prompt: some View {
        VStack(spacing: 10) {
            Text(word.word)
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Button {
                SpeechSynthesizer.shared.speak(word.word)
            } label: {
                Label("발음 듣기", systemImage: "speaker.wave.2.fill")
                    .font(.subheadline)
            }
            .buttonStyle(.glass)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .background(.quaternary.opacity(0.4), in: .rect(cornerRadius: 24))
    }

    private func state(for choice: String) -> ChoiceButton.State {
        guard let selected else { return .idle }
        if choice == answer { return .correct }
        if choice == selected { return .wrong }
        return .dimmed
    }

    private func select(_ choice: String) {
        guard selected == nil else { return }

        selected = choice
        let isCorrect = choice == answer
        feedback = isCorrect

        // 정답을 잠깐 보여준 뒤 다음 문제로 넘어간다.
        Task {
            try? await Task.sleep(for: .milliseconds(isCorrect ? 550 : 1100))
            onAnswer(choice, isCorrect)
        }
    }
}

struct ChoiceButton: View {
    enum State {
        case idle, correct, wrong, dimmed
    }

    let text: String
    let state: State
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(text)
                    .font(.body.weight(.medium))
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                if let symbol {
                    Image(systemName: symbol)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(.plain)
        .background(background, in: .rect(cornerRadius: 16))
        .foregroundStyle(foreground)
        .opacity(state == .dimmed ? 0.45 : 1)
        .animation(.smooth(duration: 0.25), value: state)
    }

    private var symbol: String? {
        switch state {
        case .correct: return "checkmark.circle.fill"
        case .wrong: return "xmark.circle.fill"
        case .idle, .dimmed: return nil
        }
    }

    private var background: AnyShapeStyle {
        switch state {
        case .correct: return AnyShapeStyle(Color.successGreen.opacity(0.18))
        case .wrong: return AnyShapeStyle(Color.dangerRed.opacity(0.18))
        case .idle, .dimmed: return AnyShapeStyle(.quaternary.opacity(0.5))
        }
    }

    private var foreground: Color {
        switch state {
        case .correct: return .successGreen
        case .wrong: return .dangerRed
        case .idle, .dimmed: return .primary
        }
    }
}
