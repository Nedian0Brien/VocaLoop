import SwiftUI

struct VocabularyListView: View {
    @Environment(AppState.self) private var appState
    @State private var isAddingWord = false

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                if let store = appState.vocabulary {
                    content(for: store)
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("단어장")
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("단어 추가", systemImage: "plus") { isAddingWord = true }
                        .tint(DS.BrandText.base)
                }
            }
            .sheet(isPresented: $isAddingWord) {
                AddWordView()
            }
            .navigationDestination(for: Word.self) { word in
                WordDetailView(word: word)
            }
        }
    }

    @ViewBuilder
    private func content(for store: VocabularyStore) -> some View {
        @Bindable var store = store

        Group {
            if store.isLoading && store.words.isEmpty {
                ProgressView("불러오는 중…")
                    .font(DS.Font.meta)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if store.words.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: 14) {
                        FolderFilterRow(store: store)
                            .padding(.bottom, 2)

                        if store.visibleWords.isEmpty {
                            noMatchState
                        } else {
                            ForEach(store.visibleWords) { word in
                                NavigationLink(value: word) {
                                    WordCard(word: word) {
                                        Task { await store.toggleFlag(word) }
                                    }
                                }
                                .buttonStyle(.plain)
                                .contextMenu {
                                    Button(
                                        word.isFlagged ? "즐겨찾기 해제" : "즐겨찾기",
                                        systemImage: word.isFlagged ? "star.slash" : "star"
                                    ) {
                                        Task { await store.toggleFlag(word) }
                                    }
                                    Button("삭제", systemImage: "trash", role: .destructive) {
                                        Task { await store.delete(word) }
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 4)
                    .padding(.bottom, 24)
                }
                .scrollEdgeEffectStyle(.soft, for: .top)
            }
        }
        .searchable(text: $store.searchText, prompt: "단어 또는 뜻 검색")
        .refreshable { await store.reload() }
        .overlay(alignment: .bottom) {
            if let message = store.errorMessage {
                ErrorBanner(message: message) { store.errorMessage = nil }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            DSCard(variant: .gradient, radius: DS.Radius.hero, padding: .xl) {
                VStack(alignment: .leading, spacing: 12) {
                    DSBadge(text: "Start here", tone: .onDark, style: .pill)
                    Text("첫 단어를 추가해 보세요")
                        .font(DS.Font.sectionTitle)
                        .dsTightTracking(24)
                    Text("단어만 입력하면 AI가 뜻·발음·예문·유의어를 채웁니다.")
                        .font(DS.Font.meta)
                        .foregroundStyle(.white.opacity(0.85))

                    Button("단어 추가") { isAddingWord = true }
                        .buttonStyle(.ds(.dark, size: .md))
                        .padding(.top, 4)
                }
            }
        }
        .padding(20)
    }

    private var noMatchState: some View {
        VStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(DS.Surface.level300)
            Text("조건에 맞는 단어가 없습니다")
                .font(DS.Font.meta)
                .foregroundStyle(DS.Surface.level500)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }
}

/// 전체 / 즐겨찾기 / 폴더 필터 칩.
private struct FolderFilterRow: View {
    let store: VocabularyStore

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                chip(for: .all, title: "전체", symbol: "square.grid.2x2")
                chip(for: .flagged, title: "즐겨찾기", symbol: "star")

                ForEach(store.folders) { folder in
                    chip(for: .folder(folder.id), title: folder.name, symbol: "folder")
                }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 2)
        }
        .scrollIndicators(.hidden)
    }

    private func chip(for selection: FolderSelection, title: String, symbol: String) -> some View {
        let isSelected = store.selection == selection

        return Button {
            store.selection = selection
        } label: {
            HStack(spacing: 6) {
                Image(systemName: symbol)
                    .font(.system(size: 11, weight: .black))
                Text(title)
                    .font(DS.Font.caption)
                Text("\(store.count(for: selection))")
                    .font(DS.Font.eyebrow)
                    .monospacedDigit()
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(
                        isSelected ? AnyShapeStyle(.white.opacity(0.25)) : AnyShapeStyle(DS.Surface.level200),
                        in: .capsule
                    )
            }
            .padding(.horizontal, 13)
            .frame(height: 34)
            .foregroundStyle(isSelected ? .white : DS.Surface.level600)
            .background(
                isSelected ? AnyShapeStyle(DS.Solid.brand) : AnyShapeStyle(DS.Surface.level0),
                in: .capsule
            )
            .overlay(
                Capsule().strokeBorder(
                    isSelected ? .clear : DS.Surface.level200,
                    lineWidth: 1
                )
            )
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.2), value: isSelected)
    }
}

