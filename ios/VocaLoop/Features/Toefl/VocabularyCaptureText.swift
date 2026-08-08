import SwiftUI

/// 웹 `VocabularyCaptureText`의 이식.
///
/// 지문의 영어 단어를 눌러 그 자리에서 단어장에 넣는다. 읽다가 모르는 단어를
/// 만났을 때 화면을 떠나지 않아도 되게 하는 것이 요점이다.
///
/// 본문은 웹의 `whitespace-pre-line text-base leading-8 font-semibold text-surface-700`을
/// 그대로 따른다. 줄바꿈은 살리고, 연속된 공백은 한 칸으로 합치고, 줄 높이는 32다.
struct VocabularyCaptureText: View {
    let text: String
    /// 저장 문맥으로 함께 넣을 지문. 보통 `text`와 같다.
    var contextText: String?
    /// 어디서 저장했는지 단어에 남길 이름.
    let sourceLabel: String
    /// 정답을 확인한 뒤에만 "뜻 설명"을 연다. 웹 `canExplain`.
    var canExplain: Bool = false

    @Environment(AppState.self) private var appState

    /// 열려 있는 단어. 같은 단어가 여러 번 나오므로 위치까지 포함한 키를 쓴다.
    @State private var activeToken: Int?
    @State private var underlined: Set<String> = []
    @State private var saving: Set<String> = []
    @State private var saved: Set<String> = []
    @State private var explaining: Set<String> = []
    @State private var explanations: [String: WordAnalysis] = [:]
    @State private var failed: [String: String] = [:]

    /// 본문 글자 크기와 줄 높이. 웹 `text-base leading-8`.
    private let fontSize: CGFloat = 16
    private let lineHeight: CGFloat = 32

    private var lines: [VocabularyCapture.Line] { VocabularyCapture.lines(text) }

