import SwiftUI

/// 웹 `src/components/ToeflReadingMockTest.jsx`의 이식.
///
/// Stage 1을 풀면 정답률에 따라 Stage 2 난이도가 갈린다. Reading task와 달리
/// **문항마다 지문이 따로** 붙고, 한 문항씩 바로 채점한다.
struct ReadingMockQuizView: View {
    let session: ReadingMockSession

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                switch session.phase {
                case .generating:
                    ToeflGeneratingState(
                        title: "TOEFL Reading 모의고사를 생성 중입니다",
                        detail: "adaptive stage 모듈을 준비하고 있어요.",
                        attemptNote: session.stageTwoDifficulty.map {
                            "Stage 1 결과에 맞춰 \($0 == .upper ? "상위" : "하위") 모듈을 만드는 중"
                        }
                    )
                case let .failed(message):
                    ToeflFailedState(
                        message: message,
                        onRetry: { session.retryModule() },
                        onExit: { dismiss() }
                    )
                case .solving, .checked:
                    solvingState
                case .report:
                    if let report = session.report {
                        ToeflReadingReportView(
                            report: report,
                            taskLabel: "TOEFL Reading Mock Test",
                            difficulty: session.difficulty,
                            band: session.band,
                            subtitleOverride: reportSubtitle,
                            onExit: { dismiss() }
                        )
                    }
                }
            }
            .navigationTitle("Reading Mock Test")
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

    private var reportSubtitle: String {
        let stage2 = session.stageTwoDifficulty == .upper ? "Upper" : "Lower"
        return "정답 \(session.correctCount)/\(session.totalAnswered) · Stage 2 \(stage2) module · 정답률 \(session.accuracy)%"
    }

    // MARK: - 푸는 화면

    /// 지문과 문항을 좌우로 나눈다. 문항마다 지문이 다르므로 다음 문항으로 넘어가면
    /// 새 지문부터 다시 보여준다.
    private var solvingState: some View {
        ToeflReadingPager(
            questionCount: 1,
            // 모의고사는 한 문항씩 바로 채점하므로 좌우로 넘길 문항이 없다.
            questionIndex: .constant(0),
            passageResetID: AnyHashable("\(session.stage)-\(session.index)")
        ) {
            VStack(alignment: .leading, spacing: 24) {
                headerRow

                if let item = session.currentItem {
                    stimulusCard(item)
                }
            }
        } question: { _ in
            if let item = session.currentItem {
                questionSection(item)
            }
        }
    }

    private var headerRow: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("TOEFL Reading Mock Test")
                    .font(.system(size: 24, weight: .black))
                    .tracking(-0.6)
                    .foregroundStyle(DS.Surface.level900)
                    .fixedSize(horizontal: false, vertical: true)

                Text("\(session.moduleLabel) · 문항 \(session.index + 1)/\(session.moduleTotal)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(DS.Surface.level500)
                    .fixedSize(horizontal: false, vertical: true)
            }

            FlowLayout(spacing: 8) {
                DSBadge(text: session.difficulty.label, tone: .brand, style: .pill, size: .xs)
                DSBadge(text: "Stage \(session.stage)", tone: .accent, style: .pill, size: .xs)
                if session.totalAnswered > 0 {
                    DSBadge(
                        text: "정답 \(session.correctCount)/\(session.totalAnswered)",
                        tone: .success,
                        style: .pill,
                        size: .xs
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func stimulusCard(_ item: ReadingMockItem) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "book")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(DS.BrandText.base)
                Text(item.taskLabel.uppercased())
                    .font(.system(size: 12, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)
                Spacer(minLength: 0)
            }
            .padding(.bottom, 16)

            Text(item.title)
                .font(.system(size: 20, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(DS.Surface.level900)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 12)

            // 지문의 단어를 눌러 그 자리에서 단어장에 넣을 수 있다.
            VocabularyCaptureText(
                text: item.stimulus,
                sourceLabel: "TOEFL Reading Mock Test",
                canExplain: session.phase == .checked
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

    private func questionSection(_ item: ReadingMockItem) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text(item.skillTag.uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)

                Text(item.prompt)
                    .font(.system(size: 18, weight: .black))
                    .tracking(-0.45)
                    .lineSpacing(4)
                    .foregroundStyle(DS.Surface.level900)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(spacing: 12) {
                ForEach(Array(item.options.enumerated()), id: \.offset) { index, option in
                    ToeflOptionButton(
                        label: ToeflReadingReport.optionLabels[safe: index] ?? "\(index + 1)",
                        text: option,
                        selected: session.selected == index,
                        isAnswer: session.phase == .checked && index == item.answerIndex,
                        isWrong: session.phase == .checked
                            && session.selected == index
                            && index != item.answerIndex,
                        disabled: session.phase == .checked,
                        action: { session.select(index) }
                    )
                }
            }

            if session.phase == .checked {
                explanationCard(item)
            }

            actionButton
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func explanationCard(_ item: ReadingMockItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: session.lastAnswerCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(session.lastAnswerCorrect ? DS.BrandText.success : DS.BrandText.danger)
                Text(session.lastAnswerCorrect ? "정답입니다" : "오답입니다")
                    .font(.system(size: 16, weight: .black))
                    .foregroundStyle(DS.Surface.level900)
                Spacer(minLength: 0)
            }

            Text(item.explanationKo)
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

    @ViewBuilder
    private var actionButton: some View {
        if session.phase == .checked {
            Button(session.advanceTitle) { Task { await session.advance() } }
                .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
        } else {
            Button("정답 확인") { session.check() }
                .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                .disabled(session.selected == nil)
        }
    }
}

/// TOEFL 객관식 보기 버튼. Reading task와 모의고사가 함께 쓴다.
struct ToeflOptionButton: View {
    let label: String
    let text: String
    let selected: Bool
    let isAnswer: Bool
    let isWrong: Bool
    let disabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 12) {
                Text(label)
                    .font(.system(size: 12, weight: .black))
                    .frame(width: 24, height: 24)
                    .background(labelBackground, in: .circle)
                    .foregroundStyle(isAnswer || isWrong || selected ? .white : DS.Surface.level500)

                Text(text)
                    .font(.system(size: 15, weight: .bold))
                    .lineSpacing(4)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 0)
            }
            .foregroundStyle(foreground)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(background, in: .rect(cornerRadius: DS.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.md).strokeBorder(border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .animation(.smooth(duration: 0.2), value: selected)
    }

    private var background: Color {
        if isAnswer { return DS.Wash.success }
        if isWrong { return DS.Wash.danger }
        return selected ? DS.Wash.brand : DS.Surface.level0
    }

    private var border: Color {
        if isAnswer { return DS.Solid.success }
        if isWrong { return DS.Solid.danger }
        return selected ? DS.Solid.brand500 : DS.Surface.level200
    }

    private var foreground: Color {
        if isAnswer { return DS.BrandText.success }
        if isWrong { return DS.BrandText.danger }
        return selected ? DS.BrandText.deep : DS.Surface.level700
    }

    private var labelBackground: Color {
        if isAnswer { return DS.Solid.success }
        if isWrong { return DS.Solid.danger }
        return selected ? DS.Solid.brand : DS.Surface.level100
    }
}