/// 웹 `WordCard`의 앱 대응. 좌측 상태 바 + 단어 + 뜻 + 학습률 진행 바.
private struct WordCard: View {
    let word: Word
    let onToggleFlag: () -> Void

    var body: some View {
        DSCard(variant: .elevated, radius: DS.Radius.xl, padding: .none) {
            HStack(spacing: 0) {
                // 상태 색 띠 — 목록에서 학습 단계를 한눈에 구분한다.
                Rectangle()
                    .fill(word.status.solidTint)
                    .frame(width: 5)

                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top, spacing: 10) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(word.word)
                                .font(DS.Font.cardTitle)
                                .dsTightTracking(20)
                                .foregroundStyle(DS.Surface.level900)

                            Text(word.primaryMeaning)
                                .font(DS.Font.meta)
                                .foregroundStyle(DS.Surface.level500)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                        }

                        Spacer(minLength: 4)

                        Button(action: onToggleFlag) {
                            Image(systemName: word.isFlagged ? "star.fill" : "star")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(
                                    word.isFlagged ? DS.Solid.warning : DS.Surface.level300
                                )
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(word.isFlagged ? "즐겨찾기 해제" : "즐겨찾기")
                    }

                    HStack(spacing: 8) {
                        DSBadge(
                            text: word.status.label,
                            tone: word.status.badgeTone,
                            style: .pill,
                            systemImage: word.status.symbolName
                        )

                        if let pos = word.pos, !pos.isEmpty {
                            DSBadge(text: pos, tone: .neutral, style: .tag)
                        }

                        Spacer(minLength: 0)

                        Text("\(word.learningRate)%")
                            .font(DS.Font.caption)
                            .monospacedDigit()
                            .foregroundStyle(DS.Surface.level500)
                    }

                    ProgressBar(value: Double(word.learningRate) / 100, tint: word.status.solidTint)
                }
                .padding(16)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(word.word), \(word.primaryMeaning), 학습률 \(word.learningRate)퍼센트")
    }
}

/// 웹의 pill 진행 바. 시스템 ProgressView는 모서리·두께가 달라 직접 그린다.
struct ProgressBar: View {
    let value: Double
    var tint: Color = DS.Solid.brand
    var height: CGFloat = 6

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(DS.Surface.level200)
                Capsule()
                    .fill(tint)
                    .frame(width: max(0, min(1, value)) * proxy.size.width)
            }
        }
        .frame(height: height)
        .animation(.smooth(duration: 0.4), value: value)
        .accessibilityHidden(true)
    }
}

/// 실패를 조용히 삼키지 않고 화면 아래에 잠깐 띄운다.
struct ErrorBanner: View {
    let message: String
    let dismiss: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 13, weight: .bold))
            Text(message).font(DS.Font.caption)
            Spacer(minLength: 4)
            Button("닫기", systemImage: "xmark", action: dismiss)
                .labelStyle(.iconOnly)
                .font(.system(size: 12, weight: .bold))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .foregroundStyle(DS.BrandText.danger)
        .background(DS.Wash.danger, in: .rect(cornerRadius: DS.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.md)
                .strokeBorder(DS.Solid.danger.opacity(0.3), lineWidth: 1)
        )
        .dsShadow(.card)
        .padding(.horizontal, 16)
        .padding(.bottom, 10)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}
