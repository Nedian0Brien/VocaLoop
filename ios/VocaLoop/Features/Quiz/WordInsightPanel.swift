import SwiftUI

/// 채점 후 웹이 보여주는 단어 정보 묶음 — 정의 / 뉘앙스 / 예문 / 유의어.
///
/// 객관식과 주관식이 같은 마크업을 쓰므로 여기 한 곳에 둔다.
/// 이걸 빼면 "정답입니다"만 뜨고 끝나서, 틀린 단어를 그 자리에서 익힐 수가 없다.
struct WordInsightPanel: View {
    let word: Word

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            definitionCard
            if let nuance = word.nuance, !nuance.isEmpty {
                nuanceCard(nuance)
            }
            examplesCard
            synonymsCard
        }
    }

    // MARK: - Definition

    private var definitionCard: some View {
        insightCard(
            eyebrow: "Definition",
            symbol: "doc.text",
            symbolTint: DS.Solid.brand500,
            background: DS.Surface.level50.opacity(0.5),
            border: DS.Surface.level100
        ) {
            if word.definitions.isEmpty {
                emptyNote("No definitions.")
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(word.definitions.enumerated()), id: \.offset) { _, definition in
                        Text(definition)
                            .font(.system(size: 16, weight: .bold))
                            .lineSpacing(6)
                            .foregroundStyle(DS.Surface.level700)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.leading, 12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            // 웹은 왼쪽에 brand-200 2px 선을 세운다.
                            .overlay(alignment: .leading) {
                                Rectangle()
                                    .fill(Color.adaptive(light: 0xBFDBFE, dark: 0x2563EB, darkAlpha: 0.5))
                                    .frame(width: 2)
                            }
                    }
                }
            }
        }
    }

    // MARK: - Nuance

    private func nuanceCard(_ nuance: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color(hex: 0xA78BFA))
                Text("Nuance".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(Color(hex: 0x94A3B8))
                Spacer(minLength: 0)
            }

            Text(nuance)
                .font(.system(size: 14, weight: .bold))
                .lineSpacing(8.75)
                .foregroundStyle(Color(hex: 0xF1F5F9))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(alignment: .topTrailing) {
            // 웹은 우상단에 큰 아이콘을 5%로 깔아 둔다.
            Image(systemName: "brain.head.profile")
                .font(.system(size: 56, weight: .medium))
                .foregroundStyle(.white.opacity(0.05))
                .padding(16)
                .allowsHitTesting(false)
        }
        .background(Color(hex: 0x1E293B))
        .clipShape(.rect(cornerRadius: DS.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl)
                .strokeBorder(Color(hex: 0x334155), lineWidth: 1)
        )
        .dsShadow(.elevated)
    }

    // MARK: - Examples / Synonyms

    private var examplesCard: some View {
        insightCard(
            eyebrow: "Examples",
            symbol: "quote.opening",
            symbolTint: DS.Solid.indigo,
            background: DS.Surface.level0,
            border: DS.Solid.indigo.opacity(0.1)
        ) {
            if word.examples.isEmpty {
                emptyNote("No examples.")
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    // 웹은 앞의 두 개만 보여준다.
                    ForEach(Array(word.examples.prefix(2).enumerated()), id: \.offset) { _, example in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\"\(example.en)\"")
                                .font(.system(size: 14, weight: .black))
                                .lineSpacing(4)
                                .foregroundStyle(DS.Surface.level900)
                            Text(example.ko)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(DS.Surface.level400)
                        }
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
    }

    private var synonymsCard: some View {
        insightCard(
            eyebrow: "Synonyms",
            symbol: "arrow.left.arrow.right",
            symbolTint: DS.Solid.warning,
            background: DS.Surface.level0,
            border: DS.Solid.warning.opacity(0.1)
        ) {
            if word.synonyms.isEmpty {
                emptyNote("No synonyms.")
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(Array(word.synonyms.enumerated()), id: \.offset) { _, synonym in
                        DSBadge(text: synonym, tone: .warning, style: .tag, size: .sm)
                    }
                }
            }
        }
    }

    // MARK: - 공통 껍데기

    private func insightCard<Content: View>(
        eyebrow: String,
        symbol: String,
        symbolTint: Color,
        background: Color,
        border: Color,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                Image(systemName: symbol)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(symbolTint)
                Text(eyebrow.uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)
                Spacer(minLength: 0)
            }

            content()
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background, in: .rect(cornerRadius: DS.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl).strokeBorder(border, lineWidth: 1)
        )
        .dsShadow(.soft)
    }

    private func emptyNote(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 14))
            .italic()
            .foregroundStyle(DS.Surface.level400)
    }
}

/// 채점 후 아래에 붙는 "다음 문제" 버튼. 웹은 surface-800 위에 화살표를 붙인다.
struct QuizNextButton: View {
    var title: String = "다음 문제"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Text(title)
                Image(systemName: "chevron.right").font(.system(size: 18, weight: .bold))
            }
            .font(.system(size: 18, weight: .black))
            .tracking(-0.45)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(DS.Surface.level800, in: .rect(cornerRadius: DS.Radius.xl))
            .foregroundStyle(DS.Surface.level0)
        }
        .buttonStyle(.plain)
    }
}

#if DEBUG
#Preview("단어 정보") {
    ScrollView {
        WordInsightPanel(word: PreviewData.serendipity).padding(20)
    }
    .background(DS.Surface.level50)
}
#endif
