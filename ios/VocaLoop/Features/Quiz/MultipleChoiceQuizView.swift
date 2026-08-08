import SwiftUI

/// 웹 `src/components/MultipleChoiceQuiz.jsx`의 이식.
/// 수치는 웹을 375pt로 렌더링해 측정한 값이다.
struct MultipleChoiceQuizView: View {
    let word: Word
    let choices: [String]
    let onAnswer: (String, Bool) -> Void

    @State private var selected: String?
    /// 보기를 고른 것만으로는 정답이 드러나지 않는다. 웹처럼 "정답 확인"을
    /// 눌러야 채점되며, 그전까지는 고른 보기만 브랜드색으로 표시한다.
    @State private var isAnswered = false
    @State private var feedback: Bool?

    private var answer: String { word.primaryMeaning }
    private var isCorrect: Bool { selected == answer }

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

            if isAnswered {
                QuizVerdictBanner(
                    isCorrect: isCorrect,
                    title: isCorrect ? "Correct Answer! 🎉" : "Study More 📚",
                    detail: isCorrect ? "잘 맞췄어요!" : "정답은 \(answer) 입니다."
                )
                .padding(.bottom, 24)
            }

            submitButton
        }
        .sensoryFeedback(.success, trigger: feedback) { _, new in new == true }
        .sensoryFeedback(.error, trigger: feedback) { _, new in new == false }
        .animation(.smooth(duration: 0.25), value: isAnswered)
        .onAppear(perform: speak)
    }

    private var submitButton: some View {
        Button(action: primaryAction) {
            Text(buttonTitle)
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(buttonBackground, in: .rect(cornerRadius: 24))
                .foregroundStyle(canProceed ? Color.white : DS.Surface.level400)
        }
        .buttonStyle(.plain)
        .disabled(!canProceed)
        .animation(.smooth(duration: 0.2), value: canProceed)
    }

    /// 채점 전에는 보기를 골라야 진행할 수 있다.
    private var canProceed: Bool { isAnswered || selected != nil }

    private var buttonTitle: String {
        if isAnswered { return "다음 문제" }
        return selected == nil ? "뜻을 선택하세요" : "정답 확인"
    }

    private var buttonBackground: Color {
        if isAnswered { return DS.Surface.level800 }
        // 웹은 채점 버튼만 브랜드색으로 세워 둔다.
        return selected == nil ? DS.Surface.level100 : DS.Solid.brand
    }

    private func primaryAction() {
        if isAnswered {
            guard let selected else { return }
            onAnswer(selected, selected == answer)
        } else {
            check()
        }
    }

    private func state(for choice: String) -> ChoiceButton.State {
        guard isAnswered else {
            return choice == selected ? .selected : .idle
        }
        if choice == answer { return .correct }
        if choice == selected { return .wrong }
        return .dimmed
    }

    private func speak() {
        SpeechSynthesizer.shared.speak(word.word)
    }

    private func select(_ choice: String) {
        guard !isAnswered else { return }
        selected = choice
    }

    private func check() {
        guard !isAnswered, let selected else { return }
        isAnswered = true
        feedback = selected == answer
    }
}

/// 웹의 보기 버튼 — 번호 원형 + 뜻 + 배경에 깔리는 고스트 숫자.
struct ChoiceButton: View {
    enum State {
        /// 고르기 전.
        case idle
        /// 골랐지만 아직 채점 전 — 브랜드색으로 세워만 둔다.
        case selected
        case correct, wrong, dimmed
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
        case .idle, .selected, .dimmed: return nil
        }
    }

    private var accent: Color {
        state == .correct ? DS.BrandText.success : DS.BrandText.danger
    }

    private var background: Color {
        switch state {
        case .correct: return DS.Wash.success
        case .wrong: return DS.Wash.danger
        // 웹은 고른 보기에 brand-50을 30%만 깔아 아주 옅게 표시한다.
        case .selected: return DS.Wash.brand.opacity(0.3)
        case .idle, .dimmed: return DS.Surface.level0
        }
    }

    /// 기본 보더는 surface-50 — 거의 보이지 않는 얇은 테두리다.
    private var border: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .selected: return DS.Solid.brand
        case .idle, .dimmed: return DS.Surface.level50
        }
    }

    private var textColor: Color {
        switch state {
        case .correct: return DS.BrandText.success
        case .wrong: return DS.BrandText.danger
        case .selected: return DS.BrandText.base
        case .idle, .dimmed: return DS.Surface.level700
        }
    }

    private var badgeBackground: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .selected: return DS.Solid.brand
        case .idle, .dimmed: return DS.Surface.level50
        }
    }

    private var badgeBorder: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .selected: return DS.Solid.brand
        case .idle, .dimmed: return DS.Surface.level100
        }
    }

    private var badgeForeground: Color {
        switch state {
        case .correct, .wrong, .selected: return .white
        case .idle, .dimmed: return DS.Surface.level400
        }
    }
}

/// 채점 결과 배너 — 웹 객관식/단어 완성 화면이 함께 쓰는 형태.
/// 아이콘 사각형 + 제목 + 부연 한 줄.
struct QuizVerdictBanner: View {
    let isCorrect: Bool
    let title: String
    let detail: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: isCorrect ? "checkmark" : "exclamationmark.triangle.fill")
                .font(.system(size: 22, weight: .black))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(
                    isCorrect ? DS.Solid.success : DS.Solid.danger,
                    in: .rect(cornerRadius: 20)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                Text(detail)
                    .font(.system(size: 15, weight: .bold))
                    .opacity(0.7)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .foregroundStyle(isCorrect ? DS.BrandText.success : DS.BrandText.danger)
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            isCorrect ? DS.Wash.success : DS.Wash.danger,
            in: .rect(cornerRadius: 24)
        )
        .transition(.opacity.combined(with: .scale(scale: 0.97)))
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
