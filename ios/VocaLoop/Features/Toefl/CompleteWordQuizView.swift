import SwiftUI

/// 웹 `src/components/ToeflCompleteTheWordQuiz.jsx`의 이식.
///
/// 지문 안의 빈칸을 한 글자씩 채우는 모드다. 지문은 흐르는 텍스트인데
/// 중간에 입력 칸이 섞여야 해서, 문단을 placeholder 기준으로 잘라
/// 텍스트 조각과 빈칸 위젯을 번갈아 배치한다.
struct CompleteWordQuizView: View {
    let session: CompleteWordSession

    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedCell: CellID?

    /// 어느 문항의 어느 빈칸의 몇 번째 글자인지.
    struct CellID: Hashable {
        let blankIndex: Int
        let inputIndex: Int
    }

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
            .navigationTitle("Complete the Words")
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
                .foregroundStyle(DS.BrandText.base)
                .symbolEffect(.pulse)
            Text("TOEFL 문제를 생성 중입니다")
                .font(.system(size: 20, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(DS.Surface.level900)
            Text("학술적 문단을 준비하고 있어요. 잠시만 기다려주세요.")
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
                    correct: session.totalCorrect,
                    wrong: session.totalBlanks - session.totalCorrect
                )

                if let question = session.currentQuestion {
                    QuizCardShell {
                        QuizIntroHeader(
                            modeLabel: "Complete the Words",
                            eyebrow: "Academic Passage",
                            title: "빈칸에 알맞은 단어를 채우세요"
                        )
                    } content: {
                        passage(for: question)
                            .padding(.bottom, 24)

                        if session.phase == .checked {
                            answerReview(for: question).padding(.bottom, 24)
                        }

                        actionButton(for: question)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .scrollDismissesKeyboard(.interactively)
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
                        Text("빈칸 \(session.totalBlanks)개 중 \(session.totalCorrect)개 정답")
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

    // MARK: - 지문

    /// 지문을 placeholder 기준으로 쪼개 텍스트와 빈칸을 번갈아 흘려 배치한다.
    private func passage(for question: PreparedCompleteQuestion) -> some View {
        let source = session.phase == .checked ? question.fullParagraph : question.paragraph

        return Group {
            if session.phase == .checked {
                // 채점 후에는 완성 지문을 그대로 보여준다.
                Text(source)
                    .font(.system(size: 16, weight: .medium))
                    .lineSpacing(10)
                    .foregroundStyle(DS.Surface.level800)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                FlowLayout(spacing: 4) {
                    ForEach(Array(tokens(of: question).enumerated()), id: \.offset) { _, token in
                        switch token {
                        case let .text(value):
                            Text(value)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(DS.Surface.level800)
                        case let .blank(blankIndex):
                            blankView(question: question, blankIndex: blankIndex)
                        }
                    }
                }
            }
        }
    }

    private enum PassageToken {
        case text(String)
        case blank(Int)
    }

    /// `{{3}}`을 만나면 해당 id의 빈칸으로, 나머지는 단어 단위 텍스트로 나눈다.
    /// 단어 단위로 쪼개야 FlowLayout이 자연스럽게 줄바꿈한다.
    private func tokens(of question: PreparedCompleteQuestion) -> [PassageToken] {
        var result: [PassageToken] = []
        var remainder = Substring(question.paragraph)

        while let match = remainder.firstMatch(of: /\{\{(\d+)\}\}/) {
            let before = remainder[remainder.startIndex..<match.range.lowerBound]
            appendWords(String(before), to: &result)

            if let id = Int(match.output.1),
               let blankIndex = question.blanks.firstIndex(where: { $0.id == id }) {
                result.append(.blank(blankIndex))
            }
            remainder = remainder[match.range.upperBound...]
        }

        appendWords(String(remainder), to: &result)
        return result
    }

    private func appendWords(_ text: String, to result: inout [PassageToken]) {
        for word in text.split(separator: " ", omittingEmptySubsequences: true) {
            result.append(.text(String(word)))
        }
    }

    // MARK: - 빈칸

    private func blankView(question: PreparedCompleteQuestion, blankIndex: Int) -> some View {
        let blank = question.blanks[blankIndex]
        let typed = blankIndex < session.currentInput.count ? session.currentInput[blankIndex] : []
        let isFilled = CompleteWordEngine.editableIndices(blank.segments).allSatisfy {
            !($0 < typed.count ? typed[$0] : "").isEmpty
        }

        return HStack(spacing: 0) {
            ForEach(Array(blank.segments.enumerated()), id: \.offset) { segmentIndex, segment in
                cell(
                    blank: blank,
                    blankIndex: blankIndex,
                    segment: segment,
                    isLast: segmentIndex == blank.segments.count - 1
                )
            }
        }
        .background(isFilled ? DS.Wash.brand : DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.xs))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xs).strokeBorder(
                isFilled ? DS.Solid.brand500.opacity(0.6) : DS.Surface.level300,
                lineWidth: 1
            )
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("빈칸 \(blankIndex + 1)")
    }

    @ViewBuilder
    private func cell(
        blank: PreparedBlank,
        blankIndex: Int,
        segment: BlankSegment,
        isLast: Bool
    ) -> some View {
        switch segment {
        case let .fixed(char):
            Text(String(char))
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(DS.Surface.level800)
                .frame(width: 20, height: 30)
                .background(DS.Surface.level50)
                .overlay(alignment: .trailing) {
                    if !isLast {
                        Rectangle().fill(DS.Surface.level200).frame(width: 1)
                    }
                }

        case let .editable(inputIndex):
            LetterCell(
                text: Binding(
                    get: {
                        let typed = blankIndex < session.currentInput.count
                            ? session.currentInput[blankIndex] : []
                        return inputIndex < typed.count ? typed[inputIndex] : ""
                    },
                    set: { newValue in
                        session.setLetter(newValue, blankIndex: blankIndex, inputIndex: inputIndex)
                        // 한 글자를 넣으면 다음 칸으로 자동 이동한다.
                        if !newValue.isEmpty {
                            focusNext(after: CellID(blankIndex: blankIndex, inputIndex: inputIndex))
                        }
                    }
                )
            )
            .focused($focusedCell, equals: CellID(blankIndex: blankIndex, inputIndex: inputIndex))
            .overlay(alignment: .trailing) {
                if !isLast {
                    Rectangle().fill(DS.Surface.level200).frame(width: 1)
                }
            }
        }
    }

    /// 같은 빈칸의 다음 입력 칸, 없으면 다음 빈칸의 첫 칸으로 옮긴다.
    private func focusNext(after cell: CellID) {
        guard let question = session.currentQuestion else { return }

        let indices = CompleteWordEngine.editableIndices(
            question.blanks[cell.blankIndex].segments
        )
        if let position = indices.firstIndex(of: cell.inputIndex),
           position + 1 < indices.count {
            focusedCell = CellID(blankIndex: cell.blankIndex, inputIndex: indices[position + 1])
            return
        }

        let nextBlank = cell.blankIndex + 1
        if nextBlank < question.blanks.count,
           let first = CompleteWordEngine.editableIndices(question.blanks[nextBlank].segments).first {
            focusedCell = CellID(blankIndex: nextBlank, inputIndex: first)
        } else {
            focusedCell = nil
        }
    }

    // MARK: - 채점 결과

    private func answerReview(for question: PreparedCompleteQuestion) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            QuizPromptLabel(text: "정답 확인")

            ForEach(Array(question.blanks.enumerated()), id: \.element.id) { blankIndex, blank in
                let typed = blankIndex < session.currentInput.count
                    ? session.currentInput[blankIndex] : []
                let isCorrect = CompleteWordEngine.isBlankCorrect(
                    answer: blank.answer,
                    segments: blank.segments,
                    input: typed
                )

                HStack(spacing: 10) {
                    Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(isCorrect ? DS.BrandText.success : DS.BrandText.danger)

                    Text(blank.answer)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(DS.Surface.level900)

                    if !isCorrect {
                        Text("입력: \(CompleteWordEngine.userAnswer(blank: blank, input: typed))")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(DS.Surface.level500)
                    }

                    Spacer(minLength: 0)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    isCorrect ? DS.Wash.success : DS.Wash.danger,
                    in: .rect(cornerRadius: DS.Radius.md)
                )
            }
        }
    }

    private func actionButton(for question: PreparedCompleteQuestion) -> some View {
        let canCheck = session.filledCount == question.blanks.count

        return Button {
            if session.phase == .checked {
                session.advance()
                focusedCell = nil
            } else {
                session.check()
                focusedCell = nil
            }
        } label: {
            Text(session.phase == .checked ? "다음 지문" : checkLabel(question: question))
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(
                    session.phase == .checked || canCheck
                        ? DS.Surface.level800 : DS.Surface.level100,
                    in: .rect(cornerRadius: 24)
                )
                .foregroundStyle(
                    session.phase == .checked || canCheck ? Color.white : DS.Surface.level400
                )
        }
        .buttonStyle(.plain)
        .disabled(session.phase != .checked && !canCheck)
    }

    private func checkLabel(question: PreparedCompleteQuestion) -> String {
        let filled = session.filledCount
        let total = question.blanks.count
        return filled == total ? "정답 확인" : "빈칸 \(total - filled)개 남음"
    }
}

/// 한 글자만 받는 입력 칸.
private struct LetterCell: View {
    @Binding var text: String

    var body: some View {
        TextField("", text: $text)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(.asciiCapable)
            .multilineTextAlignment(.center)
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(DS.Surface.level900)
            .frame(width: 20, height: 30)
            .background(DS.Surface.level0)
    }
}
