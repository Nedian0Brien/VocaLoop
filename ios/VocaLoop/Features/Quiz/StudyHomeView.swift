import SwiftUI

struct StudyHomeView: View {
    @Environment(AppState.self) private var appState

    @State private var selectedMode: QuizMode = .multipleChoice
    @State private var questionCount = 10
    @State private var session: QuizSession?

    private var availableWords: [Word] {
        appState.vocabulary?.words.filter { !$0.primaryMeaning.isEmpty } ?? []
    }

    /// 객관식은 오답 보기가 필요해 최소 인원이 있어야 말이 된다.
    private var canStart: Bool {
        switch selectedMode {
        case .multipleChoice: return availableWords.count >= 4
        case .shortAnswer, .flashcard: return !availableWords.isEmpty
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    summaryCard
                    modePicker
                    countPicker
                    startButton
                }
                .padding(20)
            }
            .navigationTitle("학습")
            .fullScreenCover(item: $session) { session in
                QuizContainerView(session: session)
            }
        }
    }

    private var summaryCard: some View {
        let words = appState.vocabulary?.words ?? []
        let mastered = words.count { $0.status == .mastered }
        let learning = words.count { $0.status == .learning }

        return VStack(spacing: 16) {
            Text("오늘도 한 바퀴 돌려볼까요?")
                .font(.headline)
                .foregroundStyle(.white)

            HStack(spacing: 0) {
                summaryTile("전체", words.count)
                summaryTile("학습 중", learning)
                summaryTile("완료", mastered)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(LinearGradient.brandGradient, in: .rect(cornerRadius: 24))
    }

    private func summaryTile(_ title: String, _ value: Int) -> some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.title.bold().monospacedDigit())
                .foregroundStyle(.white)
            Text(title)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity)
    }

    private var modePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("모드").font(.headline)

            ForEach(QuizMode.allCases) { mode in
                Button {
                    selectedMode = mode
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: mode.symbolName)
                            .font(.title3)
                            .frame(width: 32)
                            .foregroundStyle(selectedMode == mode ? Color.brand : .secondary)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(mode.title).font(.body.weight(.semibold))
                            Text(mode.detail).font(.caption).foregroundStyle(.secondary)
                        }

                        Spacer()

                        if selectedMode == mode {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Color.brand)
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        selectedMode == mode
                            ? AnyShapeStyle(Color.brand.opacity(0.1))
                            : AnyShapeStyle(.quaternary.opacity(0.5)),
                        in: .rect(cornerRadius: 16)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .animation(.smooth(duration: 0.2), value: selectedMode)
    }

    private var countPicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("문제 수").font(.headline)

            Picker("문제 수", selection: $questionCount) {
                ForEach([5, 10, 20, 30], id: \.self) { count in
                    Text("\(count)").tag(count)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private var startButton: some View {
        VStack(spacing: 8) {
            Button("시작하기") {
                session = QuizSession(
                    mode: selectedMode,
                    words: availableWords,
                    questionCount: questionCount
                )
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.extraLarge)
            .tint(.brand)
            .frame(maxWidth: .infinity)
            .disabled(!canStart)

            if !canStart {
                Text(
                    selectedMode == .multipleChoice
                        ? "객관식은 뜻이 있는 단어가 4개 이상 필요합니다."
                        : "뜻이 등록된 단어가 없습니다."
                )
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            }
        }
    }
}

extension QuizSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
