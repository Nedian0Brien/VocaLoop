import SwiftUI

/// 웹 `src/components/ToeflWritingTaskQuiz.jsx`의 이식.
///
/// 과제를 읽고 글을 써서 내면 AI가 0~5점으로 채점하고 강점·개선점·다음 학습을
/// 돌려준다. 이메일과 학술 토론이 같은 화면을 쓰되 과제 표시만 갈린다.
struct WritingTaskQuizView: View {
    @Bindable var session: WritingTaskSession

    @Environment(\.dismiss) private var dismiss
    @FocusState private var isEditorFocused: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                switch session.phase {
                case .generating:
                    ToeflGeneratingState(
                        title: "TOEFL Writing 과제를 생성 중입니다",
                        detail: "\(session.taskType.title) 프롬프트를 준비하고 있어요."
                    )
                case let .failed(message):
                    ToeflFailedState(
                        message: message,
                        onRetry: { Task { await session.load() } },
                        onExit: { dismiss() }
                    )
                case .writing, .grading:
                    writingState
                case .feedback:
                    if let feedback = session.feedback {
                        feedbackState(feedback)
                    }
                }
            }
            .navigationTitle(session.taskType.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("그만두기") { dismiss() }.tint(DS.Surface.level500)
                }
                ToolbarItem(placement: .keyboard) {
                    Button("완료") { isEditorFocused = false }
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
        }
        .task { await session.load() }
    }

    // MARK: - 작성 화면

    private var writingState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                headerRow
                taskCard
                editorSection

                if let error = session.gradingError {
                    Text(error)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(DS.BrandText.danger)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Button {
                    isEditorFocused = false
                    session.clearGradingError()
                    Task { await session.submit() }
                } label: {
                    Text(session.phase == .grading ? "채점 중..." : "AI 피드백 받기")
                }
                .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                .disabled(!session.canSubmit)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private var headerRow: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(session.taskType.title)
                    .font(.system(size: 24, weight: .black))
                    .tracking(-0.6)
                    .foregroundStyle(DS.Surface.level900)
                    .fixedSize(horizontal: false, vertical: true)

                Text(session.taskType.subtitle)
                    .font(.system(size: 14, weight: .bold))
                    .lineSpacing(4)
                    .foregroundStyle(DS.Surface.level500)
                    .fixedSize(horizontal: false, vertical: true)
            }

            FlowLayout(spacing: 8) {
                DSBadge(text: session.difficulty.label, tone: .brand, style: .pill, size: .xs)
                DSBadge(text: "\(session.timeLimitMinutes) min", tone: .neutral, style: .pill, size: .xs)
                if session.vocabularySampleCount > 0 {
                    DSBadge(
                        text: "내 단어 \(session.vocabularySampleCount)개 활용",
                        tone: .brand,
                        style: .pill,
                        size: .xs
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var taskCard: some View {
        if let task = session.task {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 8) {
                    Image(systemName: session.taskType.symbolName)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(DS.BrandText.base)
                    Text(task.title.uppercased())
                        .font(.system(size: 12, weight: .black))
                        .tracking(1)
                        .foregroundStyle(DS.Surface.level400)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }

                if session.taskType == .email {
                    emailBody(task)
                } else {
                    discussionBody(task)
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.md)
                    .strokeBorder(DS.Surface.level100, lineWidth: 1)
            )
        }
    }

    private func emailBody(_ task: WritingTask) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            labeledBlock("Situation") {
                Text(task.situation)
                    .font(.system(size: 16, weight: .semibold))
                    .lineSpacing(16)
                    .foregroundStyle(DS.Surface.level700)
                    .fixedSize(horizontal: false, vertical: true)
            }

            labeledBlock("Include") {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(task.requirements.enumerated()), id: \.offset) { _, requirement in
                        HStack(alignment: .top, spacing: 8) {
                            Circle()
                                .fill(DS.Surface.level400)
                                .frame(width: 5, height: 5)
                                .padding(.top, 8)
                            Text(requirement)
                                .font(.system(size: 14, weight: .bold))
                                .lineSpacing(6)
                                .foregroundStyle(DS.Surface.level700)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }

            labeledBlock("To") {
                Text(task.recipient)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(DS.Surface.level700)
            }
        }
    }

    private func discussionBody(_ task: WritingTask) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            labeledBlock(task.course) {
                Text(task.professorQuestion)
                    .font(.system(size: 16, weight: .semibold))
                    .lineSpacing(16)
                    .foregroundStyle(DS.Surface.level700)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(spacing: 12) {
                ForEach(task.studentPosts) { post in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(post.name)
                            .font(.system(size: 14, weight: .black))
                            .foregroundStyle(DS.Surface.level900)
                        Text(post.text)
                            .font(.system(size: 14, weight: .semibold))
                            .lineSpacing(8)
                            .foregroundStyle(DS.Surface.level600)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.Radius.md)
                            .strokeBorder(DS.Surface.level200, lineWidth: 1)
                    )
                }
            }
        }
    }

    private func labeledBlock<Content: View>(
        _ label: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)
                .fixedSize(horizontal: false, vertical: true)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - 에디터

    private var editorSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Your Response".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)
                Spacer(minLength: 8)
                Text("\(session.wordCount) words".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .monospacedDigit()
                    .foregroundStyle(DS.Surface.level500)
            }

            TextEditor(text: $session.response)
                .focused($isEditorFocused)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(DS.Surface.level800)
                .lineSpacing(6)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 240)
                .padding(12)
                .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.md).strokeBorder(
                        isEditorFocused ? DS.Solid.brand500 : DS.Surface.level200,
                        lineWidth: isEditorFocused ? 2 : 1
                    )
                )
                .overlay(alignment: .topLeading) {
                    // TextEditor에는 placeholder가 없어 직접 깐다.
                    if session.response.isEmpty {
                        Text(session.taskType.placeholder)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(DS.Surface.level400)
                            .padding(.horizontal, 17)
                            .padding(.vertical, 20)
                            .allowsHitTesting(false)
                    }
                }
                .disabled(session.phase == .grading)

            Text(session.task?.wordTarget ?? session.taskType.defaultWordTarget)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(DS.Surface.level500)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - 피드백

    private func feedbackState(_ feedback: WritingFeedback) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Writing 피드백")
                        .font(.system(size: 24, weight: .black))
                        .tracking(-0.6)
                        .foregroundStyle(DS.Surface.level900)
                    Text("\(session.taskType.title) · \(session.wordCount) words")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(DS.Surface.level500)
                        .fixedSize(horizontal: false, vertical: true)
                }

                scoreCard(feedback)

                feedbackList("강점", items: feedback.strengths)
                feedbackList("개선점", items: feedback.improvements)
                feedbackList("다음 학습", items: feedback.nextSteps)

                Button("모드 선택으로") { dismiss() }
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
    }

    private func scoreCard(_ feedback: WritingFeedback) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Practice Score".uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.BrandText.base)

            Text("\(feedback.score)/5")
                .font(.system(size: 48, weight: .black))
                .tracking(-1.2)
                .monospacedDigit()
                .foregroundStyle(DS.BrandText.strong)

            Text(feedback.feedbackKo)
                .font(.system(size: 14, weight: .bold))
                .lineSpacing(8)
                .foregroundStyle(DS.BrandText.deep)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Wash.brand, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Wash.brandStrong, lineWidth: 1)
        )
    }

    @ViewBuilder
    private func feedbackList(_ title: String, items: [String]) -> some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text(title)
                    .font(.system(size: 16, weight: .black))
                    .tracking(-0.4)
                    .foregroundStyle(DS.Surface.level900)

                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                        HStack(alignment: .top, spacing: 8) {
                            Circle()
                                .fill(DS.Surface.level400)
                                .frame(width: 5, height: 5)
                                .padding(.top, 7)
                            Text(item)
                                .font(.system(size: 14, weight: .semibold))
                                .lineSpacing(6)
                                .foregroundStyle(DS.Surface.level600)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.md)
                    .strokeBorder(DS.Surface.level100, lineWidth: 1)
            )
        }
    }
}
