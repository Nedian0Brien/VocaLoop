import PhotosUI
import SwiftUI

/// 웹 `BulkWordAddModal` + `ScreenshotWordImportModal`의 이식.
///
/// 두 화면을 하나로 합쳤다. 웹은 모달이 둘이지만 앱에서는 사진에서 뽑은 단어가
/// 결국 같은 큐로 들어가므로, 나누면 같은 화면을 두 번 만들게 된다.
struct BulkAddWordView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var draft = ""
    @State private var queued: [String] = []
    @State private var folderChoice: FolderChoice = .none
    @State private var newFolderName = ""
    @State private var photoItem: PhotosPickerItem?

    @State private var isExtracting = false
    @State private var progress: BulkWordAddService.Progress?
    @State private var summary: BulkWordAddService.Summary?
    @State private var errorMessage: String?

    @FocusState private var isDraftFocused: Bool

    private enum FolderChoice: Hashable {
        case none
        case existing(Folder.ID)
        case new
    }

    private var folders: [Folder] { appState.vocabulary?.folders ?? [] }
    private var isBusy: Bool { isExtracting || progress != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    inputCard
                    if !queued.isEmpty { queueCard }
                    folderCard
                    if let progress { progressCard(progress) }
                    if let summary { summaryCard(summary) }
                    if let errorMessage { errorCard(errorMessage) }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
            .background(DS.Surface.level50)
            .navigationTitle("여러 단어 추가")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }.disabled(isBusy)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { Task { await save() } }
                        .disabled(queued.isEmpty || isBusy)
                }
            }
            .onChange(of: photoItem) { _, item in
                guard let item else { return }
                Task { await extract(from: item) }
            }
            .animation(.smooth(duration: 0.25), value: queued)
            .animation(.smooth(duration: 0.25), value: progress)
        }
    }

    // MARK: - 입력

    private var inputCard: some View {
        card {
            VStack(alignment: .leading, spacing: 12) {
                Text("단어 입력")
                    .font(.subheadline.weight(.semibold))

                HStack(spacing: 10) {
                    TextField("abate, candid", text: $draft, axis: .vertical)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .lineLimit(1...4)
                        .focused($isDraftFocused)
                        .padding(12)
                        .background(DS.Surface.level50, in: .rect(cornerRadius: 12))

                    Button("추가", action: enqueueDraft)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(DS.Gradient.cta, in: .rect(cornerRadius: 12))
                        .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || isBusy)
                }

                Text("줄바꿈·쉼표·세미콜론으로 여러 개를 한 번에 넣을 수 있습니다.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Divider()

                photoPicker
            }
        }
    }

    /// PhotosPicker의 라벨 클로저는 메인 액터가 아니라 상태를 바로 읽으면 경고가 난다.
    /// 값으로 먼저 꺼내 담는다.
    private var photoPicker: some View {
        let title = isExtracting ? "이미지에서 단어를 읽는 중…" : "이미지에서 단어 가져오기"
        let symbol = isExtracting ? "hourglass" : "photo.on.rectangle.angled"

        return PhotosPicker(selection: $photoItem, matching: .images) {
            HStack(spacing: 10) {
                Image(systemName: symbol)
                Text(title)
                Spacer(minLength: 0)
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(DS.BrandText.base)
        }
        .disabled(isBusy)
    }

    private var queueCard: some View {
        card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Text("저장할 단어")
                        .font(.subheadline.weight(.semibold))
                    Text("\(queued.count)")
                        .font(.footnote.weight(.bold))
                        .monospacedDigit()
                        .foregroundStyle(DS.BrandText.base)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(DS.Wash.brandStrong, in: .capsule)
                    Spacer(minLength: 0)
                    Button("전부 지우기") { queued.removeAll() }
                        .font(.caption.weight(.semibold))
                        .disabled(isBusy)
                }

                FlowLayout(spacing: 8) {
                    ForEach(queued, id: \.self) { word in
                        Button {
                            queued.removeAll { $0 == word }
                        } label: {
                            HStack(spacing: 5) {
                                Text(word).font(.subheadline.weight(.semibold))
                                Image(systemName: "xmark").font(.caption2.weight(.bold))
                            }
                            .foregroundStyle(DS.Surface.level700)
                            .padding(.horizontal, 11)
                            .padding(.vertical, 7)
                            .background(DS.Surface.level50, in: .capsule)
                            .overlay(Capsule().strokeBorder(DS.Surface.level200, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .disabled(isBusy)
                        .accessibilityLabel("\(word) 빼기")
                    }
                }
            }
        }
    }

    private var folderCard: some View {
        card {
            VStack(alignment: .leading, spacing: 12) {
                Text("폴더")
                    .font(.subheadline.weight(.semibold))

                Picker("폴더", selection: $folderChoice) {
                    Text("미분류").tag(FolderChoice.none)
                    ForEach(folders) { folder in
                        Text(folder.name).tag(FolderChoice.existing(folder.id))
                    }
                    Text("새 폴더 만들기").tag(FolderChoice.new)
                }
                .pickerStyle(.menu)
                .tint(DS.BrandText.base)

                if folderChoice == .new {
                    TextField("새 폴더 이름", text: $newFolderName)
                        .padding(12)
                        .background(DS.Surface.level50, in: .rect(cornerRadius: 12))
                }

                Text("이미 있는 단어는 새로 만들지 않고 이 폴더에만 넣습니다.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - 진행·결과

    private func progressCard(_ progress: BulkWordAddService.Progress) -> some View {
        card {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(label(for: progress.phase))
                        .font(.subheadline.weight(.semibold))
                    Spacer(minLength: 8)
                    Text("\(progress.completed) / \(progress.total)")
                        .font(.footnote)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }

                ProgressView(
                    value: Double(progress.completed),
                    total: Double(max(progress.total, 1))
                )
                .tint(DS.Solid.brand)

                if let current = progress.currentWord {
                    Text(current)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func label(for phase: BulkWordAddService.Progress.Phase) -> String {
        switch phase {
        case .analyzing: return "AI가 분석하는 중…"
        case .saving: return "저장하는 중…"
        case .done: return "끝났습니다"
        }
    }

    private func summaryCard(_ summary: BulkWordAddService.Summary) -> some View {
        card {
            VStack(alignment: .leading, spacing: 6) {
                Label("완료", systemImage: "checkmark.circle.fill")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.green)
                Text(summary.message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                if !summary.failed.isEmpty {
                    Text("실패: \(summary.failed.joined(separator: ", "))")
                        .font(.caption)
                        .foregroundStyle(DS.BrandText.danger)
                }
            }
        }
    }

    private func errorCard(_ message: String) -> some View {
        card {
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(DS.BrandText.danger)
        }
    }

    private func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level0, in: .rect(cornerRadius: 20))
            .shadow(color: DS.Solid.brand500.opacity(0.1), radius: 14, y: 6)
    }

    // MARK: - 동작

    private func enqueueDraft() {
        let incoming = BulkWordAddService.split(draft)
        guard !incoming.isEmpty else { return }

        let existing = Set(queued.map(BulkWordAddService.key))
        let fresh = BulkWordAddService.uniqued(incoming)
            .filter { !existing.contains(BulkWordAddService.key($0)) }

        draft = ""
        errorMessage = fresh.isEmpty ? "이미 목록에 있는 단어입니다." : nil
        queued.append(contentsOf: fresh)
    }

    private func extract(from item: PhotosPickerItem) async {
        photoItem = nil
        isExtracting = true
        errorMessage = nil
        defer { isExtracting = false }

        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                errorMessage = "이미지를 읽지 못했습니다."
                return
            }

            let service = VocabularyImportService(api: appState.api)
            let result = try await service.extractWords(from: data)

            guard !result.words.isEmpty else {
                errorMessage = "이미지에서 영어 단어를 찾지 못했습니다."
                return
            }

            let existing = Set(queued.map(BulkWordAddService.key))
            queued.append(
                contentsOf: BulkWordAddService.uniqued(result.words)
                    .filter { !existing.contains(BulkWordAddService.key($0)) }
            )

            // 서버가 폴더 이름을 제안하면 새 폴더 칸을 미리 채워 둔다.
            if let suggested = result.suggestedFolderName, !suggested.isEmpty,
               folderChoice == .none {
                folderChoice = .new
                newFolderName = suggested
            }
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func save() async {
        guard let store = appState.vocabulary, !queued.isEmpty, !isBusy else { return }

        errorMessage = nil
        summary = nil

        var targetFolderID: Folder.ID?
        switch folderChoice {
        case .none:
            targetFolderID = nil
        case let .existing(id):
            targetFolderID = id
        case .new:
            let name = newFolderName.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !name.isEmpty else {
                errorMessage = "새 폴더 이름을 입력해 주세요."
                return
            }
            guard let created = await store.createFolder(name: name, color: .blue, icon: nil) else {
                errorMessage = "폴더를 만들지 못했습니다."
                return
            }
            targetFolderID = created.id
        }

        let service = BulkWordAddService(api: appState.api, store: store)
        let result = await service.run(words: queued, folderID: targetFolderID) { update in
            progress = update
        }

        progress = nil
        summary = result
        queued.removeAll()
    }
}
