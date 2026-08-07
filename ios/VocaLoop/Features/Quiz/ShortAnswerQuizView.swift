import SwiftUI

/// 웹 `src/components/ShortAnswerQuiz.jsx`의 이식.
/// 기본 방향(en-ko)은 영어 단어를 보여주고 한국어 뜻을 입력받는다.
struct ShortAnswerQuizView: View {
    let word: Word
    let onAnswer: (String, Bool) -> Void

    @State private var input = ""
    @State private var result: Bool?
    @FocusState private var isFocused: Bool

    var body: some View {
        QuizCard(word: word, modeLabel: "Short Answer", onSpeak: speak) {
            QuizPromptLabel(text: "한국어 뜻을 입력하세요:")
                .padding(.bottom, 24)

            answerField
                .padding(.bottom, result == nil ? 24 : 16)

            if let result {
                resultBanner(isCorrect: result)
                    .padding(.bottom, 24)
            }

            submitButton
        }
        .sensoryFeedback(.success, trigger: result) { _, new in new == true }
        .sensoryFeedback(.error, trigger: result) { _, new in new == false }
        .onAppear { isFocused = true }
        .animation(.smooth(duration: 0.25), value: result)
    }

    private var answerField: some View {
        TextField("한국어 뜻 입력", text: $input)
            .autocorrectionDisabled()
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(DS.Surface.level900)
            .focused($isFocused)
            .submitLabel(.done)
            .onSubmit(check)
            .disabled(result != nil)
            .padding(16)
            .frame(height: 72)
            .background(DS.Surface.level0, in: .rect(cornerRadius: 24))
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .strokeBorder(fieldBorder, lineWidth: 2)
            )
    }

    private var fieldBorder: Color {
        guard let result else { return DS.Surface.level100 }
        return result ? DS.Solid.success : DS.Solid.danger
    }

    private func resultBanner(isCorrect: Bool) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 18, weight: .bold))
                Text(isCorrect ? "정답입니다" : "정답: \(word.primaryMeaning)")
                    .font(.system(size: 16, weight: .bold))
                Spacer(minLength: 0)
            }
            .foregroundStyle(isCorrect ? DS.BrandText.success : DS.BrandText.danger)

            if !isCorrect, let definition = word.definitions.first {
                Text(definition)
                    .font(.system(size: 14))
                    .lineSpacing(22.75 - 14)
                    .foregroundStyle(DS.Surface.level700)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            isCorrect ? DS.Wash.success : DS.Wash.danger,
            in: .rect(cornerRadius: 24)
        )
        .transition(.opacity.combined(with: .scale(scale: 0.97)))
    }

    private var submitButton: some View {
        Button {
            if let result {
                onAnswer(input, result)
            } else {
                check()
            }
        } label: {
            Text(result == nil ? "확인" : "다음 문제")
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(
                    canSubmit ? DS.Surface.level800 : DS.Surface.level100,
                    in: .rect(cornerRadius: 24)
                )
                .foregroundStyle(canSubmit ? Color.white : DS.Surface.level400)
        }
        .buttonStyle(.plain)
        .disabled(!canSubmit)
        .animation(.smooth(duration: 0.2), value: canSubmit)
    }

    private var canSubmit: Bool {
        result != nil || !input.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func speak() {
        SpeechSynthesizer.shared.speak(word.word)
    }

    private func check() {
        guard result == nil,
              !input.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        isFocused = false
        result = QuizSession.isShortAnswerCorrect(input, for: word)
    }
}

#if DEBUG
#Preview("주관식") {
    ScrollView {
        VStack(spacing: 24) {
            QuizProgressHeader(current: 5, total: 10, correct: 3, wrong: 1)
            ShortAnswerQuizView(word: PreviewData.serendipity, onAnswer: { _, _ in })
        }
        .padding(16)
    }
    .background(DS.Surface.level50)
}
#endif
