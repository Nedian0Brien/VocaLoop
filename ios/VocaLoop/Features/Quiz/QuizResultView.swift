import SwiftUI

struct QuizResultView: View {
    let session: QuizSession
    let onDone: () -> Void

    private var wrongAnswers: [QuizSession.Answer] {
        session.answers.filter { !$0.wasCorrect }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                scoreCard

                if wrongAnswers.isEmpty {
                    perfectCard
                } else {
                    reviewList
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .safeAreaInset(edge: .bottom) {
            Button("완료", action: onDone)
                .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(DS.Surface.level50)
        }
    }

    private var scoreCard: some View {
        DSCard(variant: .gradient, radius: DS.Radius.card, padding: .xl) {
            VStack(spacing: 10) {
                DSBadge(text: "Session complete", tone: .onDark, style: .pill)

                Text("\(session.accuracy)%")
                    .font(.system(size: 64, weight: .black))
                    .tracking(DS.Tracking.tighter(64))
                    .monospacedDigit()
                    .contentTransition(.numericText())

                Text("\(session.questions.count)문제 중 \(session.correctCount)개 정답")
                    .font(DS.Font.meta)
                    .foregroundStyle(.white.opacity(0.9))
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var perfectCard: some View {
        DSCard(variant: .elevated, radius: DS.Radius.xl, padding: .lg) {
            VStack(spacing: 10) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(DS.BrandText.success)
                Text("전부 맞혔습니다")
                    .font(DS.Font.cardTitle)
                    .dsTightTracking(20)
                    .foregroundStyle(DS.Surface.level900)
                Text("틀린 단어가 없습니다. 다음 세트로 넘어가 보세요.")
                    .font(DS.Font.meta)
                    .foregroundStyle(DS.Surface.level500)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var reviewList: some View {
        VStack(alignment: .leading, spacing: 12) {
            DSSectionHeading(
                title: "다시 볼 단어",
                subtitle: "\(wrongAnswers.count)개를 복습 큐에 담았습니다",
                systemImage: "arrow.trianglehead.counterclockwise",
                tone: .danger
            )

            VStack(spacing: 10) {
                ForEach(wrongAnswers) { answer in
                    DSCard(variant: .elevated, radius: DS.Radius.lg, padding: .none) {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(answer.word.word)
                                    .font(DS.Font.bodyStrong)
                                    .dsTightTracking(16)
                                    .foregroundStyle(DS.Surface.level900)
                                Text(answer.word.primaryMeaning)
                                    .font(DS.Font.caption)
                                    .foregroundStyle(DS.Surface.level500)
                            }

                            Spacer(minLength: 8)

                            Button {
                                SpeechSynthesizer.shared.speak(answer.word.word)
                            } label: {
                                Image(systemName: "speaker.wave.2.fill")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(DS.BrandText.base)
                                    .frame(width: 34, height: 34)
                                    .background(DS.Wash.brand, in: .circle)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("\(answer.word.word) 발음 듣기")
                        }
                        .padding(14)
                    }
                }
            }
        }
    }
}
