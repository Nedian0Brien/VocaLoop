import SwiftUI

/// 웹 `src/components/ToeflReadingTaskQuiz.jsx`의 이식.
///
/// 지문 하나를 읽고 객관식 여러 문항을 푼 뒤 한 번에 채점한다.
/// Read in Daily Life와 Read an Academic Passage가 같은 화면을 쓴다.
struct ReadingTaskQuizView: View {
    let session: ReadingTaskSession

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                switch session.phase {
                case .generating:
                    ToeflGeneratingState(
                        title: "Reading 문제를 생성 중입니다",
                        detail: "\(session.taskType.title) 세트를 준비하고 있어요."
                    )
                case let .failed(message):
                    ToeflFailedState(
                        message: message,
                        onRetry: { session.reload() },
                        onExit: { dismiss() }
                    )
                case .solving, .checked:
                    solvingState
                case .report:
                    if let report = session.report {
                        ToeflReadingReportView(
                            report: report,
                            taskLabel: session.taskType.title,
                            difficulty: session.difficulty,
                            onExit: { dismiss() }
                        )
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
            }
        }
        .onAppear { session.loadIfNeeded() }
    }

    // MARK: - 푸는 화면

    private var solvingState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                headerRow
                stimulusCard

                ToeflQuestionNavigator(
                    total: session.total,
                    currentIndex: session.index,
                    answered: { session.selections.indices.contains($0) && session.selections[$0] != nil },
                    result: { session.result(at: $0) },
                    isChecked: session.isChecked,
                    onNavigate: { session.navigate(to: $0) }
                )

                if let question = session.currentQuestion {
                    questionSection(question)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .scrollEdgeEffectStyle(.soft, for: .top)
    }

    private var headerRow: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(session.taskType.title)
                    .font(.system(size: 24, weight: .black))
                    .tracking(-0.6)
                    .foregroundStyle(DS.Surface.level900)

                Text("\(session.taskType.subtitle) (문항 \(session.index + 1)/\(session.total))")
                    .font(.system(size: 14, weight: .bold))
                    .lineSpacing(4)
                    .foregroundStyle(DS.Surface.level500)
                    .fixedSize(horizontal: false, vertical: true)
            }

            FlowLayout(spacing: 8) {
                DSBadge(text: session.difficulty.label, tone: .brand, style: .pill, size: .xs)
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

    private var stimulusCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "book")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(DS.BrandText.base)
                Text((session.taskSet?.stimulusLabel ?? "").uppercased())
                    .font(.system(size: 12, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)
                Spacer(minLength: 0)
            }
            .padding(.bottom, 16)

            Text(session.taskSet?.title ?? "")
                .font(.system(size: 20, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(DS.Surface.level900)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 12)

            // 지문의 단어를 눌러 그 자리에서 단어장에 넣을 수 있다.
            VocabularyCaptureText(
                text: session.taskSet?.stimulus ?? "",
                sourceLabel: session.taskType.title,
                // 웹과 같이 정답을 확인한 뒤에만 "뜻 설명"을 연다.
                canExplain: session.isChecked
            )
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.md)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
    }

    // MARK: - 문항

    private func questionSection(_ question: ReadingQuestion) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text(question.skillTag.uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)

                Text(question.prompt)
                    .font(.system(size: 18, weight: .black))
                    .tracking(-0.45)
                    .lineSpacing(4)
                    .foregroundStyle(DS.Surface.level900)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(spacing: 12) {
                ForEach(Array(question.options.enumerated()), id: \.offset) { index, option in
                    optionButton(question: question, index: index, text: option)
                }
            }

            if session.isChecked {
                explanationCard(question)
            }

            footer
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func optionButton(question: ReadingQuestion, index: Int, text: String) -> some View {
        let selected = session.currentSelection == index
        let isAnswer = session.isChecked && index == question.answerIndex
        let isWrong = session.isChecked && selected && !isAnswer

        return Button {
            session.select(index)
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Text(ToeflReadingReport.optionLabels[safe: index] ?? "\(index + 1)")
                    .font(.system(size: 12, weight: .black))
                    .frame(width: 24, height: 24)
                    .background(labelBackground(isAnswer: isAnswer, isWrong: isWrong, selected: selected), in: .circle)
                    .foregroundStyle(
                        isAnswer || isWrong || selected ? .white : DS.Surface.level500
                    )

                Text(text)
                    .font(.system(size: 15, weight: .bold))
                    .lineSpacing(4)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 0)
            }
            .foregroundStyle(foreground(isAnswer: isAnswer, isWrong: isWrong, selected: selected))
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                background(isAnswer: isAnswer, isWrong: isWrong, selected: selected),
                in: .rect(cornerRadius: DS.Radius.md)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.md).strokeBorder(
                    border(isAnswer: isAnswer, isWrong: isWrong, selected: selected),
                    lineWidth: 1
                )
            )
        }
        .buttonStyle(.plain)
        .disabled(session.isChecked)
        .animation(.smooth(duration: 0.2), value: selected)
    }

    private func background(isAnswer: Bool, isWrong: Bool, selected: Bool) -> Color {
        if isAnswer { return DS.Wash.success }
        if isWrong { return DS.Wash.danger }
        return selected ? DS.Wash.brand : DS.Surface.level0
    }

    private func border(isAnswer: Bool, isWrong: Bool, selected: Bool) -> Color {
        if isAnswer { return DS.Solid.success }
        if isWrong { return DS.Solid.danger }
        return selected ? DS.Solid.brand500 : DS.Surface.level200
    }

    private func foreground(isAnswer: Bool, isWrong: Bool, selected: Bool) -> Color {
        if isAnswer { return DS.BrandText.success }
        if isWrong { return DS.BrandText.danger }
        return selected ? DS.BrandText.deep : DS.Surface.level700
    }

    private func labelBackground(isAnswer: Bool, isWrong: Bool, selected: Bool) -> Color {
        if isAnswer { return DS.Solid.success }
        if isWrong { return DS.Solid.danger }
        return selected ? DS.Solid.brand : DS.Surface.level100
    }

    private func explanationCard(_ question: ReadingQuestion) -> some View {
        let correct = session.result(at: session.index) == true

        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(correct ? DS.BrandText.success : DS.BrandText.danger)
                Text(correct ? "정답입니다" : "오답입니다")
                    .font(.system(size: 16, weight: .black))
                    .foregroundStyle(DS.Surface.level900)
                Spacer(minLength: 0)
            }

            Text(question.explanationKo)
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

    /// 안내 문구와 진행 버튼. 웹과 같은 문장을 쓴다.
    private var footer: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(footerHint)
                .font(.system(size: 14, weight: .bold))
                .lineSpacing(4)
                .foregroundStyle(DS.Surface.level500)
                .fixedSize(horizontal: false, vertical: true)

            if session.isChecked {
                Button("리포트 보기") { session.showReport() }
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            } else if session.index < session.total - 1 {
                Button("다음 문항") { session.goToNextQuestion() }
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                    .disabled(session.currentSelection == nil)
            } else {
                Button("정답 확인") { session.check() }
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                    .disabled(!session.allAnswered)
            }
        }
    }

    private var footerHint: String {
        if session.isChecked {
            return "전체 문항의 정답과 해설을 확인할 수 있습니다."
        }
        if session.allAnswered {
            return "모든 문항을 풀었습니다. 이제 한 번에 정답을 확인하세요."
        }
        return "남은 문항 \(session.total - session.answeredCount)개를 풀면 정답 확인이 열립니다."
    }
}

