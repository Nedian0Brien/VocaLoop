import SwiftUI

struct QuizResultView: View {
    let session: QuizSession
    let onDone: () -> Void

    private var wrongAnswers: [QuizSession.Answer] {
        session.answers.filter { !$0.wasCorrect }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                scoreCard

                if wrongAnswers.isEmpty {
                    ContentUnavailableView {
                        Label("전부 맞혔습니다", systemImage: "checkmark.seal.fill")
                    } description: {
                        Text("틀린 단어가 없습니다. 다음 세트로 넘어가 보세요.")
                    }
                } else {
                    reviewList
                }
            }
            .padding(20)
        }
        .safeAreaInset(edge: .bottom) {
            Button("완료", action: onDone)
                .buttonStyle(.borderedProminent)
                .controlSize(.extraLarge)
                .tint(.brand)
                .frame(maxWidth: .infinity)
                .padding(20)
                .background(.bar)
        }
    }

    private var scoreCard: some View {
        VStack(spacing: 10) {
            Text("\(session.accuracy)%")
                .font(.system(size: 56, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .contentTransition(.numericText())

            Text("\(session.questions.count)문제 중 \(session.correctCount)개 정답")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.9))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .background(LinearGradient.brandGradient, in: .rect(cornerRadius: 24))
    }

    private var reviewList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("다시 볼 단어 \(wrongAnswers.count)개")
                .font(.headline)

            ForEach(wrongAnswers) { answer in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(answer.word.word).font(.body.weight(.semibold))
                        Text(answer.word.primaryMeaning)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer(minLength: 8)

                    Button {
                        SpeechSynthesizer.shared.speak(answer.word.word)
                    } label: {
                        Image(systemName: "speaker.wave.2.fill")
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Color.brand)
                    .accessibilityLabel("\(answer.word.word) 발음 듣기")
                }
                .padding(16)
                .background(.quaternary.opacity(0.5), in: .rect(cornerRadius: 14))
            }
        }
    }
}
