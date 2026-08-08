import SwiftUI

/// 웹 `src/components/ToeflBuildSentenceQuiz.jsx`의 이식.
///
/// 웹은 마우스 드래그로 조각을 옮기지만, 손가락으로는 작은 조각을 정확히
/// 끌기 어렵다. 그래서 **탭으로 배치/해제**를 기본 동작으로 두고,
/// 배치한 뒤 순서를 고칠 때만 길게 눌러 끌 수 있게 했다.
struct BuildSentenceQuizView: View {
    let session: BuildSentenceSession

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                switch session.phase {
                case .generating:
                    generatingState
                case let .failed(message):
                    failedState(message)
                case .finished:
                    resultState
                case .solving, .checked:
                    solvingState
                }
            }
            .navigationTitle("Build a Sentence")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("그만두기") { dismiss() }.tint(DS.Surface.level500)
                }
            }
        }
        .task { await session.load() }
    }

    // MARK: - 상태별 화면

    private var generatingState: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 34, weight: .bold))
                .foregroundStyle(DS.BrandText.accent)
                .symbolEffect(.pulse)
            Text("문장 문제를 생성 중입니다")
                .font(.system(size: 20, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(DS.Surface.level900)
            Text("실제 상황에 쓰이는 문장을 준비하고 있어요.")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DS.Surface.level500)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }

    private func failedState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Text("문제 생성 실패")
                .font(.system(size: 20, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(DS.Surface.level900)
            Text(message)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DS.BrandText.danger)
                .multilineTextAlignment(.center)

            HStack(spacing: 12) {
                Button("다시 시도") { Task { await session.load() } }
                    .buttonStyle(.ds(.primary, size: .md))
                Button("나가기") { dismiss() }
                    .buttonStyle(.ds(.secondary, size: .md))
            }
            .padding(.top, 8)
        }
        .padding(32)
    }

    private var solvingState: some View {
        ScrollView {
            VStack(spacing: 24) {
                QuizProgressHeader(
                    current: session.index + 1,
                    total: session.questions.count,
                    correct: session.correctCount,
                    wrong: session.index + (isChecked ? 1 : 0) - session.correctCount
                )

                if let question = session.currentQuestion {
                    QuizCardShell {
                        QuizIntroHeader(
                            modeLabel: "Build a Sentence",
                            eyebrow: "Situation",
                            title: question.context
                        )
                    } content: {
                        sentenceFrame(question).padding(.bottom, 24)
                        arrangedTokens(question).padding(.bottom, 20)
                        tokenPool(question).padding(.bottom, 24)

                        if case let .checked(isCorrect) = session.phase {
                            resultBanner(question, isCorrect: isCorrect).padding(.bottom, 24)
                        }

                        actionButton(question)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
    }

    private var isChecked: Bool {
        if case .checked = session.phase { return true }
        return false
    }

    private var resultState: some View {
        ScrollView {
            VStack(spacing: 24) {
                DSCard(variant: .gradient, radius: DS.Radius.card, padding: .xl) {
                    VStack(spacing: 10) {
                        DSBadge(text: "Session complete", tone: .onDark, style: .pill)
                        Text("\(session.accuracy)%")
                            .font(.system(size: 64, weight: .black))
                            .tracking(-3.2)
                            .monospacedDigit()
                        Text("\(session.questions.count)문장 중 \(session.correctCount)개 정답")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white.opacity(0.9))
                        Text("난이도: \(session.difficulty.label)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    .frame(maxWidth: .infinity)
                }

                Button("완료") { dismiss() }
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            }
            .padding(20)
        }
    }

    // MARK: - 문장 틀

    /// 빈칸 자리에 지금까지 배치한 조각을 끼워 보여준다.
    private func sentenceFrame(_ question: BuildSentenceQuestion) -> some View {
        let tokens = session.arrangement.compactMap { index -> String? in
            question.words.indices.contains(index) ? question.words[index] : nil
        }

        return VStack(alignment: .leading, spacing: 10) {
            QuizPromptLabel(text: "문장을 완성하세요")

            FlowLayout(spacing: 6) {
                ForEach(Array(BuildSentenceEngine.split(frame: question.sentenceFrame).enumerated()), id: \.offset) { _, part in
                    switch part {
                    case let .text(value):
                        ForEach(Array(value.split(separator: " ").enumerated()), id: \.offset) { _, word in
                            Text(String(word))
                                .font(.system(size: 17, weight: .medium))
                                .foregroundStyle(DS.Surface.level800)
                        }
                    case let .blank(blankIndex):
                        blankSlot(text: blankIndex < tokens.count ? tokens[blankIndex] : nil)
                    }
                }
            }
        }
    }

    private func blankSlot(text: String?) -> some View {
        Text(text ?? "＿＿")
            .font(.system(size: 17, weight: text == nil ? .medium : .bold))
            .foregroundStyle(text == nil ? DS.Surface.level300 : DS.BrandText.strong)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                text == nil ? DS.Surface.level100 : DS.Wash.brand,
                in: .rect(cornerRadius: DS.Radius.xs)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.xs).strokeBorder(
                    text == nil ? DS.Surface.level200 : DS.Solid.brand500.opacity(0.5),
                    lineWidth: 1
                )
            )
    }

    // MARK: - 배치한 조각

    /// 배치 순서를 보여주고, 탭하면 빼고 길게 눌러 끌면 순서를 바꾼다.
    private func arrangedTokens(_ question: BuildSentenceQuestion) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("배치한 순서".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)

                Spacer(minLength: 0)

                if !session.arrangement.isEmpty, session.phase == .solving {
                    Button("모두 빼기") { session.clear() }
                        .font(.system(size: 11, weight: .black))
                        .foregroundStyle(DS.BrandText.danger)
                        .buttonStyle(.plain)
                }
            }

            if session.arrangement.isEmpty {
                Text("아래 조각을 눌러 순서대로 배치하세요")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(DS.Surface.level400)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 14)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(Array(session.arrangement.enumerated()), id: \.offset) { position, tokenIndex in
                        let label = question.words.indices.contains(tokenIndex)
                            ? question.words[tokenIndex] : ""

                        Button {
                            session.removeToken(at: position)
                        } label: {
                            HStack(spacing: 6) {
                                Text("\(position + 1)")
                                    .font(.system(size: 10, weight: .black))
                                    .foregroundStyle(.white.opacity(0.8))
                                    .frame(width: 16, height: 16)
                                    .background(.white.opacity(0.25), in: .circle)
                                Text(label)
                                    .font(.system(size: 15, weight: .bold))
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 9)
                            .background(DS.Solid.brand, in: .capsule)
                            .foregroundStyle(.white)
                        }
                        .buttonStyle(.plain)
                        .disabled(session.phase != .solving)
                        .accessibilityLabel("\(position + 1)번째 조각 \(label), 두 번 탭하면 뺍니다")
                    }
                }
            }
        }
        .animation(.smooth(duration: 0.2), value: session.arrangement)
    }

    // MARK: - 조각 후보

    private func tokenPool(_ question: BuildSentenceQuestion) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("남은 조각".uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)

            FlowLayout(spacing: 8) {
                ForEach(session.remainingTokenIndices, id: \.self) { tokenIndex in
                    Button {
                        session.place(tokenIndex: tokenIndex)
                    } label: {
                        Text(question.words[tokenIndex])
                            .font(.system(size: 15, weight: .bold))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(DS.Surface.level0, in: .capsule)
                            .overlay(
                                Capsule().strokeBorder(DS.Surface.level200, lineWidth: 1)
                            )
                            .foregroundStyle(DS.Surface.level800)
                    }
                    .buttonStyle(.plain)
                    .disabled(session.phase != .solving)
                }

                if session.remainingTokenIndices.isEmpty {
                    Text("조각을 모두 배치했습니다")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(DS.Surface.level400)
                }
            }
        }
        .animation(.smooth(duration: 0.2), value: session.remainingTokenIndices)
    }

    // MARK: - 결과

    private func resultBanner(_ question: BuildSentenceQuestion, isCorrect: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 18, weight: .bold))
                Text(isCorrect ? "정답입니다" : "다시 확인해 보세요")
                    .font(.system(size: 16, weight: .bold))
                Spacer(minLength: 0)
            }
            .foregroundStyle(isCorrect ? DS.BrandText.success : DS.BrandText.danger)

            if !isCorrect {
                VStack(alignment: .leading, spacing: 4) {
                    Text("정답")
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                        .foregroundStyle(DS.Surface.level400)
                    Text(question.target)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(DS.Surface.level900)

                    Text("내 답")
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                        .foregroundStyle(DS.Surface.level400)
                        .padding(.top, 4)
                    Text(BuildSentenceEngine.attempt(question, arrangement: session.arrangement))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(DS.Surface.level600)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            isCorrect ? DS.Wash.success : DS.Wash.danger,
            in: .rect(cornerRadius: 24)
        )
        .transition(.opacity.combined(with: .scale(scale: 0.97)))
    }

    private func actionButton(_ question: BuildSentenceQuestion) -> some View {
        let enabled = isChecked || session.canSubmit

        return Button {
            if isChecked { session.advance() } else { session.check() }
        } label: {
            Text(isChecked ? "다음 문장" : submitLabel(question))
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(
                    enabled ? DS.Surface.level800 : DS.Surface.level100,
                    in: .rect(cornerRadius: 24)
                )
                .foregroundStyle(enabled ? Color.white : DS.Surface.level400)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .animation(.smooth(duration: 0.2), value: enabled)
    }

    private func submitLabel(_ question: BuildSentenceQuestion) -> String {
        let required = BuildSentenceEngine.requiredTokenCount(question)
        let placed = session.arrangement.count
        if placed < required { return "조각 \(required - placed)개 더 배치" }
        if placed > required { return "조각 \(placed - required)개 빼기" }
        return "정답 확인"
    }
}
