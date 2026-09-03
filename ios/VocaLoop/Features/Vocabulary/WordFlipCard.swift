import SwiftUI

/// 웹 `src/components/WordCard.jsx`의 이식.
///
/// 아래 수치는 눈대중이 아니라 실제 웹을 375pt 뷰포트로 렌더링해
/// `getComputedStyle`/`getBoundingClientRect`로 측정한 값이다.
/// 값을 바꾸려면 웹을 먼저 바꾸고 다시 측정할 것.
/// 단어에 쓰는 서체도 웹과 같은 Merriweather를 번들해 쓴다 (`SerifFont.swift`).
struct WordFlipCard: View {
    let word: Word
    var folderName: String?
    var onToggleFlag: () -> Void
    var onSpeak: () -> Void
    /// 플래시카드 모드는 뒤집힘을 알아야 복습 버튼을 띄울 수 있다.
    var onFlipChange: ((Bool) -> Void)?

    @State private var isFlipped = false
    /// 뒷면의 실제 높이. 카드가 늘어나는 동안 아래 카드들이 함께 밀리도록
    /// 미리 재 둔다. 웹도 같은 값을 ref로 재서 컨테이너 높이에 넣는다.
    @State private var backHeight: CGFloat = Metrics.frontHeight

    // MARK: - 측정값

    private enum Metrics {
        /// 카드 343×192, rounded-xl은 실제로 12px로 계산된다.
        static let frontHeight: CGFloat = 192
        static let radius: CGFloat = 12
        static let padding: CGFloat = 24
        /// 폴더 배지·플래그 버튼의 모서리 여백 (top-3 left-3 / right-3)
        static let cornerInset: CGFloat = 13
        static let flagSize: CGFloat = 32
        /// 플래그 버튼 rounded-md = 16px → 32pt에서는 원이 된다.
        static let flagRadius: CGFloat = 16

        static let posSize: CGFloat = 12
        static let posTracking: CGFloat = 0.6
        static let wordSize: CGFloat = 30
        static let wordLineHeight: CGFloat = 36
        static let pronSize: CGFloat = 16
        static let pronLineHeight: CGFloat = 24
        /// pos → word, word → pron 사이 간격 (mb-2)
        static let stackGap: CGFloat = 8
        /// 발음 아래 여백 (mb-3). 세로 가운데 정렬 계산에 포함된다.
        static let pronBottomGap: CGFloat = 12
        /// 도넛 아래쪽 위치 (측정: 카드 하단에서 19.5)
        static let donutBottom: CGFloat = 19.5
        static let donutSize: CGFloat = 30
        static let donutLineWidth: CGFloat = 3

        // 뒷면
        static let backWordSize: CGFloat = 20
        static let backWordLineHeight: CGFloat = 28
        static let meaningSize: CGFloat = 18
        static let meaningLineHeight: CGFloat = 22.5
        /// 헤더 아래 구분선까지 여백(pb-3) + 구분선 뒤 여백(mb-4)
        static let headerBottomPadding: CGFloat = 12
        static let headerBottomMargin: CGFloat = 16
        /// 섹션 사이 간격 (space-y-4)
        static let sectionGap: CGFloat = 16
        /// 구분선 아래 여백 (pt-3)
        static let dividerGap: CGFloat = 12
        static let eyebrowSize: CGFloat = 12
        static let eyebrowTracking: CGFloat = 0.3
        static let eyebrowIconSize: CGFloat = 14
        /// 아이콘과 eyebrow 사이 (gap-1.5), eyebrow와 본문 사이 (mb-1)
        static let eyebrowIconGap: CGFloat = 6
        static let eyebrowBottomGap: CGFloat = 4

        /// 뒤집기 곡선. 웹 `.card-inner`의 `transform 0.7s var(--ease-spring)`와
        /// 같은 값이다 (`--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)`, index.css).
        /// 웹은 높이에도 같은 곡선·같은 길이를 걸어 회전과 함께 움직인다.
        static let flipCurve = Animation.timingCurve(0.16, 1, 0.3, 1, duration: 0.7)
    }

