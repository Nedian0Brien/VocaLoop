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
                                tint: DS.Solid.warning,
                                words: flagged
                            )
                        }

                        if wordsToReview.isEmpty {
                            allClearCard
                        } else {
                            group(
                                title: "다시 볼 단어",
                                subtitle: "학습률이 낮은 순서",
                                tint: DS.Solid.danger,
                                words: Array(wordsToReview.prefix(20))
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 4)
                    .padding(.bottom, 28)
                }
                .scrollEdgeEffectStyle(.soft, for: .top)
            }
            .navigationTitle("복습")
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
        }
    }

    /// 학습 홈·설정과 같은 그라디언트 히어로. 화면마다 하나뿐이다.
    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("복습 대기")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.85))

            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(wordsToReview.count)")
                    .font(.system(.largeTitle, design: .rounded, weight: .bold))
                    .foregroundStyle(.white)
                    .monospacedDigit()
                Text("개")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.85))
            }

            Text("학습률 80% 미만인 단어를 낮은 순서로 모았습니다.")
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.75))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Gradient.hero, in: .rect(cornerRadius: 26))
        .shadow(color: DS.Solid.indigo.opacity(0.35), radius: 22, y: 12)
    }

    private var allClearCard: some View {
        VStack(spacing: 10) {
            Image(systemName: "checkmark.seal.fill")
                .font(.largeTitle)
                .foregroundStyle(.green)
            Text("복습할 단어가 없습니다")
                .font(.headline)
            Text("모든 단어가 80% 이상입니다.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(DS.Surface.level0, in: .rect(cornerRadius: 20))
        .shadow(color: DS.Solid.brand500.opacity(0.1), radius: 14, y: 6)
    }

    /// 같은 종류의 내용을 나누는 머리는 조판으로만 한다.
    /// 색 타일은 누르면 다른 곳으로 가는 분류에만 쓴다 (학습 홈의 모드 섹션).
    private func group(
        title: String,
        subtitle: String,
        tint: Color,
        words: [Word]
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text(title).font(.title3.bold())

                Text("\(words.count)")
                    .font(.footnote.weight(.bold))
                    .monospacedDigit()
                    .foregroundStyle(tint)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(tint.opacity(0.14), in: .capsule)

                Spacer(minLength: 0)

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 2)
            .padding(.top, 8)

            VStack(spacing: 10) {
                ForEach(words) { word in
                    reviewRow(word)
                }
            }
        }
    }

    private func reviewRow(_ word: Word) -> some View {
        HStack(spacing: 12) {
            LearningRateDonut(rate: word.learningRate, size: 34, lineWidth: 3)

            VStack(alignment: .leading, spacing: 2) {
                Text(word.word)
                    .font(.merriweather(size: 16, weight: .bold))
                    .foregroundStyle(DS.Surface.level900)
                Text(word.primaryMeaning)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
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
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level0, in: .rect(cornerRadius: 18))
        .shadow(color: DS.Solid.brand500.opacity(0.08), radius: 10, y: 4)
    }
}
