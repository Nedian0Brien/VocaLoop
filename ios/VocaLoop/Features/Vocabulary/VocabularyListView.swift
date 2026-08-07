import SwiftUI

struct VocabularyListView: View {
    @Environment(AppState.self) private var appState
    @State private var isAddingWord = false
    /// 카드 뒤집기로 대부분 볼 수 있지만, 학습 기록까지 보려면 상세를 연다.
    @State private var selectedWord: Word?

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
            .sheet(item: $selectedWord) { word in
                NavigationStack {
                    WordDetailView(word: word)
                }
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
                    LazyVStack(spacing: 16, pinnedViews: []) {
                        FolderFilterRow(store: store)

                        if store.visibleWords.isEmpty {
                            noMatchState
                        } else {
                            // 웹은 학습 상태별로 묶어 보여준다 (어려워요 → 학습 중 → 외웠어요).
                            ForEach(LearningStatus.allCases, id: \.self) { status in
                                let group = store.visibleWords.filter { $0.learningStatus == status }
                                if !group.isEmpty {
                                    statusGroup(status, words: group, store: store)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 4)
                    .padding(.bottom, 28)
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

    private func statusGroup(
        _ status: LearningStatus,
        words: [Word],
        store: VocabularyStore
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // 웹의 그룹 헤더: 색 점 + 대문자 black 라벨 + 개수
            HStack(spacing: 8) {
                Circle()
                    .fill(status.dotColor)
                    .frame(width: 10, height: 10)
                Text(status.label.uppercased())
                    .font(.system(size: 14, weight: .black))
                    .tracking(0.7)
                    .foregroundStyle(status.textColor)
                Text("\(words.count)개")
                    .font(DS.Font.caption)
                    .foregroundStyle(DS.Surface.level400)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 4)

            ForEach(words) { word in
                WordFlipCard(
                    word: word,
                    folderName: word.folderIds.first.flatMap { store.folder(withID: $0)?.name },
                    onToggleFlag: { Task { await store.toggleFlag(word) } },
                    onSpeak: { SpeechSynthesizer.shared.speak(word.word) }
                )
                .contextMenu {
                    Button("상세 보기", systemImage: "info.circle") { selectedWord = word }
                    Button("삭제", systemImage: "trash", role: .destructive) {
                        Task { await store.delete(word) }
                    }
                }
            }
        }
    }

    private var emptyState: some View {
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
                        isSelected
                            ? AnyShapeStyle(.white.opacity(0.25))
                            : AnyShapeStyle(DS.Surface.level200),
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
                Capsule().strokeBorder(isSelected ? .clear : DS.Surface.level200, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.2), value: isSelected)
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