    var body: some View {
        FlipFaces(
            angle: isFlipped ? 180 : 0,
            frontHeight: Metrics.frontHeight,
            backHeight: backHeight
        ) {
            front
        } back: {
            back
        }
        // 높이를 재는 사본은 애니메이션 밖에 둔다. 카드 안에 넣으면 높이가
        // 바뀔 때마다 사본까지 다시 재느라 첫 프레임이 밀린다.
        .background(alignment: .top) { backHeightProbe.frame(height: 0) }
        .contentShape(.rect(cornerRadius: Metrics.radius))
        .onTapGesture { flip() }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isButton)
        .accessibilityHint("두 번 탭하면 뒤집힙니다")
        // 탭 제스처만으로는 보조 기술이 카드를 뒤집을 수 없다.
        .accessibilityAction { flip() }
    }

    private func flip() {
        withAnimation(Metrics.flipCurve) {
            isFlipped.toggle()
        }
        onFlipChange?(isFlipped)
    }

    // MARK: - Front

    private var front: some View {
        ZStack {
            // 웹은 pos/word/pron 묶음을 패딩 안쪽에서 세로 가운데 정렬한다.
            // (mb-3 포함 104pt 묶음이 144pt 안에 들어가 위쪽 44pt에서 시작)
            VStack(spacing: 0) {
                if let pos = word.pos, !pos.isEmpty {
                    Text(pos.uppercased())
                        .font(.system(size: Metrics.posSize, weight: .black))
                        .tracking(Metrics.posTracking)
                        .foregroundStyle(DS.BrandText.base)
                        .padding(.bottom, Metrics.stackGap)
                }

                Text(word.word)
                    .font(.merriweather(size: Metrics.wordSize, weight: .bold))
                    .lineSpacing(Metrics.wordLineHeight - Metrics.wordSize)
                    .foregroundStyle(DS.Surface.level900)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .padding(.bottom, Metrics.stackGap)

                Group {
                    if word.hasPronunciation {
                        Button(action: onSpeak) {
                            Text(word.pronunciation ?? "")
                                .font(.merriweatherItalic(size: Metrics.pronSize))
                                .foregroundStyle(DS.Surface.level500)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(word.word) 발음 듣기")
                    } else {
                        // 웹은 발음이 없으면 빈 자리로 두지만, 앱에서는 뜻이라도 보이는 편이 낫다.
                        Text(word.primaryMeaning)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(DS.Surface.level500)
                            .lineLimit(1)
                    }
                }
                .frame(height: Metrics.pronLineHeight)
                .padding(.bottom, Metrics.pronBottomGap)
            }
            .padding(Metrics.padding)
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // 도넛은 흐름에서 빠져 카드 하단에 고정된다.
            VStack {
                Spacer(minLength: 0)
                LearningRateDonut(
                    rate: word.learningRate,
                    size: Metrics.donutSize,
                    lineWidth: Metrics.donutLineWidth
                )
                .padding(.bottom, Metrics.donutBottom)
            }

            // 폴더 배지 / 플래그 버튼
            VStack {
                HStack(alignment: .top) {
                    if let folderName {
                        folderBadge(folderName)
                    }
                    Spacer(minLength: 0)
                    flagButton
                }
                Spacer(minLength: 0)
            }
            .padding(Metrics.cornerInset)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DS.Surface.level0, in: .rect(cornerRadius: Metrics.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.radius)
                .strokeBorder(DS.Surface.level200, lineWidth: 1)
        )
        .dsShadow(.soft)
    }

    private func folderBadge(_ name: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "folder")
                .font(.system(size: 10, weight: .black))
            Text(name)
                .font(.system(size: 10, weight: .black))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 2)
        .background(DS.Wash.brandStrong, in: .capsule)
        .foregroundStyle(DS.BrandText.base)
    }

    private var flagButton: some View {
        Button(action: onToggleFlag) {
            Image(systemName: "star")
                .symbolVariant(word.isFlagged ? .fill : .none)
                .font(.system(size: 16, weight: .regular))
                .frame(width: Metrics.flagSize, height: Metrics.flagSize)
                .background(
                    word.isFlagged ? DS.Wash.warning : DS.Surface.level0,
                    in: .rect(cornerRadius: Metrics.flagRadius)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: Metrics.flagRadius).strokeBorder(
                        // 측정: 플래그 상태 border warning-300(#FCD34D), 아니면 surface-200
                        word.isFlagged ? Color(hex: 0xFCD34D) : DS.Surface.level200,
                        lineWidth: 1
                    )
                )
                .foregroundStyle(
                    word.isFlagged ? DS.Solid.warning : DS.Surface.level300
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(word.isFlagged ? "단어 플래그 해제" : "단어 플래그 추가")
    }

    // MARK: - Back

    /// 뒷면에 보여줄 내용이 하나라도 있는지.
    private var hasBackContent: Bool {
        !word.definitions.isEmpty
            || !(word.nuance ?? "").isEmpty
            || !word.synonyms.isEmpty
            || !word.examples.isEmpty
    }

    /// 뒷면 내용. 자기 높이를 그대로 가지므로 높이를 재는 데도 쓴다.
    private var backContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            backHeader
                .padding(.bottom, Metrics.headerBottomPadding)

            Rectangle()
                .fill(DS.Wash.brandStrong)
                .frame(height: 1)
                .padding(.bottom, Metrics.headerBottomMargin)

            if hasBackContent {
                backSections
            } else {
                Text("아직 상세 정보가 없습니다. 단어를 다시 분석해 보세요.")
                    .font(.system(size: Metrics.eyebrowSize))
                    .foregroundStyle(DS.Surface.level500)
            }
        }
        .padding(Metrics.padding)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// 그리지 않고 높이만 재는 사본. 첫 뒤집기부터 제 높이를 알아야
    /// 카드가 늘어나는 동안 아래 카드들이 같이 움직인다.
    private var backHeightProbe: some View {
        backContent
            .fixedSize(horizontal: false, vertical: true)
            .hidden()
            .accessibilityHidden(true)
            .onGeometryChange(for: CGFloat.self) { proxy in
                proxy.size.height
            } action: { height in
                backHeight = height
            }
    }

    private var back: some View {
        backContent
            // 늘어나는 도중에는 내용이 카드 밖으로 비어져 나오므로 잘라낸다.
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .clipShape(.rect(cornerRadius: Metrics.radius))
            // wash는 바탕에 얹는 틴트다. 다크에서는 알파 0.12라 이것만 깔면
            // 카드가 비쳐 보인다. 앞면과 같은 카드 면을 먼저 깔고 그 위에 얹는다.
            .background(DS.Wash.brand, in: .rect(cornerRadius: Metrics.radius))
            .background(DS.Surface.level0, in: .rect(cornerRadius: Metrics.radius))
            .overlay(
                RoundedRectangle(cornerRadius: Metrics.radius)
                    .strokeBorder(DS.Wash.brandStrong, lineWidth: 1)
            )
            .dsShadow(.soft)
    }

    private var backHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Text(word.word)
                    .font(.merriweather(size: Metrics.backWordSize, weight: .bold))
                    .lineSpacing(Metrics.backWordLineHeight - Metrics.backWordSize)
                    .foregroundStyle(DS.Surface.level900)

                Button(action: onSpeak) {
                    Image(systemName: "speaker.wave.2")
                        .font(.system(size: Metrics.eyebrowIconSize, weight: .regular))
                        .foregroundStyle(DS.Surface.level400)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("발음 듣기")

                LearningStatusBadge(rate: word.learningRate)

                if word.isFlagged {
                    Image(systemName: "star.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(DS.Solid.warning)
                }

                Spacer(minLength: 0)
            }

            Text(word.primaryMeaning)
                .font(.system(size: Metrics.meaningSize, weight: .bold))
                .lineSpacing(Metrics.meaningLineHeight - Metrics.meaningSize)
                .foregroundStyle(DS.BrandText.strong)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private var backSections: some View {
        VStack(alignment: .leading, spacing: Metrics.sectionGap) {
            if let definition = word.definitions.first {
                section(
                    eyebrow: "Definition",
                    symbol: "doc.text",
                    // 측정: FileText 아이콘 brand-400, eyebrow surface-500
                    symbolColor: Color(hex: 0x60A5FA),
                    eyebrowColor: DS.Surface.level500,
                    divided: false
                ) {
                    VStack(alignment: .leading, spacing: 2) {
                        bodyText(definition, size: 14, lineHeight: 22.75, color: DS.Surface.level800)
                        if let ko = word.definitionsKo.first {
                            bodyText(ko, size: 12, lineHeight: 16, color: DS.Surface.level500)
                        }
                    }
                }
            }

            if let nuance = word.nuance, !nuance.isEmpty {
                section(
                    eyebrow: "Nuance",
                    symbol: "brain",
                    symbolColor: DS.Solid.accent500,
                    eyebrowColor: DS.BrandText.accent,
                    divided: true
                ) {
                    bodyText(nuance, size: 12, lineHeight: 19.5, color: DS.Surface.level700)
                }
            }

            if !word.synonyms.isEmpty {
                section(
                    eyebrow: "Synonyms",
                    symbol: "arrow.left.arrow.right",
                    symbolColor: DS.Solid.warning,
                    eyebrowColor: DS.BrandText.warning,
                    divided: true
                ) {
                    bodyText(
                        word.synonyms.joined(separator: ", "),
                        size: 14,
                        lineHeight: 22.75,
                        color: DS.Surface.level800,
                        italic: true
                    )
                }
            }

            if !word.examples.isEmpty {
                section(
                    eyebrow: "Examples",
                    symbol: "quote.opening",
                    symbolColor: Color(hex: 0x60A5FA),
                    eyebrowColor: DS.Surface.level500,
                    divided: true
                ) {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(word.examples.enumerated()), id: \.offset) { _, example in
                            VStack(alignment: .leading, spacing: 2) {
                                bodyText(
                                    "\"\(example.en)\"",
                                    size: 14,
                                    lineHeight: 19.25,
                                    color: DS.BrandText.deep,
                                    weight: .medium
                                )
                                bodyText(example.ko, size: 12, lineHeight: 16, color: DS.Surface.level500)
                            }
                        }
                    }
                }
            }
        }
    }

    private func bodyText(
        _ text: String,
        size: CGFloat,
        lineHeight: CGFloat,
        color: Color,
        weight: Font.Weight = .regular,
        italic: Bool = false
    ) -> some View {
        Text(text)
            .font(.system(size: size, weight: weight))
            .italic(italic)
            .lineSpacing(lineHeight - size)
            .foregroundStyle(color)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// 웹의 각 섹션: (구분선) + 작은 아이콘 + eyebrow + 내용.
    private func section<Content: View>(
        eyebrow: String,
        symbol: String,
        symbolColor: Color,
        eyebrowColor: Color,
        divided: Bool,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if divided {
                Rectangle()
                    .fill(DS.Wash.brandStrong)
                    .frame(height: 1)
                    .padding(.bottom, Metrics.dividerGap)
            }

            HStack(spacing: Metrics.eyebrowIconGap) {
                Image(systemName: symbol)
                    .font(.system(size: Metrics.eyebrowIconSize, weight: .regular))
                    .foregroundStyle(symbolColor)
                Text(eyebrow.uppercased())
                    .font(.system(size: Metrics.eyebrowSize, weight: .bold))
                    .tracking(Metrics.eyebrowTracking)
                    .foregroundStyle(eyebrowColor)
            }
            .padding(.bottom, Metrics.eyebrowBottomGap)

            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// 앞뒤를 3D로 뒤집는다. 각도를 직접 애니메이션해서 90도를 넘는 순간 면이 바뀐다.
///
/// `if isFlipped { back } else { front }`에 애니메이션을 걸면 SwiftUI가 두 면을
/// 겹쳐 두고 한쪽을 서서히 지운다. 그 구간에서는 양쪽 다 반투명이라 카드 너머
/// 배경이 비쳐 보인다. 각도로 잘라야 그런 구간이 아예 생기지 않는다.
///
/// 앞뒤 높이가 다르므로 두 면을 동시에 두지 않는다. 동시에 두면 카드가 늘 더 큰
/// 쪽 높이가 된다.
private struct FlipFaces<Front: View, Back: View>: View, Animatable {
    var angle: Double
    /// 앞뒤 높이가 다르다. 회전 각도에 맞춰 그 사이를 이어 준다.
    var frontHeight: CGFloat
    var backHeight: CGFloat
    @ViewBuilder let front: () -> Front
    @ViewBuilder let back: () -> Back

    nonisolated var animatableData: Double {
        get { angle }
        set { angle = newValue }
    }

    var body: some View {
        ZStack {
            if angle < 90 {
                front().rotation3DEffect(.degrees(angle), axis: (x: 0, y: 1, z: 0))
            } else {
                // 뒷면은 반 바퀴 돌아온 상태에서 시작해야 글자가 바로 선다.
                back().rotation3DEffect(.degrees(angle - 180), axis: (x: 0, y: 1, z: 0))
            }
        }
        // 높이를 각도에서 직접 계산한다. 바깥에 `.frame`을 걸어 두면 상태가
        // 바뀌는 순간 한 번에 튀어서, 아래 카드들이 미끄러지지 않고 순간이동한다.
        .frame(height: height)
        // 면이 바뀌는 순간은 즉시여야 한다. 페이드가 끼면 다시 비친다.
        .transaction { $0.animation = nil }
    }

    /// 웹은 바깥 컨테이너 높이를 회전과 같은 곡선·같은 길이로 바꾼다.
    /// 회전 진행도를 그대로 쓰면 두 값이 웹처럼 맞물려 움직인다.
    private var progress: CGFloat {
        min(max(CGFloat(angle) / 180, 0), 1)
    }

    private var height: CGFloat {
        frontHeight + (backHeight - frontHeight) * progress
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
