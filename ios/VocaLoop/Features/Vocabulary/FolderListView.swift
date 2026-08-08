import SwiftUI

/// 폴더 목록 관리. 생성·편집·삭제·순서 변경을 한 화면에서 처리한다.
struct FolderListView: View {
    let store: VocabularyStore

    @Environment(\.dismiss) private var dismiss
    @State private var editingFolder: Folder?
    @State private var isCreating = false
    @State private var folderPendingDeletion: Folder?

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                if store.folders.isEmpty {
                    emptyState
                } else {
                    folderList
                }
            }
            .navigationTitle("폴더")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }.tint(DS.Surface.level500)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("폴더 추가", systemImage: "plus") { isCreating = true }
                        .tint(DS.BrandText.base)
                }
            }
            .sheet(isPresented: $isCreating) {
                FolderEditorView(folder: nil, store: store)
            }
            .sheet(item: $editingFolder) { folder in
                FolderEditorView(folder: folder, store: store)
            }
            .confirmationDialog(
                "‘\(folderPendingDeletion?.name ?? "")’ 폴더를 삭제할까요?",
                isPresented: Binding(
                    get: { folderPendingDeletion != nil },
                    set: { if !$0 { folderPendingDeletion = nil } }
                ),
                titleVisibility: .visible
            ) {
                // 웹과 같은 두 갈래 선택지.
                Button("폴더만 삭제", role: .destructive) {
                    if let folder = folderPendingDeletion {
                        Task { await store.deleteFolder(folder, deleteWords: false) }
                    }
                    folderPendingDeletion = nil
                }
                Button("폴더와 단어 모두 삭제", role: .destructive) {
                    if let folder = folderPendingDeletion {
                        Task { await store.deleteFolder(folder, deleteWords: true) }
                    }
                    folderPendingDeletion = nil
                }
                Button("취소", role: .cancel) { folderPendingDeletion = nil }
            } message: {
                let count = folderPendingDeletion.map { store.count(for: .folder($0.id)) } ?? 0
                Text("이 폴더에 단어 \(count)개가 있습니다. ‘폴더만 삭제’를 고르면 단어는 남습니다.")
            }
        }
    }

    /// 순서 변경(드래그)을 쓰려면 시스템 List가 필요하다.
    /// 행 안쪽은 앱의 디자인 언어를 유지한다.
    private var folderList: some View {
        List {
            ForEach(store.folders) { folder in
                FolderRow(folder: folder, wordCount: store.count(for: .folder(folder.id)))
                    .listRowBackground(DS.Surface.level50)
                    .listRowSeparator(.hidden)
                    .listRowInsets(.init(top: 4, leading: 16, bottom: 4, trailing: 16))
                    .contentShape(.rect)
                    .onTapGesture { editingFolder = folder }
                    .swipeActions(edge: .trailing) {
                        Button("삭제", systemImage: "trash", role: .destructive) {
                            folderPendingDeletion = folder
                        }
                        Button("편집", systemImage: "pencil") { editingFolder = folder }
                            .tint(DS.Solid.brand)
                    }
            }
            .onMove { indices, destination in
                var reordered = store.folders
                reordered.move(fromOffsets: indices, toOffset: destination)
                Task { await store.reorderFolders(reordered) }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .environment(\.editMode, .constant(.active))
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "folder")
                .font(.system(size: 34, weight: .bold))
                .foregroundStyle(DS.Surface.level300)
            Text("폴더가 없습니다")
                .font(.system(size: 20, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(DS.Surface.level900)
            Text("단어를 주제별로 묶어두면 학습 범위를 고르기 쉬워집니다.")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DS.Surface.level500)
                .multilineTextAlignment(.center)

            Button("폴더 추가") { isCreating = true }
                .buttonStyle(.ds(.primary, size: .md))
                .padding(.top, 8)
        }
        .padding(32)
    }
}

/// 목록 한 줄 — 색 칩 + 이름 + 단어 수.
private struct FolderRow: View {
    let folder: Folder
    let wordCount: Int

    var body: some View {
        HStack(spacing: 12) {
            Group {
                if let emoji = folder.emojiIcon {
                    Text(emoji).font(.system(size: 16))
                } else if let icon = folder.resolvedIcon {
                    Image(systemName: icon.symbol)
                        .font(.system(size: 15, weight: .bold))
                } else {
                    Circle().fill(folder.resolvedColor.dot).frame(width: 10, height: 10)
                }
            }
            .frame(width: 40, height: 40)
            .background(folder.resolvedColor.background, in: .rect(cornerRadius: DS.Radius.md))
            .foregroundStyle(folder.resolvedColor.foreground)

            VStack(alignment: .leading, spacing: 2) {
                Text(folder.name)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(DS.Surface.level900)
                Text("단어 \(wordCount)개")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(DS.Surface.level500)
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl)
                .strokeBorder(DS.Surface.level200, lineWidth: 1)
        )
    }
}
