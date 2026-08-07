import SwiftUI

struct ShortAnswerQuizView: View {
    let word: Word
    let onAnswer: (String, Bool) -> Void

    @State private var input = ""
    @State private var result: Bool?
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 20) {
            prompt
            answerField
            if let result { resultBanner(isCorrect: result) }
            Spacer(minLength: 0)
            if result == nil { submitButton }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 16)
        .sensoryFeedback(.success, trigger: result) { _, new in new == true }
        .sensoryFeedback(.error, trigger: result) { _, new in new == false }
        .onAppear { isFocused = true }
        .animation(.smooth(duration: 0.25), value: result)
    }

    private var prompt: some View {
        DSCard(variant: .dark, radius: DS.Radius.card, padding: .lg) {
            VStack(spacing: 12) {
                DSBadge(text: "이 뜻의 영어 단어는?", tone: .onDark, style: .pill)

                Text(word.primaryMeaning)
                    .font(DS.Font.pageTitle)
                    .tracking(DS.Tracking.tighter(34))
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.5)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var answerField: some View {
        TextField("영어 단어 입력", text: $input)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .font(DS.Font.bodyLarge)
            .foregroundStyle(DS.Surface.level900)
            .multilineTextAlignment(.center)
            .focused($isFocused)
            .submitLabel(.done)
            .onSubmit(check)
            .disabled(result != nil)
            .frame(height: 56)
            .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.lg)
                    .strokeBorder(fieldBorder, lineWidth: result == nil ? 1 : 2)
            )
    }

    private var fieldBorder: Color {
        guard let result else { return DS.Surface.level200 }
        return result ? DS.Solid.success : DS.Solid.danger
    }

    private func resultBanner(isCorrect: Bool) -> some View {
        DSCard(variant: .flat, radius: DS.Radius.xl, padding: .md) {
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 18, weight: .bold))
                    Text(isCorrect ? "정답입니다" : "정답: \(word.word)")
                        .font(DS.Font.bodyStrong)
                        .dsTightTracking(16)
                }
                .foregroundStyle(isCorrect ? DS.BrandText.success : DS.BrandText.danger)

                if word.hasPronunciation {
                    Text(word.pronunciation ?? "")
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundStyle(DS.Surface.level500)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .background(
            (isCorrect ? DS.Wash.success : DS.Wash.danger),
            in: .rect(cornerRadius: DS.Radius.xl)
        )
        .transition(.opacity.combined(with: .scale(scale: 0.96)))
    }

    private var submitButton: some View {
        Button("확인", action: check)
            .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    private func check() {
        guard result == nil,
              !input.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        isFocused = false
        let isCorrect = QuizSession.isShortAnswerCorrect(input, for: word)
        result = isCorrect
        SpeechSynthesizer.shared.speak(word.word)

        Task {
            try? await Task.sleep(for: .milliseconds(isCorrect ? 750 : 1500))
            onAnswer(input, isCorrect)
        }
    }
}

#if DEBUG
#Preview("주관식") {
    ShortAnswerQuizView(word: PreviewData.serendipity, onAnswer: { _, _ in })
        .background(DS.Surface.level50)
}
#endif
