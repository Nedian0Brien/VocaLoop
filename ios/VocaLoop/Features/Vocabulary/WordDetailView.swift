import SwiftUI

struct WordDetailView: View {
    @Environment(AppState.self) private var appState
    let word: Word

    /// 스토어의 최신 사본을 본다. 즐겨찾기·학습률이 바뀌면 이 화면도 따라간다.
    private var current: Word {
        appState.vocabulary?.words.first { $0.id == word.id } ?? word
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                if !current.definitions.isEmpty { definitions }
                if !current.examples.isEmpty { examples }
                if !current.synonyms.isEmpty { synonyms }
                if let nuance = current.nuance, !nuance.isEmpty { nuanceSection(nuance) }
                stats
            }
            .padding(20)
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
                .tint(.warningAmber)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(current.word)
                    .font(.largeTitle.bold())

                Button {
                    SpeechSynthesizer.shared.speak(current.word)
                } label: {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.title3)
                }
                .buttonStyle(.glass)
                .accessibilityLabel("\(current.word) 발음 듣기")
            }

            if current.hasPronunciation {
                Text(current.pronunciation ?? "")
                    .font(.callout.monospaced())
                    .foregroundStyle(.secondary)
            }

            Text(current.primaryMeaning)
                .font(.title3.weight(.medium))

            HStack(spacing: 8) {
                Label(current.status.label, systemImage: current.status.symbolName)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(current.status.tint.opacity(0.15), in: .capsule)
                    .foregroundStyle(current.status.tint)

                if let pos = current.pos, !pos.isEmpty {
                    Text(pos)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(.quaternary, in: .capsule)
                }
            }
        }
    }

    private var definitions: some View {
        Section2("정의") {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(Array(current.definitions.enumerated()), id: \.offset) { index, definition in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(definition)
                        if index < current.definitionsKo.count {
                            Text(current.definitionsKo[index])
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }

    private var examples: some View {
        Section2("예문") {
            VStack(alignment: .leading, spacing: 14) {
                ForEach(Array(current.examples.enumerated()), id: \.offset) { _, example in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(example.en)
                        Text(example.ko)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private var synonyms: some View {
        Section2("유의어") {
            // 단어 수가 적어 가로 흐름 배치로 충분하다.
            FlowLayout(spacing: 8) {
                ForEach(current.synonyms, id: \.self) { synonym in
                    Text(synonym)
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.quaternary, in: .capsule)
                }
            }
        }
    }

    private func nuanceSection(_ nuance: String) -> some View {
        Section2("뉘앙스") {
            Text(nuance).font(.subheadline)
        }
    }

    private var stats: some View {
        Section2("학습 기록") {
            HStack(spacing: 20) {
                StatTile(title: "학습률", value: "\(current.learningRate)%", tint: .brand)
                StatTile(title: "복습", value: "\(current.stats.reviewCount)회", tint: .successGreen)
                StatTile(title: "오답", value: "\(current.stats.wrongCount)회", tint: .dangerRed)
            }
        }
    }
}

/// `Section`은 List/Form 안에서만 자연스러워서 ScrollView용 제목+내용 묶음을 따로 둔다.
private struct Section2<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.secondary)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct StatTile: View {
    let title: String
    let value: String
    let tint: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title3.bold().monospacedDigit())
                .foregroundStyle(tint)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(.quaternary.opacity(0.5), in: .rect(cornerRadius: 14))
    }
}
