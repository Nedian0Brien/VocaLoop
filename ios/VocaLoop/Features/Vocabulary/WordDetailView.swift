import SwiftUI

struct WordDetailView: View {
    @Environment(AppState.self) private var appState
    let word: Word

    /// 스토어의 최신 사본을 본다. 즐겨찾기·학습률이 바뀌면 이 화면도 따라간다.
    private var current: Word {
        appState.vocabulary?.words.first { $0.id == word.id } ?? word
    }

    var body: some View {
        ZStack {
            DS.Surface.level50.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    headerCard
                    if !current.definitions.isEmpty { definitionsCard }
                    if !current.examples.isEmpty { examplesCard }
                    if !current.synonyms.isEmpty { synonymsCard }
                    if let nuance = current.nuance, !nuance.isEmpty { nuanceCard(nuance) }
                    statsCard
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 28)
            }
            .scrollEdgeEffectStyle(.soft, for: .top)
        }
        .navigationTitle(current.word)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await appState.vocabulary?.toggleFlag(current) }
                } label: {
                    Image(systemName: current.isFlagged ? "star.fill" : "star")
                }
                .tint(current.isFlagged ? DS.Solid.warning : DS.Surface.level400)
            }
        }
    }

    /// 히어로 카드 — 단어를 크게 세우고 발음 버튼을 붙인다.
    private var headerCard: some View {
        DSCard(variant: .dark, radius: DS.Radius.card, padding: .lg) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 8) {
                    LearningStatusBadge(rate: current.learningRate)

                    if let pos = current.pos, !pos.isEmpty {
                        DSBadge(text: pos, tone: .onDark, style: .tag)
                            }
                }

                HStack(alignment: .center, spacing: 12) {
                    Text(current.word)
                        .font(DS.Font.pageTitle)
                        .tracking(DS.Tracking.tighter(34))
                        .minimumScaleFactor(0.5)
                        .lineLimit(2)

                    Button {
                        SpeechSynthesizer.shared.speak(current.word)
                    } label: {
                        Image(systemName: "speaker.wave.2.fill")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 40, height: 40)
                            .background(.white.opacity(0.16), in: .circle)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(current.word) 발음 듣기")
                }

                if current.hasPronunciation {
                    Text(current.pronunciation ?? "")
                        .font(.system(size: 14, weight: .medium, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.7))
                }

                Text(current.primaryMeaning)
                    .font(DS.Font.bodyLarge)
                    .foregroundStyle(.white.opacity(0.95))

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("학습률")
                            .font(DS.Font.eyebrow)
                            .tracking(DS.Tracking.widest)
                            .foregroundStyle(.white.opacity(0.6))
                        Spacer()
                        Text("\(current.learningRate)%")
                            .font(DS.Font.caption)
                            .monospacedDigit()
                            .foregroundStyle(.white)
                    }
                    // 다크 카드 위라 트랙을 흰색 반투명으로 바꾼다.
                    GeometryReader { proxy in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.18))
                            Capsule()
                                .fill(.white)
                                .frame(width: Double(current.learningRate) / 100 * proxy.size.width)
                        }
                    }
                    .frame(height: 6)
                }
                .padding(.top, 2)
            }
        }
    }

    private var definitionsCard: some View {
        DetailCard(title: "정의", systemImage: "text.book.closed", tone: .brand) {
            VStack(alignment: .leading, spacing: 14) {
                ForEach(Array(current.definitions.enumerated()), id: \.offset) { index, definition in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(definition)
                            .font(DS.Font.body)
                            .foregroundStyle(DS.Surface.level800)
                        if index < current.definitionsKo.count {
                            Text(current.definitionsKo[index])
                                .font(DS.Font.meta)
                                .foregroundStyle(DS.Surface.level500)
                        }
                    }
                }
            }
        }
    }

    private var examplesCard: some View {
        DetailCard(title: "예문", systemImage: "quote.opening", tone: .accent) {
            VStack(alignment: .leading, spacing: 14) {
                ForEach(Array(current.examples.enumerated()), id: \.offset) { _, example in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(example.en)
                            .font(.merriweather(size: 16, weight: .medium))
                            .foregroundStyle(DS.Surface.level800)
                        Text(example.ko)
                            .font(DS.Font.meta)
                            .foregroundStyle(DS.Surface.level500)
                    }
                    .padding(.leading, 12)
                    .overlay(alignment: .leading) {
                        Capsule()
                            .fill(DS.Wash.accent)
                            .frame(width: 3)
                    }
                }
            }
        }
    }

    private var synonymsCard: some View {
        DetailCard(title: "유의어", systemImage: "arrow.triangle.swap", tone: .success) {
            FlowLayout(spacing: 8) {
                ForEach(current.synonyms, id: \.self) { synonym in
                    Text(synonym)
                        .font(DS.Font.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(DS.Surface.level100, in: .capsule)
                        .foregroundStyle(DS.Surface.level700)
                }
            }
        }
    }

    private func nuanceCard(_ nuance: String) -> some View {
        DetailCard(title: "뉘앙스", systemImage: "lightbulb", tone: .warning) {
            Text(nuance)
                .font(DS.Font.body)
                .foregroundStyle(DS.Surface.level700)
        }
    }

    private var statsCard: some View {
        DetailCard(title: "학습 기록", systemImage: "chart.bar", tone: .neutral) {
            HStack(spacing: 12) {
                DSStat(
                    title: "복습",
                    value: "\(current.stats.reviewCount)",
                    systemImage: "arrow.clockwise",
                    tone: .brand
                )
                Divider().frame(height: 52)
                DSStat(
                    title: "오답",
                    value: "\(current.stats.wrongCount)",
                    systemImage: "xmark",
                    tone: .danger
                )
                Divider().frame(height: 52)
                DSStat(
                    title: "학습률",
                    value: "\(current.learningRate)%",
                    systemImage: "target",
                    tone: .success
                )
            }
        }
    }
}

/// 상세 화면의 섹션 카드 — 아이콘 헤더 + 내용.
private struct DetailCard<Content: View>: View {
    let title: String
    let systemImage: String
    var tone: DSBadge.Tone = .brand
    @ViewBuilder let content: Content

    var body: some View {
        DSCard(variant: .elevated, radius: DS.Radius.xl, padding: .md) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 10) {
                    Image(systemName: systemImage)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(tone.foreground)
                        .frame(width: 30, height: 30)
                        .background(tone.background, in: .rect(cornerRadius: DS.Radius.xs))

                    Text(title)
                        .font(DS.Font.bodyStrong)
                        .dsTightTracking(16)
                        .foregroundStyle(DS.Surface.level900)

                    Spacer(minLength: 0)
                }

                content
            }
        }
    }
}

#if DEBUG
#Preview("단어 상세") {
    NavigationStack {
        WordDetailView(word: PreviewData.serendipity)
    }
    .environment(AppState())
}
#endif
