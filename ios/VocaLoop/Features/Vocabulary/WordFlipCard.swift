import SwiftUI

/// 웹 `src/components/WordCard.jsx`의 이식.
///
/// 목록 행이 아니라 **탭하면 뒤집히는 카드**다. 앞면은 단어만 크게 세우고,
/// 뒷면에 정의·뉘앙스·유의어·예문을 편집 디자인 섹션으로 펼친다.
/// 앞면 높이 192pt(웹 12rem), 모서리 24pt(rounded-xl)까지 웹과 맞춘다.
struct WordFlipCard: View {
    let word: Word
    var folderName: String?
    var onToggleFlag: () -> Void
    var onSpeak: () -> Void

    @State private var isFlipped = false

    private static let frontHeight: CGFloat = 192
    private static let radius = DS.Radius.xl

    var body: some View {
        ZStack {
            if isFlipped {
                back
            } else {
                front
            }
        }
        .rotation3DEffect(.degrees(isFlipped ? 180 : 0), axis: (x: 0, y: 1, z: 0))
        .contentShape(.rect(cornerRadius: Self.radius))
        .onTapGesture {
            withAnimation(.spring(response: 0.55, dampingFraction: 0.82)) {
                isFlipped.toggle()
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityHint("두 번 탭하면 뒤집힙니다")
    }

    // MARK: - Front

    private var front: some View {
        ZStack {
            VStack(spacing: 0) {
                Spacer(minLength: 0)

                // 품사 eyebrow — 웹은 text-xs font-black brand-600 uppercase tracking-wider
                if let pos = word.pos, !pos.isEmpty {
                    Text(pos.uppercased())
                        .font(.system(size: 12, weight: .black))
                        .tracking(0.6)
                        .foregroundStyle(DS.BrandText.base)
                        .padding(.bottom, 8)
                }

                // 웹은 단어를 serif(Merriweather)로 세운다. iOS는 New York이 대응된다.
                Text(word.word)
                    .font(.system(size: 30, weight: .bold, design: .serif))
                    .foregroundStyle(DS.Surface.level900)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .padding(.bottom, 8)

                if word.hasPronunciation {
                    Button {
                        onSpeak()
                    } label: {
                        Text(word.pronunciation ?? "")
                            .font(.system(size: 15, weight: .regular, design: .serif))
                            .italic()
                            .foregroundStyle(DS.Surface.level500)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(word.word) 발음 듣기")
                } else {
                    // 발음이 없어도 뜻은 보여야 카드가 비어 보이지 않는다.
                    Text(word.primaryMeaning)
                        .font(DS.Font.meta)
                        .foregroundStyle(DS.Surface.level500)
                        .lineLimit(1)
                }

                Spacer(minLength: 0)

                LearningRateDonut(rate: word.learningRate, size: 30, lineWidth: 3)
                    .padding(.bottom, 12)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .frame(maxWidth: .infinity)
            .frame(height: Self.frontHeight)

            // 폴더 배지 / 플래그 버튼은 모서리에 고정한다.
            VStack {
                HStack(alignment: .top) {
                    if let folderName {
                        HStack(spacing: 4) {
                            Image(systemName: "folder.fill")
                                .font(.system(size: 9, weight: .black))
                            Text(folderName)
                                .font(DS.Font.eyebrow)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(DS.Wash.brand, in: .capsule)
                        .foregroundStyle(DS.BrandText.base)
                    }

                    Spacer(minLength: 0)

                    flagButton
                }
                Spacer(minLength: 0)
            }
            .padding(12)
        }
        .background(DS.Surface.level0, in: .rect(cornerRadius: Self.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Self.radius)
                .strokeBorder(DS.Surface.level200, lineWidth: 1)
        )
        .dsShadow(.soft)
    }

    private var flagButton: some View {
        Button(action: onToggleFlag) {
            Image(systemName: "star")
                .symbolVariant(word.isFlagged ? .fill : .none)
                .font(.system(size: 14, weight: .semibold))
                .frame(width: 32, height: 32)
                .background(
                    word.isFlagged ? DS.Wash.warning : DS.Surface.level0,
                    in: .rect(cornerRadius: DS.Radius.md)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.md).strokeBorder(
                        word.isFlagged ? DS.Solid.warning.opacity(0.5) : DS.Surface.level200,
                        lineWidth: 1
                    )
                )
                .foregroundStyle(word.isFlagged ? DS.Solid.warning : DS.Surface.level300)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(word.isFlagged ? "단어 플래그 해제" : "단어 플래그 추가")
    }

    // MARK: - Back

    /// 뒷면에 보여줄 내용이 하나라도 있는지. 없으면 구분선만 덩그러니 남는다.
    private var hasBackContent: Bool {
        !word.definitions.isEmpty
            || !(word.nuance ?? "").isEmpty
            || !word.synonyms.isEmpty
            || !word.examples.isEmpty
    }

    private var back: some View {
        VStack(alignment: .leading, spacing: 0) {
            backHeader

            if hasBackContent {
                Divider().overlay(DS.Wash.brandStrong).padding(.vertical, 12)
            } else {
                Text("아직 상세 정보가 없습니다. 단어를 다시 분석해 보세요.")
                    .font(DS.Font.caption)
                    .foregroundStyle(DS.Surface.level500)
                    .padding(.top, 12)
            }

            VStack(alignment: .leading, spacing: 0) {
                if let definition = word.definitions.first {
                    section(
                        eyebrow: "Definition",
                        symbol: "doc.text",
                        symbolColor: DS.BrandText.base,
                        eyebrowColor: DS.Surface.level500
                    ) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(definition)
                                .font(DS.Font.label.weight(.regular))
                                .foregroundStyle(DS.Surface.level800)
                            if let ko = word.definitionsKo.first {
                                Text(ko)
                                    .font(DS.Font.caption.weight(.regular))
                                    .foregroundStyle(DS.Surface.level500)
                            }
                        }
                    }
                }

                if let nuance = word.nuance, !nuance.isEmpty {
                    dividedSection(
                        eyebrow: "Nuance",
                        symbol: "brain",
                        symbolColor: DS.Solid.accent500,
                        eyebrowColor: DS.BrandText.accent
                    ) {
                        Text(nuance)
                            .font(DS.Font.caption.weight(.regular))
                            .foregroundStyle(DS.Surface.level700)
                    }
                }

                if !word.synonyms.isEmpty {
                    dividedSection(
                        eyebrow: "Synonyms",
                        symbol: "arrow.left.arrow.right",
                        symbolColor: DS.Solid.warning,
                        eyebrowColor: DS.BrandText.warning
                    ) {
                        Text(word.synonyms.joined(separator: ", "))
                            .font(DS.Font.label.weight(.regular))
                            .italic()
                            .foregroundStyle(DS.Surface.level800)
                    }
                }

                if !word.examples.isEmpty {
                    dividedSection(
                        eyebrow: "Examples",
                        symbol: "quote.opening",
                        symbolColor: DS.BrandText.base,
                        eyebrowColor: DS.Surface.level500
                    ) {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(Array(word.examples.enumerated()), id: \.offset) { _, example in
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("“\(example.en)”")
                                        .font(DS.Font.label.weight(.medium))
                                        .foregroundStyle(DS.BrandText.strong)
                                    Text(example.ko)
                                        .font(DS.Font.caption.weight(.regular))
                                        .foregroundStyle(DS.Surface.level500)
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Wash.brand, in: .rect(cornerRadius: Self.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Self.radius)
                .strokeBorder(DS.Wash.brandStrong, lineWidth: 1)
        )
        .dsShadow(.soft)
        // 카드가 뒤집히면 내용도 반전되므로 되돌려 글자를 바로 세운다.
        .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
    }

    private var backHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Text(word.word)
                    .font(.system(size: 20, weight: .bold, design: .serif))
                    .foregroundStyle(DS.Surface.level900)

                Button(action: onSpeak) {
                    Image(systemName: "speaker.wave.2")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(DS.Surface.level400)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("발음 듣기")

                LearningStatusBadge(rate: word.learningRate)

                if word.isFlagged {
                    Image(systemName: "star.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(DS.Solid.warning)
                }

                Spacer(minLength: 0)
            }

            Text(word.primaryMeaning)
                .font(DS.Font.bodyLarge)
                .foregroundStyle(DS.BrandText.strong)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    /// 웹의 각 섹션: 작은 아이콘 + 대문자 eyebrow + 내용.
    private func section<Content: View>(
        eyebrow: String,
        symbol: String,
        symbolColor: Color,
        eyebrowColor: Color,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 5) {
                Image(systemName: symbol)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(symbolColor)
                Text(eyebrow.uppercased())
                    .font(DS.Font.caption)
                    .tracking(0.5)
                    .foregroundStyle(eyebrowColor)
            }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// 섹션 사이 구분선까지 포함한 형태.
    private func dividedSection<Content: View>(
        eyebrow: String,
        symbol: String,
        symbolColor: Color,
        eyebrowColor: Color,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Divider().overlay(DS.Wash.brandStrong).padding(.vertical, 12)
            section(
                eyebrow: eyebrow,
                symbol: symbol,
                symbolColor: symbolColor,
                eyebrowColor: eyebrowColor,
                content: content
            )
        }
    }
}

#if DEBUG
#Preview("단어 카드") {
    ScrollView {
        VStack(spacing: 16) {
            WordFlipCard(
                word: PreviewData.serendipity,
                folderName: "TOEFL",
                onToggleFlag: {},
                onSpeak: {}
            )
            ForEach(PreviewData.words.dropFirst()) { word in
                WordFlipCard(word: word, onToggleFlag: {}, onSpeak: {})
            }
        }
        .padding(16)
    }
    .background(DS.Surface.level50)
}
#endif
