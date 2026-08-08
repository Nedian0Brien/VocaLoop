import SwiftUI

/// 폴더 생성·편집 시트. 웹 `FolderSidebar`의 인라인 편집을 시트로 옮긴 것.
/// 색·아이콘 선택지는 웹과 같은 값을 쓴다 (`FolderStyle.swift`).
struct FolderEditorView: View {
    /// nil이면 새 폴더 생성.
    let folder: Folder?
    let store: VocabularyStore

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var color: FolderColor
    @State private var icon: FolderIcon?
    @State private var isSaving = false
    @FocusState private var isNameFocused: Bool

    init(folder: Folder?, store: VocabularyStore) {
        self.folder = folder
        self.store = store
        _name = State(initialValue: folder?.name ?? "")
        _color = State(initialValue: folder?.resolvedColor ?? .blue)
        _icon = State(initialValue: folder?.resolvedIcon)
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        preview
                        nameField
                        colorPicker
                        iconPicker
                    }
                    .padding(20)
                }
            }
            .navigationTitle(folder == nil ? "새 폴더" : "폴더 편집")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") { dismiss() }.tint(DS.Surface.level500)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { Task { await save() } }
                        .tint(DS.BrandText.base)
                        .disabled(trimmedName.isEmpty || isSaving)
                }
            }
            .onAppear { isNameFocused = folder == nil }
        }
    }

    /// 고른 색·아이콘이 목록에서 어떻게 보일지 그대로 보여준다.
    private var preview: some View {
        HStack(spacing: 10) {
            Group {
                if let icon {
                    Image(systemName: icon.symbol)
                        .font(.system(size: 14, weight: .bold))
                } else {
                    Circle().fill(color.dot).frame(width: 8, height: 8)
                }
            }
            Text(trimmedName.isEmpty ? "폴더 이름" : trimmedName)
                .font(.system(size: 14, weight: .black))
                .opacity(trimmedName.isEmpty ? 0.4 : 1)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(color.background, in: .capsule)
        .foregroundStyle(color.foreground)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .animation(.smooth(duration: 0.2), value: color)
        .animation(.smooth(duration: 0.2), value: icon)
    }

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("이름")
            TextField("예: TOEFL 필수 단어", text: $name)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(DS.Surface.level900)
                .focused($isNameFocused)
                .submitLabel(.done)
                .onSubmit { Task { await save() } }
                .padding(.horizontal, 16)
                .frame(height: 52)
                .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.md)
                        .strokeBorder(DS.Surface.level200, lineWidth: 1)
                )
        }
    }

    private var colorPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("색")
            HStack(spacing: 12) {
                ForEach(FolderColor.allCases) { option in
                    Button {
                        color = option
                    } label: {
                        Circle()
                            .fill(option.dot)
                            .frame(width: 36, height: 36)
                            .overlay {
                                if color == option {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 14, weight: .black))
                                        .foregroundStyle(.white)
                                }
                            }
                            .overlay(
                                Circle().strokeBorder(
                                    color == option ? DS.Surface.level900.opacity(0.25) : .clear,
                                    lineWidth: 2
                                )
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(option.rawValue)
                    .accessibilityAddTraits(color == option ? [.isSelected] : [])
                }
                Spacer(minLength: 0)
            }
            .animation(.smooth(duration: 0.2), value: color)
        }
    }

    private var iconPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("아이콘 (선택)")

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5), spacing: 10) {
                iconCell(nil, symbol: "circle.slash", label: "없음")
                ForEach(FolderIcon.allCases) { option in
                    iconCell(option, symbol: option.symbol, label: option.rawValue)
                }
            }
            .animation(.smooth(duration: 0.2), value: icon)
        }
    }

    private func iconCell(_ option: FolderIcon?, symbol: String, label: String) -> some View {
        let isSelected = icon == option

        return Button {
            icon = option
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .semibold))
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .foregroundStyle(isSelected ? color.foreground : DS.Surface.level400)
                .background(
                    isSelected ? color.background : DS.Surface.level0,
                    in: .rect(cornerRadius: DS.Radius.md)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.md).strokeBorder(
                        isSelected ? color.dot : DS.Surface.level200,
                        lineWidth: isSelected ? 2 : 1
                    )
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .black))
            .tracking(1)
            .foregroundStyle(DS.Surface.level400)
    }

    private func save() async {
        guard !trimmedName.isEmpty, !isSaving else { return }
        isSaving = true
        defer { isSaving = false }

        if let folder {
            await store.updateFolder(folder, name: trimmedName, color: color, icon: icon)
        } else {
            await store.createFolder(name: trimmedName, color: color, icon: icon)
        }
        dismiss()
    }
}
