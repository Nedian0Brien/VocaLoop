import SwiftUI

struct MultipleChoiceQuizView: View {
    let word: Word
    let choices: [String]
    let onAnswer: (String, Bool) -> Void

    @State private var selected: String?
    @State private var feedback: Bool?

    private var answer: String { word.primaryMeaning }

    var body: some View {
        VStack(spacing: 24) {
            prompt

            VStack(spacing: 10) {
                ForEach(choices, id: \.self) { choice in
                    ChoiceButton(
                        text: choice,
                        state: state(for: choice),
                        action: { select(choice) }
                    )
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .sensoryFeedback(.success, trigger: feedback) { _, new in new == true }
        .sensoryFeedback(.error, trigger: feedback) { _, new in new == false }
        .onAppear { SpeechSynthesizer.shared.speak(word.word) }
    }

    private var prompt: some View {
        DSCard(variant: .dark, radius: DS.Radius.card, padding: .lg) {
            VStack(spacing: 14) {
                DSBadge(text: "이 단어의 뜻은?", tone: .onDark, style: .pill)

                Text(word.word)
                    .font(DS.Font.hero)
                    .tracking(DS.Tracking.tighter(48))
                    .minimumScaleFactor(0.45)
                    .lineLimit(1)

                Button {
                    SpeechSynthesizer.shared.speak(word.word)
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "speaker.wave.2.fill")
                            .font(.system(size: 12, weight: .bold))
                        Text("발음 듣기").font(DS.Font.caption)
                    }
                    .padding(.horizontal, 14)
                    .frame(height: 34)
                    .background(.white.opacity(0.18), in: .capsule)
                    .foregroundStyle(.white)
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: .infinity)
        }
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
            HStack(spacing: 10) {
                Text(text)
                    .font(DS.Font.bodyStrong)
                    .dsTightTracking(16)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                if let symbol {
                    Image(systemName: symbol)
                        .font(.system(size: 17, weight: .bold))
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(background, in: .rect(cornerRadius: DS.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.xl)
                    .strokeBorder(borderColor, lineWidth: state == .idle ? 1 : 2)
            )
            .foregroundStyle(foreground)
        }
        .buttonStyle(.plain)
        .opacity(state == .dimmed ? 0.4 : 1)
        .dsShadow(state == .idle ? .soft : DS.Shadow(color: .clear, radius: 0, y: 0))
        .animation(.smooth(duration: 0.25), value: state)
    }

    private var symbol: String? {
        switch state {
        case .correct: return "checkmark.circle.fill"
        case .wrong: return "xmark.circle.fill"
        case .idle, .dimmed: return nil
        }
    }

    private var background: Color {
        switch state {
        case .correct: return DS.Wash.success
        case .wrong: return DS.Wash.danger
        case .idle, .dimmed: return DS.Surface.level0
        }
    }

    private var borderColor: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .idle, .dimmed: return DS.Surface.level200
        }
    }

    private var foreground: Color {
        switch state {
        case .correct: return DS.BrandText.success
        case .wrong: return DS.BrandText.danger
        case .idle, .dimmed: return DS.Surface.level900
        }
    }
}

#if DEBUG
#Preview("객관식") {
    MultipleChoiceQuizView(
        word: PreviewData.serendipity,
        choices: ["뜻밖의 행운", "덧없는", "회복력", "어디에나 있는"],
        onAnswer: { _, _ in }
    )
    .background(DS.Surface.level50)
}
#endif
