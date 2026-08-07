import SwiftUI

/// 웹 `src/components/MultipleChoiceQuiz.jsx`의 이식.
/// 수치는 웹을 375pt로 렌더링해 측정한 값이다.
struct MultipleChoiceQuizView: View {
    let word: Word
    let choices: [String]
    let onAnswer: (String, Bool) -> Void

    @State private var selected: String?
    @State private var feedback: Bool?

    private var answer: String { word.primaryMeaning }
    private var isAnswered: Bool { selected != nil }

    var body: some View {
        QuizCard(word: word, modeLabel: "Multiple Choice", onSpeak: speak) {
            QuizPromptLabel(text: "정확한 한국어 뜻을 선택하세요:")
                .padding(.bottom, 24)

            VStack(spacing: 12) {
                ForEach(Array(choices.enumerated()), id: \.element) { index, choice in
                    ChoiceButton(
                        index: index + 1,
                        text: choice,
                        state: state(for: choice),
                        action: { select(choice) }
                    )
                }
            }
            .padding(.bottom, 24)

            submitButton
        }
        .sensoryFeedback(.success, trigger: feedback) { _, new in new == true }
        .sensoryFeedback(.error, trigger: feedback) { _, new in new == false }
        .onAppear(perform: speak)
    }

    private var submitButton: some View {
        Button {
            if let selected { finish(selected) }
        } label: {
            Text(isAnswered ? "다음 문제" : "뜻을 선택하세요")
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(
                    isAnswered ? DS.Surface.level800 : DS.Surface.level100,
                    in: .rect(cornerRadius: 24)
                )
                .foregroundStyle(isAnswered ? Color.white : DS.Surface.level400)
        }
        .buttonStyle(.plain)
        .disabled(!isAnswered)
        .animation(.smooth(duration: 0.2), value: isAnswered)
    }

    private func state(for choice: String) -> ChoiceButton.State {
        guard let selected else { return .idle }
        if choice == answer { return .correct }
        if choice == selected { return .wrong }
        return .dimmed
    }

    private func speak() {
        SpeechSynthesizer.shared.speak(word.word)
    }

    private func select(_ choice: String) {
        guard selected == nil else { return }
        selected = choice
        feedback = choice == answer
    }

    private func finish(_ choice: String) {
        onAnswer(choice, choice == answer)
    }
}

/// 웹의 보기 버튼 — 번호 원형 + 뜻 + 배경에 깔리는 고스트 숫자.
struct ChoiceButton: View {
    enum State {
        case idle, correct, wrong, dimmed
    }

    let index: Int
    let text: String
    let state: State
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // 번호 원형: 36×36, 모서리 16, 보더 2
                Text("\(index)")
                    .font(.system(size: 12, weight: .black))
                    .frame(width: 36, height: 36)
                    .background(badgeBackground, in: .rect(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(badgeBorder, lineWidth: 2)
                    )
                    .foregroundStyle(badgeForeground)

                Text(text)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(textColor)
                    .multilineTextAlignment(.leading)

                Spacer(minLength: 0)

                if let symbol {
                    Image(systemName: symbol)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(accent)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(alignment: .bottomTrailing) {
                // 웹의 고스트 숫자 (72/900, surface-500 3%)
                Text("\(index)")
                    .font(.system(size: 72, weight: .black))
                    .foregroundStyle(DS.Surface.level500.opacity(0.03))
                    .offset(x: 8, y: 16)
                    .allowsHitTesting(false)
            }
            .background(background, in: .rect(cornerRadius: 24))
            .overlay(
                RoundedRectangle(cornerRadius: 24).strokeBorder(border, lineWidth: 2)
            )
            .clipShape(.rect(cornerRadius: 24))
        }
        .buttonStyle(.plain)
        .opacity(state == .dimmed ? 0.45 : 1)
        .animation(.smooth(duration: 0.3), value: state)
    }

    private var symbol: String? {
        switch state {
        case .correct: return "checkmark.circle.fill"
        case .wrong: return "xmark.circle.fill"
        case .idle, .dimmed: return nil
        }
    }

    private var accent: Color {
        state == .correct ? DS.BrandText.success : DS.BrandText.danger
    }

    private var background: Color {
        switch state {
        case .correct: return DS.Wash.success
        case .wrong: return DS.Wash.danger
        case .idle, .dimmed: return DS.Surface.level0
        }
    }

    /// 기본 보더는 surface-50 — 거의 보이지 않는 얇은 테두리다.
    private var border: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .idle, .dimmed: return DS.Surface.level50
        }
    }

    private var textColor: Color {
        switch state {
        case .correct: return DS.BrandText.success
        case .wrong: return DS.BrandText.danger
        case .idle, .dimmed: return DS.Surface.level700
        }
    }

    private var badgeBackground: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .idle, .dimmed: return DS.Surface.level50
        }
    }

    private var badgeBorder: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .idle, .dimmed: return DS.Surface.level100
        }
    }

    private var badgeForeground: Color {
        switch state {
        case .correct, .wrong: return .white
        case .idle, .dimmed: return DS.Surface.level400
        }
    }
}

#if DEBUG
#Preview("객관식") {
    ScrollView {
        VStack(spacing: 24) {
            QuizProgressHeader(current: 3, total: 10, correct: 2, wrong: 1)
            MultipleChoiceQuizView(
                word: PreviewData.serendipity,
                choices: ["어디에나 있는", "유창한", "뜻밖의 행운", "회복력"],
                onAnswer: { _, _ in }
            )
        }
        .padding(16)
    }
    .background(DS.Surface.level50)
}
#endif
