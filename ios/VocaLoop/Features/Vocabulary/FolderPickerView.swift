import SwiftUI

/// 단어를 폴더로 옮기는 시트. 웹 `WordCard`의 폴더 이동 메뉴 대응.
struct FolderPickerView: View {
    let word: Word
    let store: VocabularyStore

    @Environment(\.dismiss) private var dismiss

    private var currentFolderID: Folder.ID? { word.folderIds.first }

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 8) {
                        row(
                            title: "미분류",
                            symbol: "tray",
                            tint: DS.Surface.level400,
                            background: DS.Surface.level100,
                            isSelected: currentFolderID == nil
                        ) {
                            Task {
                                await store.moveWord(word, to: nil)
                                dismiss()
                            }
                        }

                        ForEach(store.folders) { folder in
                            row(
                                title: folder.name,
                                symbol: folder.resolvedIcon?.symbol ?? "folder",
                                tint: folder.resolvedColor.foreground,
                                background: folder.resolvedColor.background,
                                isSelected: currentFolderID == folder.id
                            ) {
                                Task {
                                    await store.moveWord(word, to: folder.id)
                                    dismiss()
                                }
                            }
                        }

                        if store.folders.isEmpty {
                            Text("폴더가 없습니다. 단어장 화면의 폴더 버튼에서 만들 수 있습니다.")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(DS.Surface.level500)
                                .multilineTextAlignment(.center)
                                .padding(.vertical, 24)
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle("‘\(word.word)’ 폴더 이동")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") { dismiss() }.tint(DS.Surface.level500)
                }
            }
        }
    }

    private func row(
        title: String,
        symbol: String,
        tint: Color,
        background: Color,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .bold))
                    .frame(width: 40, height: 40)
                    .background(background, in: .rect(cornerRadius: DS.Radius.md))
                    .foregroundStyle(tint)

                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(DS.Surface.level900)

                Spacer(minLength: 0)

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DS.BrandText.base)
                }
            }
            .padding(12)
            .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.xl).strokeBorder(
                    isSelected ? DS.Solid.brand : DS.Surface.level200,
                    lineWidth: isSelected ? 2 : 1
                )
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}
