import SwiftUI

struct VocabularyListView: View {
    @Environment(AppState.self) private var appState
    @State private var isAddingWord = false
    @State private var isManagingFolders = false
    /// 카드 뒤집기로 대부분 볼 수 있지만, 학습 기록까지 보려면 상세를 연다.
    @State private var selectedWord: Word?
    /// 폴더 이동 대상 단어.
    @State private var wordToMove: Word?

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
                ToolbarItem(placement: .topBarLeading) {
                    Button("폴더", systemImage: "folder") { isManagingFolders = true }
                        .tint(DS.BrandText.base)
                }
                if let store = appState.vocabulary {
                    ToolbarItem(placement: .topBarTrailing) {
                        sortMenu(for: store)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("단어 추가", systemImage: "plus") { isAddingWord = true }
                        .tint(DS.BrandText.base)
                }
            }
            .sheet(isPresented: $isAddingWord) {
                AddWordView()
            }
            .sheet(isPresented: $isManagingFolders) {
                if let store = appState.vocabulary {
                    FolderListView(store: store)
                }
            }
            .sheet(item: $selectedWord) { word in
                NavigationStack {
                    WordDetailView(word: word)
                }
            }
            .sheet(item: $wordToMove) { word in
                if let store = appState.vocabulary {
                    FolderPickerView(word: word, store: store)
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
                        } else if store.sortMode == .statusGroup {
                            // 웹은 이 모드에서만 학습 상태로 묶는다 (어려워요 → 학습 중 → 외웠어요).
                            ForEach(LearningStatus.allCases, id: \.self) { status in
                                let group = store.visibleWords.filter { $0.learningStatus == status }
                                if !group.isEmpty {
                                    statusGroup(status, words: group, store: store)
                                }
                            }
                        } else {
                            ForEach(store.visibleWords) { word in
                                wordCard(word, store: store)
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
            // 학습 홈의 섹션 머리와 같은 규칙: 색 타일 + 제목 + 개수.
            HStack(spacing: 10) {
                Image(systemName: status.symbolName)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(status.dotColor.gradient, in: .rect(cornerRadius: 9, style: .continuous))
                    .shadow(color: status.dotColor.opacity(0.3), radius: 8, y: 4)

                Text(status.label)
                    .font(.title3.bold())

                Text("\(words.count)")
                    .font(.footnote.weight(.bold))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(.quaternary, in: .capsule)

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 2)
            .padding(.top, 8)

            ForEach(words) { word in
                wordCard(word, store: store)
            }
        }
    }

    private func wordCard(_ word: Word, store: VocabularyStore) -> some View {
        WordFlipCard(
            word: word,
            folderName: word.folderIds.first.flatMap { store.folder(withID: $0)?.name },
            onToggleFlag: { Task { await store.toggleFlag(word) } },
            onSpeak: { SpeechSynthesizer.shared.speak(word.word) }
        )
        .contextMenu {
            Button("상세 보기", systemImage: "info.circle") { selectedWord = word }
            Button("폴더 이동", systemImage: "folder") { wordToMove = word }
            Button("삭제", systemImage: "trash", role: .destructive) {
                Task { await store.delete(word) }
            }
        }
    }

    /// 정렬 방식 고르기. 웹은 목록 위 `<select>`지만, 앱은 세로 공간을 아끼려고
    /// 툴바 메뉴로 둔다. 고른 값에는 체크가 붙는다.
    private func sortMenu(for store: VocabularyStore) -> some View {
        @Bindable var store = store

        return Menu {
            Picker("정렬 방식", selection: $store.sortMode) {
                ForEach(WordSortMode.allCases) { mode in
                    Label(mode.label, systemImage: mode.systemImage).tag(mode)
                }
            }
        } label: {
            Label("정렬 방식", systemImage: "arrow.up.arrow.down")
        }
        .tint(DS.BrandText.base)
    }

    private var emptyState: some View {
        DSCard(variant: .gradient, radius: DS.Radius.hero, padding: .xl) {
            VStack(alignment: .leading, spacing: 12) {
                DSBadge(text: "Start here", tone: .onDark, style: .pill)
                Text("첫 단어를 추가해 보세요")
                    .font(.title2.bold())
                Text("단어만 입력하면 AI가 뜻·발음·예문·유의어를 채웁니다.")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.85))

                Button("단어 추가") { isAddingWord = true }
                    .buttonStyle(.ds(.dark, size: .md))
                    .padding(.top, 4)
            }
        }
        .padding(20)
    }

    private var noMatchState: some View {
        ContentUnavailableView(
            "조건에 맞는 단어가 없습니다",
            systemImage: "magnifyingglass",
            description: Text("검색어나 폴더 필터를 바꿔 보세요.")
        )
        .padding(.vertical, 32)
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
                    chip(
                        for: .folder(folder.id),
                        title: folder.name,
                        symbol: folder.resolvedIcon?.symbol ?? "folder"
                    )
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
                    .font(.system(size: 11, weight: .bold))
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text("\(store.count(for: selection))")
                    .font(.caption2.weight(.bold))
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
                isSelected ? AnyShapeStyle(DS.Gradient.cta) : AnyShapeStyle(DS.Surface.level0),
                in: .capsule
            )
            .overlay(
                Capsule().strokeBorder(isSelected ? .clear : DS.Surface.level200, lineWidth: 1)
            )
            .shadow(
                color: DS.Solid.indigo.opacity(isSelected ? 0.3 : 0),
                radius: 8,
                y: 4
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
            Text(message).font(.footnote.weight(.semibold))
            Spacer(minLength: 4)
            Button("닫기", systemImage: "xmark", action: dismiss)
                .labelStyle(.iconOnly)
                .font(.system(size: 12, weight: .bold))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .foregroundStyle(DS.BrandText.danger)
        // wash는 틴트라 다크에서 알파가 낮다. 불투명 바탕을 먼저 깐다.
        .background(DS.Wash.danger, in: .rect(cornerRadius: DS.Radius.md))
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.md))
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
