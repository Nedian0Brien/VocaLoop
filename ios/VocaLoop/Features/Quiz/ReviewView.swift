import SwiftUI

/// 웹의 Review 탭 대응. 지금은 학습률이 낮은 단어를 모아 보여준다.
///
/// 웹의 TOEFL 복습 큐(`toeflReviewApi`)는 아직 옮기지 않았다. 그때까지는
/// "다시 볼 단어"를 학습률 기준으로 추려 같은 자리를 채운다.
struct ReviewView: View {
    @Environment(AppState.self) private var appState

    private var wordsToReview: [Word] {
        (appState.vocabulary?.words ?? [])
            .filter { $0.learningStatus != .memorized }
            .sorted { $0.learningRate < $1.learningRate }
    }

    private var flagged: [Word] {
        (appState.vocabulary?.words ?? []).filter(\.isFlagged)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        summaryCard

                        if !flagged.isEmpty {
                            group(
                                title: "즐겨찾기",
                                subtitle: "직접 표시한 단어",
                                symbol: "star.fill",
                                tone: .warning,
                                words: flagged
                            )
                        }

                        if wordsToReview.isEmpty {
                            allClearCard
                        } else {
                            group(
                                title: "다시 볼 단어",
                                subtitle: "학습률이 낮은 순서",
                                symbol: "arrow.trianglehead.counterclockwise",
                                tone: .danger,
                                words: Array(wordsToReview.prefix(20))
                            )
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 4)
                    .padding(.bottom, 28)
                }
                .scrollEdgeEffectStyle(.soft, for: .top)
            }
            .navigationTitle("복습")
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
        }
    }

    private var summaryCard: some View {
        DSCard(variant: .dark, radius: DS.Radius.card, padding: .lg) {
            VStack(alignment: .leading, spacing: 12) {
                DSBadge(text: "Review queue", tone: .onDark, style: .pill)

                Text("\(wordsToReview.count)개가 복습을 기다립니다")
                    .font(DS.Font.sectionTitle)
                    .dsTightTracking(24)
                    .fixedSize(horizontal: false, vertical: true)

                Text("학습률 80% 미만인 단어를 낮은 순서로 모았습니다.")
                    .font(DS.Font.meta)
                    .foregroundStyle(.white.opacity(0.75))
            }
        }
    }

    private var allClearCard: some View {
        DSCard(variant: .elevated, radius: DS.Radius.xl, padding: .lg) {
            VStack(spacing: 10) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(LearningStatus.memorized.dotColor)
                Text("복습할 단어가 없습니다")
                    .font(DS.Font.cardTitle)
                    .dsTightTracking(20)
                    .foregroundStyle(DS.Surface.level900)
                Text("모든 단어가 80% 이상입니다.")
                    .font(DS.Font.meta)
                    .foregroundStyle(DS.Surface.level500)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func group(
        title: String,
        subtitle: String,
        symbol: String,
        tone: DSBadge.Tone,
        words: [Word]
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            DSSectionHeading(title: title, subtitle: subtitle, systemImage: symbol, tone: tone)

            VStack(spacing: 8) {
                ForEach(words) { word in
                    reviewRow(word)
                }
            }
        }
    }

    private func reviewRow(_ word: Word) -> some View {
        DSCard(variant: .elevated, radius: DS.Radius.lg, padding: .none) {
            HStack(spacing: 12) {
                LearningRateDonut(rate: word.learningRate, size: 34, lineWidth: 3)

                VStack(alignment: .leading, spacing: 2) {
                    Text(word.word)
                        .font(.system(size: 16, weight: .bold, design: .serif))
                        .foregroundStyle(DS.Surface.level900)
                    Text(word.primaryMeaning)
                        .font(DS.Font.caption)
                        .foregroundStyle(DS.Surface.level500)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                Button {
                    SpeechSynthesizer.shared.speak(word.word)
                } label: {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(DS.BrandText.base)
                        .frame(width: 32, height: 32)
                        .background(DS.Wash.brand, in: .circle)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(word.word) 발음 듣기")
            }
            .padding(14)
        }
    }
}
