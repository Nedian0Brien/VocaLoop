import SwiftUI

struct VocabularyListView: View {
    @Environment(AppState.self) private var appState
    @State private var isAddingWord = false

    var body: some View {
        NavigationStack {
            Group {
                if let store = appState.vocabulary {
                    content(for: store)
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("단어장")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("단어 추가", systemImage: "plus") { isAddingWord = true }
                }
            }
            .sheet(isPresented: $isAddingWord) {
                AddWordView()
            }
        }
    }

    @ViewBuilder
    private func content(for store: VocabularyStore) -> some View {
        @Bindable var store = store

        Group {
            if store.isLoading && store.words.isEmpty {
                ProgressView("불러오는 중…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if store.words.isEmpty {
                emptyState
            } else {
                List {
                    Section {
                        FolderFilterRow(store: store)
                            .listRowInsets(.init(top: 4, leading: 0, bottom: 8, trailing: 0))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }

                    Section {
                        ForEach(store.visibleWords) { word in
                            NavigationLink(value: word) {
                                WordRow(word: word)
                            }
                            .swipeActions(edge: .leading, allowsFullSwipe: true) {
                                Button {
                                    Task { await store.toggleFlag(word) }
                                } label: {
                                    Label(
                                        word.isFlagged ? "즐겨찾기 해제" : "즐겨찾기",
                                        systemImage: word.isFlagged ? "star.slash" : "star"
                                    )
                                }
                                .tint(.warningAmber)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { await store.delete(word) }
                                } label: {
                                    Label("삭제", systemImage: "trash")
                                }
                            }
                        }
                    } header: {
                        Text("\(store.visibleWords.count)개")
                    }
                }
                .listStyle(.plain)
                .navigationDestination(for: Word.self) { word in
                    WordDetailView(word: word)
                }
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
        ContentUnavailableView {
            Label("아직 단어가 없습니다", systemImage: "book.closed")
        } description: {
            Text("첫 단어를 추가하면 AI가 뜻과 예문을 채워줍니다.")
        } actions: {
            Button("단어 추가") { isAddingWord = true }
                .buttonStyle(.borderedProminent)
                .tint(.brand)
        }
    }
}

/// 전체 / 즐겨찾기 / 폴더를 가로로 훑는 필터 칩.
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
                        symbol: folder.icon ?? "folder"
                    )
                }
            }
            .padding(.horizontal, 20)
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
                Text(title)
                Text("\(store.count(for: selection))")
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
        }
        .buttonStyle(.plain)
        .background(
            isSelected ? AnyShapeStyle(Color.brand.opacity(0.15)) : AnyShapeStyle(.quaternary),
            in: .capsule
        )
        .foregroundStyle(isSelected ? Color.brand : .primary)
        .animation(.smooth(duration: 0.2), value: isSelected)
    }
}

private struct WordRow: View {
    let word: Word

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 4)
                .fill(word.status.tint)
                .frame(width: 4, height: 38)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(word.word)
                        .font(.headline)
                    if word.isFlagged {
                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundStyle(Color.warningAmber)
                    }
                }
                Text(word.primaryMeaning)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            Text("\(word.learningRate)%")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(word.word), \(word.primaryMeaning), 학습률 \(word.learningRate)퍼센트")
    }
}

/// 실패를 조용히 삼키지 않고 화면 아래에 잠깐 띄운다.
struct ErrorBanner: View {
    let message: String
    let dismiss: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
            Text(message).font(.footnote)
            Spacer(minLength: 4)
            Button("닫기", systemImage: "xmark", action: dismiss)
                .labelStyle(.iconOnly)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.regularMaterial, in: .rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14).strokeBorder(Color.dangerRed.opacity(0.4))
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}