// MARK: - 공통 상태 화면

/// AI 생성 대기 화면. TOEFL 모드들이 함께 쓴다.
struct ToeflGeneratingState: View {
    let title: String
    let detail: String
    /// 재시도 중이면 몇 번째인지 알려준다.
    var attemptNote: String?

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 34, weight: .bold))
                .foregroundStyle(DS.BrandText.base)
                .symbolEffect(.pulse)

            Text(title)
                .font(.system(size: 20, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(DS.Surface.level900)
                .multilineTextAlignment(.center)

            Text(detail)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DS.Surface.level500)
                .multilineTextAlignment(.center)

            if let attemptNote {
                Text(attemptNote)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(DS.BrandText.warning)
                    .padding(.top, 4)
            }
        }
        .padding(40)
    }
}

/// 생성 실패 화면.
struct ToeflFailedState: View {
    let message: String
    let onRetry: () -> Void
    let onExit: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("문제 생성 실패")
                .font(.system(size: 20, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(DS.Surface.level900)

            Text(message)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DS.BrandText.danger)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 12) {
                Button("다시 시도", action: onRetry)
                    .buttonStyle(.ds(.primary, size: .md))
                Button("나가기", action: onExit)
                    .buttonStyle(.ds(.secondary, size: .md))
            }
            .padding(.top, 8)
        }
        .padding(32)
    }
}

extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