    /// 이미 단어장에 있는 단어. 중복 저장을 막고 액션에서 알려준다.
    private var existingKeys: Set<String> {
        Set((appState.vocabulary?.words ?? []).map { VocabularyCapture.normalize($0.word) })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(lines) { line in
                if line.isBlank {
                    Color.clear.frame(height: lineHeight)
                } else {
                    FlowLayout(spacing: spaceWidth, lineSpacing: 0) {
                        ForEach(line.chunks) { chunk in
                            chunkView(chunk)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(.rect)
        // 웹은 바깥을 누르면 닫힌다.
        .onTapGesture { close() }
        .overlayPreferenceValue(ActiveWordAnchor.self) { anchor in
            GeometryReader { proxy in
                if let anchor, let token = activeWord {
                    actions(for: token, at: proxy[anchor])
                }
            }
        }
    }

    // MARK: - 본문

    /// 공백 없이 붙어 있는 한 덩어리. 여기서는 줄을 바꾸지 않는다.
    private func chunkView(_ chunk: VocabularyCapture.Chunk) -> some View {
        HStack(spacing: 0) {
            ForEach(chunk.tokens) { token in
                switch token {
                case let .text(value, _):
                    Text(value)
                        .font(.system(size: fontSize, weight: .semibold))
                        .foregroundStyle(DS.Surface.level700)
                case let .word(value, key, offset):
                    wordButton(value: value, key: key, offset: offset)
                }
            }
        }
        .frame(height: lineHeight)
    }

    private func wordButton(value: String, key: String, offset: Int) -> some View {
        let isActive = activeToken == offset

        return Button {
            withAnimation(.smooth(duration: 0.17)) {
                activeToken = isActive ? nil : offset
            }
        } label: {
            Text(value)
                .font(.system(size: fontSize, weight: .semibold))
                .foregroundStyle(DS.Surface.level700)
                .underline(underlined.contains(key), color: DS.Solid.brand)
                .padding(.horizontal, 2)
                .background(
                    isActive ? DS.Wash.brandStrong : .clear,
                    in: .rect(cornerRadius: DS.Radius.xs)
                )
                .overlay {
                    if isActive {
                        RoundedRectangle(cornerRadius: DS.Radius.xs)
                            .strokeBorder(DS.Wash.brandStrong, lineWidth: 1)
                    }
                }
                // 웹은 `px-0.5 -mx-0.5`라 강조 배경만 넓고 글자 자리는 그대로다.
                .padding(.horizontal, -2)
                .frame(height: lineHeight)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(key) 단어 액션 열기")
        .anchorPreference(key: ActiveWordAnchor.self, value: .bounds) { bounds in
            isActive ? bounds : nil
        }
    }

    // MARK: - 단어 액션

    private var activeWord: (value: String, key: String)? {
        guard let activeToken else { return nil }
        for line in lines {
            for chunk in line.chunks {
                for token in chunk.tokens {
                    if case let .word(value, key, offset) = token, offset == activeToken {
                        return (value, key)
                    }
                }
            }
        }
        return nil
    }

    /// 웹은 단어 오른쪽에 원형 버튼을 부채꼴로 띄운다. 그 자리 값을 그대로 쓴다.
    private func actions(for word: (value: String, key: String), at rect: CGRect) -> some View {
        let items = actionItems(for: word)
        let size = RadialWordActions.containerSize(count: items.count)

        return RadialWordActions(items: items, error: failed[word.key])
            .frame(width: size.width, height: size.height, alignment: .topLeading)
            .position(
                x: rect.maxX + 4 + size.width / 2,
                y: rect.midY
            )
    }

    private func actionItems(for word: (value: String, key: String)) -> [RadialWordActions.Item] {
        let key = word.key
        let isSaved = saved.contains(key) || existingKeys.contains(key)
        let isSaving = saving.contains(key)
        let isUnderlined = underlined.contains(key)

        var items: [RadialWordActions.Item] = [
            RadialWordActions.Item(
                label: isSaving ? "저장 중" : isSaved ? "저장됨" : "단어장에 저장",
                symbol: isSaved ? "checkmark" : "square.and.arrow.down",
                isPrimary: !isSaved,
                isDisabled: isSaving || isSaved,
                isBusy: isSaving,
                action: { Task { await save(value: word.value, key: key) } }
            ),
            RadialWordActions.Item(
                label: isUnderlined ? "밑줄 해제" : "밑줄",
                symbol: "underline",
                isActive: isUnderlined,
                action: { toggleUnderline(key) }
            ),
        ]

        if canExplain {
            let isExplaining = explaining.contains(key)
            items.append(
                RadialWordActions.Item(
                    label: isExplaining ? "불러오는 중" : "뜻 설명",
                    symbol: "questionmark.circle",
                    isDisabled: isExplaining,
                    isBusy: isExplaining,
                    explanation: explanations[key],
                    action: { Task { await explain(key) } }
                )
            )
        }

        return items
    }

    // MARK: - 동작

    private func close() {
        withAnimation(.smooth(duration: 0.17)) { activeToken = nil }
    }

    private func toggleUnderline(_ key: String) {
        if underlined.contains(key) { underlined.remove(key) } else { underlined.insert(key) }
    }

    /// AI로 뜻·예문을 채운 뒤 단어장에 넣는다.
    private func save(value: String, key: String) async {
        guard !saving.contains(key), let store = appState.vocabulary else { return }
        guard !saved.contains(key), !existingKeys.contains(key) else {
            saved.insert(key)
            return
        }

        saving.insert(key)
        failed[key] = nil
        defer { saving.remove(key) }

        let word = VocabularyCapture.normalize(value)
        guard !word.isEmpty else { return }

        do {
            // 뜻 없이 저장하면 퀴즈에 나오지 못하는 반쪽 단어가 된다.
            let analysis = try? await WordAnalysisService(api: appState.api).analyze(word)

            var examples = analysis?.examples ?? []
            if let context = VocabularyCapture.contextExample(from: contextText ?? text),
               !examples.contains(where: { $0.en == context.en }) {
                examples.insert(context, at: 0)
            }

            let note = VocabularyCapture.sourceNote(sourceLabel)
            let nuance = [analysis?.nuance, note]
                .compactMap { $0 }
                .filter { !$0.isEmpty }
                .joined(separator: "\n")

            let endpoint = try Endpoint.json(
                "/api/words",
                method: .post,
                body: CapturedWordPayload(
                    word: analysis?.word.isEmpty == false ? analysis!.word : word,
                    meaningKo: analysis?.meaningKo,
                    pronunciation: analysis?.pronunciation,
                    pos: analysis?.pos,
                    definitions: analysis?.definitions ?? [],
                    definitionsKo: analysis?.definitionsKo ?? [],
                    examples: examples,
                    synonyms: analysis?.synonyms ?? [],
                    nuance: nuance
                ),
                timeout: Endpoint.aiTimeout
            )
            let created = try await appState.api.send(endpoint, as: Word.self)
            store.insert(created)
            saved.insert(key)
        } catch {
            failed[key] = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// 저장하지 않고 뜻만 본다. 이미 단어장에 있으면 그것을 그대로 보여준다.
    private func explain(_ key: String) async {
        guard explanations[key] == nil, !explaining.contains(key) else { return }

        if let existing = (appState.vocabulary?.words ?? [])
            .first(where: { VocabularyCapture.normalize($0.word) == key }) {
            explanations[key] = WordAnalysis(existing)
            return
        }

        explaining.insert(key)
        failed[key] = nil
        defer { explaining.remove(key) }

        do {
            explanations[key] = try await WordAnalysisService(api: appState.api).analyze(key)
        } catch {
            failed[key] = (error as? APIError)?.errorDescription ?? "뜻 설명을 불러오지 못했습니다."
        }
    }

    /// 한 칸 공백의 너비. 덩어리 사이 간격으로 쓴다.
    private var spaceWidth: CGFloat {
        (" " as NSString).size(
            withAttributes: [.font: UIFont.systemFont(ofSize: fontSize, weight: .semibold)]
        ).width
    }
}

// MARK: - 열린 단어 위치

/// 열려 있는 단어의 화면 위치. 액션을 본문 위에 겹쳐 그리기 위해 올려 보낸다.
private struct ActiveWordAnchor: PreferenceKey {
    static let defaultValue: Anchor<CGRect>? = nil

    static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) {
        value = nextValue() ?? value
    }
}

// MARK: - 부채꼴 액션

/// 웹 `VocabularyWordBubble`의 이식. 단어 오른쪽에 원형 버튼이 부채꼴로 펼쳐진다.
private struct RadialWordActions: View {
    struct Item: Identifiable {
        let label: String
        let symbol: String
        var isPrimary = false
        var isActive = false
        var isDisabled = false
        var isBusy = false
        var explanation: WordAnalysis?
        let action: () -> Void

        var id: String { label }
    }

    let items: [Item]
    var error: String?

    /// 웹 `h-24 w-36` / `h-32 w-40`.
    static func containerSize(count: Int) -> CGSize {
        count <= 2 ? CGSize(width: 144, height: 96) : CGSize(width: 160, height: 128)
    }

    /// 웹 `actionPositions`.
    private static let twoUp: [CGPoint] = [CGPoint(x: 20, y: -34), CGPoint(x: 50, y: 18)]
    private static let threeUp: [CGPoint] = [
        CGPoint(x: 18, y: -48), CGPoint(x: 62, y: -2), CGPoint(x: 18, y: 44),
    ]

    private var positions: [CGPoint] { items.count <= 2 ? Self.twoUp : Self.threeUp }

    var body: some View {
        ZStack(alignment: .topLeading) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                button(item)
                    .offset(
                        x: positions[min(index, positions.count - 1)].x,
                        y: positions[min(index, positions.count - 1)].y
                    )
            }

            if let error {
                Text(error)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(DS.BrandText.danger)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(width: 224, alignment: .leading)
                    .offset(y: 72)
            }

            if let explanation = items.compactMap(\.explanation).first {
                explanationCard(explanation)
                    .offset(y: 96)
            }
        }
        .transition(.opacity.combined(with: .scale(scale: 0.85, anchor: .leading)))
    }

    /// 웹 `RadialActionButton`. iOS에는 hover가 없어 원형 아이콘 버튼으로만 둔다.
    private func button(_ item: Item) -> some View {
        Button(action: item.action) {
            Group {
                if item.isBusy {
                    ProgressView()
                        .controlSize(.mini)
                        .tint(item.isPrimary ? .white : DS.Surface.level700)
                } else {
                    Image(systemName: item.symbol)
                        .font(.system(size: 18, weight: .bold))
                }
            }
            .frame(width: 40, height: 40)
            .foregroundStyle(item.isPrimary || item.isActive ? .white : DS.Surface.level700)
            .background(background(for: item), in: .circle)
            .overlay(Circle().strokeBorder(border(for: item), lineWidth: 1))
            .dsShadow(.soft)
        }
        .buttonStyle(.plain)
        // `.disabled`는 SwiftUI가 알아서 더 흐리게 만들어 웹(`disabled:opacity-70`)보다
        // 훨씬 옅어진다. 누름만 막고 흐리기는 직접 준다.
        .allowsHitTesting(!item.isDisabled)
        .opacity(item.isDisabled ? 0.7 : 1)
        .accessibilityLabel(item.label)
    }

    private func background(for item: Item) -> Color {
        if item.isPrimary { return DS.Solid.brand }
        if item.isActive { return DS.Surface.level900 }
        return DS.Surface.level0
    }

    private func border(for item: Item) -> Color {
        if item.isPrimary { return DS.Solid.brand }
        if item.isActive { return DS.Surface.level900 }
        return DS.Wash.brandStrong
    }

    private func explanationCard(_ explanation: WordAnalysis) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            if let meaning = explanation.meaningKo, !meaning.isEmpty {
                Text(meaning)
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(DS.Surface.level900)
            }
            if let definition = explanation.definitions.first {
                Text(definition)
                    .font(.system(size: 14, weight: .semibold))
                    .lineSpacing(5)
                    .foregroundStyle(DS.Surface.level600)
            }
            if let example = explanation.examples.first?.en, !example.isEmpty {
                Text(example)
                    .font(.system(size: 12, weight: .semibold))
                    .lineSpacing(4)
                    .foregroundStyle(DS.Surface.level500)
                    .padding(.top, 4)
            }
        }
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
        .padding(12)
        .frame(width: 224, alignment: .leading)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.md)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
        .dsShadow(.soft)
    }
}

extension WordAnalysis {
    /// 웹 `handleExplainVocabularyWord`는 이미 단어장에 있으면 그 단어를 그대로 돌려준다.
    init(_ word: Word) {
        self.word = word.word
        meaningKo = word.meaningKo
        pronunciation = word.pronunciation
        pos = word.pos
        definitions = word.definitions
        definitionsKo = word.definitionsKo
        examples = word.examples
        synonyms = word.synonyms
        nuance = word.nuance
    }
}

/// 생성 요청 본문. `Word`를 그대로 보내면 서버가 받지 않는 id까지 섞여 나간다.
private struct CapturedWordPayload: Encodable {
    var word: String
    var meaningKo: String?
    var pronunciation: String?
    var pos: String?
    var definitions: [String]
    var definitionsKo: [String]
    var examples: [WordExample]
    var synonyms: [String]
    var nuance: String
    var folderIds: [Int] = []
}
