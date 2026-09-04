import SwiftUI

struct AddWordView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var wordText = ""
    @State private var analysis: WordAnalysis?
    @State private var selectedFolderID: Folder.ID?
    @State private var phase: Phase = .idle
    @State private var errorMessage: String?
    @State private var isAddingMany = false
    @State private var suggestions: [DictionaryAutocomplete.Suggestion] = []
    @State private var suggestionTask: Task<Void, Never>?
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

                if !suggestions.isEmpty, analysis == nil {
                    Section("사전 제안") {
                        ForEach(suggestions) { suggestion in
                            Button {
                                wordText = suggestion.word
                                suggestions = []
                            } label: {
                                HStack(alignment: .firstTextBaseline, spacing: 8) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(suggestion.word)
                                            .font(.merriweather(size: 15, weight: .bold))
                                            .foregroundStyle(DS.Surface.level900)
                                        Text(suggestion.meaningKo)
                                            .font(.footnote)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }

                                    Spacer(minLength: 8)

                                    if let pos = suggestion.pos {
                                        Text(pos)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                            }
                            .accessibilityLabel("\(suggestion.word) 자동완성 선택")
                        }
                    }
                }

                Section {
                    Button {
                        isAddingMany = true
                    } label: {
                        Label("여러 단어 한꺼번에 추가", systemImage: "text.badge.plus")
                    }
                    Button {
                        isAddingMany = true
                    } label: {
                        Label("이미지에서 단어 가져오기", systemImage: "photo.on.rectangle.angled")
                    }
                } footer: {
                    Text("단어장 스크린샷을 고르면 AI가 영어 단어만 뽑아 목록에 넣습니다.")
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
                            .font(.footnote)
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
            .sheet(isPresented: $isAddingMany) {
                BulkAddWordView()
            }
            .onChange(of: wordText) { _, value in
                updateSuggestions(for: value)
            }
            .animation(.smooth(duration: 0.2), value: suggestions)
            .animation(.smooth(duration: 0.25), value: analysis?.word)
            .animation(.smooth(duration: 0.2), value: phase)
        }
        .onAppear { isWordFieldFocused = true }
    }

    /// 웹은 입력이 바뀔 때마다 사전을 다시 찾는다. 앱도 같게 하되, 앞선 찾기는
    /// 취소해 늦게 온 결과가 최신 입력을 덮어쓰지 않게 한다.
    private func updateSuggestions(for value: String) {
        suggestionTask?.cancel()

        let query = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard query.count >= DictionaryAutocomplete.minQueryLength else {
            suggestions = []
            return
        }

        suggestionTask = Task {
            let found = await DictionaryAutocomplete.shared.suggestions(for: query)
            guard !Task.isCancelled else { return }
            suggestions = found
        }
    }

    private func analyze() async {
        guard !trimmedWord.isEmpty, phase == .idle else { return }

        isWordFieldFocused = false
        suggestions = []
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

        if await store.createWord(trimmedWord, analysis: analysis, folderID: selectedFolderID) {
            dismiss()
        } else {
            errorMessage = store.errorMessage ?? "단어를 저장하지 못했습니다."
        }
    }
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
