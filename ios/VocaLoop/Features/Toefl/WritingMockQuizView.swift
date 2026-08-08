import SwiftUI

/// 웹 `src/components/ToeflWritingMockTest.jsx`의 이식.
///
/// Build a Sentence 10문항 → 이메일 → 토론을 이어 풀고 한 번에 채점한다.
struct WritingMockQuizView: View {
    @Bindable var session: WritingMockSession

    @Environment(\.dismiss) private var dismiss
    @FocusState private var isEditorFocused: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                switch session.phase {
                case .generating:
                    ToeflGeneratingState(
                        title: "TOEFL Writing 모의고사를 생성 중입니다",
                        detail: "문장 배열 \(session.sentenceCount > 0 ? "\(session.sentenceCount)" : "10")문항과 작문 과제 2개를 준비하고 있어요."
                    )
                case let .failed(message):
                    ToeflFailedState(
                        message: message,
                        onRetry: { Task { await session.load() } },
                        onExit: { dismiss() }
                    )
                case .working, .grading:
                    workingState
                case .report:
                    if let feedback = session.feedback {
                        reportState(feedback)
                    }
                }
            }
            .navigationTitle("Writing Mock Test")
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

    // MARK: - 진행 화면

    private var workingState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                headerRow

                if session.isEmailStep {
                    writingStep(
                        task: session.section?.emailTask,
                        text: $session.emailResponse
                    )
                } else if session.isDiscussionStep {
                    writingStep(
                        task: session.section?.discussionTask,
                        text: $session.discussionResponse
                    )
                } else if let question = session.currentSentence {
                    sentenceStep(question)
                }

                if let error = session.gradingError {
                    Text(error)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(DS.BrandText.danger)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Button {
                    isEditorFocused = false
                    session.clearGradingError()
                    Task { await session.advance() }
                } label: {
                    Text(session.phase == .grading ? "채점 중..." : session.advanceTitle)
                }
                .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                .disabled(!session.canAdvance)
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
                Text("TOEFL Writing Mock Test")
                    .font(.system(size: 24, weight: .black))
                    .tracking(-0.6)
                    .foregroundStyle(DS.Surface.level900)
                    .fixedSize(horizontal: false, vertical: true)

                Text(session.progressLabel)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(DS.Surface.level500)
            }

            FlowLayout(spacing: 8) {
                DSBadge(text: session.difficulty.label, tone: .brand, style: .pill, size: .xs)
                DSBadge(
                    text: "\(min(session.step + 1, session.sentenceCount + 2))/\(session.sentenceCount + 2)",
                    tone: .accent,
                    style: .pill,
                    size: .xs
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - 문장 배열 단계

    private func sentenceStep(_ question: BuildSentenceQuestion) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            if !question.context.isEmpty {
                Text(question.context)
                    .font(.system(size: 15, weight: .semibold))
                    .lineSpacing(8)
                    .foregroundStyle(DS.Surface.level600)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.Radius.md)
                            .strokeBorder(DS.Surface.level100, lineWidth: 1)
                    )
            }

            BuildSentenceFrameView(
                question: question,
                arrangement: session.currentArrangement,
                onRemove: { session.removeToken(at: $0) }
            )

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Word Bank".uppercased())
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                        .foregroundStyle(DS.Surface.level400)
                    Spacer(minLength: 8)
                    Button("초기화") { session.resetCurrent() }
                        .font(.system(size: 12, weight: .black))
                        .foregroundStyle(DS.BrandText.base)
                        .buttonStyle(.plain)
                }

                FlowLayout(spacing: 8) {
                    ForEach(session.currentBank, id: \.self) { wordIndex in
                        Button {
                            session.place(wordIndex)
                        } label: {
                            Text(question.words[wordIndex])
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(DS.Surface.level800)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.sm))
                                .overlay(
                                    RoundedRectangle(cornerRadius: DS.Radius.sm)
                                        .strokeBorder(DS.Surface.level200, lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - 작문 단계

    @ViewBuilder
    private func writingStep(task: WritingTask?, text: Binding<String>) -> some View {
        if let task {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 12) {
                    Text(task.title.uppercased())
                        .font(.system(size: 12, weight: .black))
                        .tracking(1)
                        .foregroundStyle(DS.Surface.level400)
                        .fixedSize(horizontal: false, vertical: true)

                    if task.taskType == .email {
                        Text(task.situation)
                            .font(.system(size: 16, weight: .semibold))
                            .lineSpacing(16)
                            .foregroundStyle(DS.Surface.level700)
                            .fixedSize(horizontal: false, vertical: true)

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
                    } else {
                        Text(task.professorQuestion)
                            .font(.system(size: 16, weight: .semibold))
                            .lineSpacing(16)
                            .foregroundStyle(DS.Surface.level700)
                            .fixedSize(horizontal: false, vertical: true)

                        ForEach(task.studentPosts) { post in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(post.name)
                                    .font(.system(size: 14, weight: .black))
                                    .foregroundStyle(DS.Surface.level900)
                                Text(post.text)
                                    .font(.system(size: 14, weight: .semibold))
                                    .lineSpacing(8)
                                    .foregroundStyle(DS.Surface.level600)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.sm))
                            .overlay(
                                RoundedRectangle(cornerRadius: DS.Radius.sm)
                                    .strokeBorder(DS.Surface.level200, lineWidth: 1)
                            )
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

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Your Response".uppercased())
                            .font(.system(size: 10, weight: .black))
                            .tracking(1)
                            .foregroundStyle(DS.Surface.level400)
                        Spacer(minLength: 8)
                        Text("\(WritingWordCount.count(text.wrappedValue)) words".uppercased())
                            .font(.system(size: 10, weight: .black))
                            .tracking(1)
                            .monospacedDigit()
                            .foregroundStyle(DS.Surface.level500)
                    }

                    TextEditor(text: text)
                        .focused($isEditorFocused)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(DS.Surface.level800)
                        .lineSpacing(6)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 220)
                        .padding(12)
                        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: DS.Radius.md)
                                .strokeBorder(DS.Surface.level200, lineWidth: 1)
                        )
                        .disabled(session.phase == .grading)

                    Text(task.wordTarget)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(DS.Surface.level500)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    // MARK: - 리포트

    private func reportState(_ feedback: WritingMockFeedback) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("TOEFL Writing Mock Test Report")
                        .font(.system(size: 24, weight: .black))
                        .tracking(-0.6)
                        .foregroundStyle(DS.Surface.level900)
                        .fixedSize(horizontal: false, vertical: true)

                    Text("Build a Sentence \(feedback.sentenceCorrect)/\(feedback.sentenceTotal) · Email \(feedback.emailScore)/5 · Discussion \(feedback.discussionScore)/5")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(DS.Surface.level500)
                        .fixedSize(horizontal: false, vertical: true)
                }

                HStack(spacing: 12) {
                    scoreTile(
                        "Estimated Writing Band",
                        value: "\(feedback.band)",
                        tint: DS.BrandText.strong,
                        background: DS.Wash.brand
                    )
                    scoreTile(
                        "Constructed Response",
                        value: "\(feedback.constructedResponseScore)/10",
                        tint: DS.Surface.level900,
                        background: DS.Surface.level50
                    )
                }

                Text(feedback.feedbackKo)
                    .font(.system(size: 14, weight: .bold))
                    .lineSpacing(8)
                    .foregroundStyle(DS.BrandText.deep)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(DS.Wash.brand, in: .rect(cornerRadius: DS.Radius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.Radius.md)
                            .strokeBorder(DS.Wash.brandStrong, lineWidth: 1)
                    )

                summaryList("강점", items: feedback.strengths)
                summaryList("개선점", items: feedback.improvements)
                summaryList("다음 학습", items: feedback.nextSteps)

                Text("Estimated band는 앱 내 연습용 추정치이며 공식 ETS 점수가 아닙니다.")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(DS.Surface.level500)
                    .fixedSize(horizontal: false, vertical: true)

                Button("모드 선택으로") { dismiss() }
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
    }

    private func scoreTile(
        _ label: String,
        value: String,
        tint: Color,
        background: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)
                .fixedSize(horizontal: false, vertical: true)

            Text(value)
                .font(.system(size: 36, weight: .black))
                .tracking(-0.9)
                .monospacedDigit()
                .foregroundStyle(tint)
        }
        .padding(20)
        .frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)
        .background(background, in: .rect(cornerRadius: DS.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.lg)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
    }

    @ViewBuilder
    private func summaryList(_ title: String, items: [String]) -> some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text(title)
                    .font(.system(size: 16, weight: .black))
                    .tracking(-0.4)
                    .foregroundStyle(DS.Surface.level900)

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
