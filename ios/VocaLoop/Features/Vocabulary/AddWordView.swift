import SwiftUI

struct AddWordView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var wordText = ""
    @State private var analysis: WordAnalysis?
    @State private var selectedFolderID: Folder.ID?
    @State private var phase: Phase = .idle
    @State private var errorMessage: String?
    @FocusState private var isWordFieldFocused: Bool

    private enum Phase: Equatable {
        case idle, analyzing, saving
    }

    private var trimmedWord: String {
        wordText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("영어 단어", text: $wordText)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($isWordFieldFocused)
                        .submitLabel(.search)
                        .onSubmit { Task { await analyze() } }

                    Button {
                        Task { await analyze() }
                    } label: {
                        HStack {
                            if phase == .analyzing {
                                ProgressView().controlSize(.small)
                                Text("AI가 분석하는 중…")
                            } else {
                                Label("AI로 뜻·예문 채우기", systemImage: "sparkles")
                            }
                        }
                    }
                    .disabled(trimmedWord.isEmpty || phase != .idle)
                } footer: {
                    Text("AI 분석 없이 저장하면 단어만 등록됩니다. 나중에 다시 분석할 수 있습니다.")
                }

                if let folders = appState.vocabulary?.folders, !folders.isEmpty {
                    Section("폴더") {
                        Picker("폴더", selection: $selectedFolderID) {
                            Text("없음").tag(Folder.ID?.none)
                            ForEach(folders) { folder in
                                Text(folder.name).tag(Folder.ID?.some(folder.id))
                            }
                        }
                    }
                }

                if let analysis {
                    AnalysisPreview(analysis: analysis)
                }

                if let errorMessage {
                    Section {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(DS.BrandText.danger)
                            .font(DS.Font.caption)
                    }
                }
            }
            .navigationTitle("단어 추가")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { Task { await save() } }
                        .disabled(trimmedWord.isEmpty || phase != .idle)
                }
            }
            .animation(.smooth(duration: 0.25), value: analysis?.word)
            .animation(.smooth(duration: 0.2), value: phase)
        }
        .onAppear { isWordFieldFocused = true }
    }

    private func analyze() async {
        guard !trimmedWord.isEmpty, phase == .idle else { return }

        isWordFieldFocused = false
        phase = .analyzing
        errorMessage = nil
        defer { phase = .idle }

        do {
            let service = WordAnalysisService(api: appState.api)
            analysis = try await service.analyze(trimmedWord)
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func save() async {
        guard let store = appState.vocabulary, !trimmedWord.isEmpty, phase == .idle else { return }

        phase = .saving
        errorMessage = nil
        defer { phase = .idle }

        let payload = WordCreatePayload(
            word: analysis?.word.isEmpty == false ? analysis!.word : trimmedWord,
            meaningKo: analysis?.meaningKo,
            pronunciation: analysis?.pronunciation,
            pos: analysis?.pos,
            definitions: analysis?.definitions ?? [],
            definitionsKo: analysis?.definitionsKo ?? [],
            examples: analysis?.examples ?? [],
            synonyms: analysis?.synonyms ?? [],
            nuance: analysis?.nuance,
            folderIds: selectedFolderID.map { [$0] } ?? []
        )

        do {
            let endpoint = try Endpoint.json("/api/words", method: .post, body: payload)
            let created = try await appState.api.send(endpoint, as: Word.self)
            store.insert(created)
            dismiss()
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

/// 생성 요청 본문. `Word`를 그대로 보내면 서버가 받지 않는 id/타임스탬프까지 섞여 나간다.
private struct WordCreatePayload: Encodable {
    var word: String
    var meaningKo: String?
    var pronunciation: String?
    var pos: String?
    var definitions: [String]
    var definitionsKo: [String]
    var examples: [WordExample]
    var synonyms: [String]
    var nuance: String?
    var folderIds: [Int]
}

private struct AnalysisPreview: View {
    let analysis: WordAnalysis

    var body: some View {
        Section("AI 분석 결과") {
            if let meaning = analysis.meaningKo, !meaning.isEmpty {
                LabeledContent("뜻", value: meaning)
            }
            if let pronunciation = analysis.pronunciation, !pronunciation.isEmpty {
                LabeledContent("발음", value: pronunciation)
            }
            if let pos = analysis.pos, !pos.isEmpty {
                LabeledContent("품사", value: pos)
            }
            if !analysis.synonyms.isEmpty {
                LabeledContent("유의어", value: analysis.synonyms.joined(separator: ", "))
            }
            ForEach(Array(analysis.examples.prefix(2).enumerated()), id: \.offset) { _, example in
                VStack(alignment: .leading, spacing: 4) {
                    Text(example.en).font(.callout)
                    Text(example.ko).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
    }
}
