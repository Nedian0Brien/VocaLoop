import SwiftUI

struct ShortAnswerQuizView: View {
    let word: Word
    let onAnswer: (String, Bool) -> Void

    @State private var input = ""
    @State private var result: Bool?
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 28) {
            prompt
            answerField
            if let result { resultBanner(isCorrect: result) }
            Spacer()
            if result == nil { submitButton }
        }
        .padding(20)
        .sensoryFeedback(.success, trigger: result) { _, new in new == true }
        .sensoryFeedback(.error, trigger: result) { _, new in new == false }
        .onAppear { isFocused = true }
        .animation(.smooth(duration: 0.25), value: result)
    }

    private var prompt: some View {
        VStack(spacing: 8) {
            Text("이 뜻의 영어 단어는?")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(word.primaryMeaning)
                .font(.title.bold())
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .padding(.horizontal, 16)
        .background(.quaternary.opacity(0.4), in: .rect(cornerRadius: 24))
    }

    private var answerField: some View {
        TextField("영어 단어 입력", text: $input)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .font(.title3)
            .multilineTextAlignment(.center)
            .focused($isFocused)
            .submitLabel(.done)
            .onSubmit(check)
            .disabled(result != nil)
            .padding(.vertical, 16)
            .padding(.horizontal, 18)
            .background(.quaternary.opacity(0.5), in: .rect(cornerRadius: 16))
    }

    private func resultBanner(isCorrect: Bool) -> some View {
        VStack(spacing: 6) {
            Label(
                isCorrect ? "정답입니다" : "정답: \(word.word)",
                systemImage: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill"
            )
            .font(.headline)
            .foregroundStyle(isCorrect ? Color.successGreen : Color.dangerRed)

            if word.hasPronunciation {
                Text(word.pronunciation ?? "")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(
            (isCorrect ? Color.successGreen : Color.dangerRed).opacity(0.12),
            in: .rect(cornerRadius: 16)
        )
        .transition(.opacity.combined(with: .scale(scale: 0.96)))
    }

    private var submitButton: some View {
        Button("확인", action: check)
            .buttonStyle(.borderedProminent)
            .controlSize(.extraLarge)
            .tint(.brand)
            .frame(maxWidth: .infinity)
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
