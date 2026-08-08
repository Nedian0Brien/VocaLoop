import SwiftUI

/// 웹 `src/components/CompleteWordQuiz.jsx`의 이식.
///
/// 복합 퀴즈의 마지막 단계다. 단어가 들어간 예문 하나를 골라 그 단어를 빈칸으로
/// 만들고, 철자를 한 글자씩 채우게 한다. 처음에는 글자를 하나도 보여주지 않고,
/// 힌트를 누르면 앞 두 글자를 열어 준다.
struct CompleteWordStageView: View {
    let word: Word
    let onAnswer: (String, Bool) -> Void

    @State private var typed: [String] = []
    @State private var showHint = false
    @State private var isAnswered = false
    @State private var feedback: Bool?
    @FocusState private var focusedIndex: Int?

    private var answer: String { word.word }

    /// 힌트를 누르면 앞 두 글자를 연다 (웹과 같은 값).
    private var segments: [BlankSegment] {
        CompleteWordEngine.segments(for: answer, prefixRevealCount: showHint ? 2 : 0)
    }

    private var editableIndices: [Int] { CompleteWordEngine.editableIndices(segments) }

    private var isFilled: Bool {
        !editableIndices.isEmpty && editableIndices.allSatisfy { !letter(at: $0).isEmpty }
    }

    private var isCorrect: Bool {
        CompleteWordEngine.isBlankCorrect(answer: answer, segments: segments, input: typed)
    }

    var body: some View {
        QuizCardShell {
            QuizIntroHeader(
                modeLabel: "Complete Word",
                eyebrow: "One-Sentence Task",
                title: "Complete the missing word."
            )
        } content: {
            promptRow.padding(.bottom, 24)
            sentence.padding(.bottom, 24)

            if isAnswered {
                QuizVerdictBanner(
                    isCorrect: isCorrect,
                    title: isCorrect ? "Correct!" : "Try Again Soon",
                    detail: verdictDetail
                )
                .padding(.bottom, 24)

                answerDetail.padding(.bottom, 24)
            }

            actionButton
        }
        .sensoryFeedback(.success, trigger: feedback) { _, new in new == true }
        .sensoryFeedback(.error, trigger: feedback) { _, new in new == false }
        .animation(.smooth(duration: 0.25), value: isAnswered)
        .onAppear {
            typed = Array(repeating: "", count: answer.count)
            focusedIndex = editableIndices.first
        }
    }

    // MARK: - 문제

    private var promptRow: some View {
        HStack(alignment: .center, spacing: 12) {
            QuizPromptLabel(text: "빈칸에 들어갈 단어를 입력하세요")

            Button("HINT") { reveal() }
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.BrandText.base)
                .buttonStyle(.plain)
                .disabled(isAnswered || showHint)
                .opacity(isAnswered || showHint ? 0.3 : 1)
        }
    }

    /// 예문을 단어 단위로 흘려 배치하고, 빈칸 자리에는 글자 칸을 끼워 넣는다.
    private var sentence: some View {
        FlowLayout(spacing: 4) {
            ForEach(Array(tokens.enumerated()), id: \.offset) { _, token in
                switch token {
                case let .text(value):
                    Text(value)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(DS.Surface.level900)
                case .blank:
                    blank
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

    private var blank: some View {
        HStack(spacing: 0) {
            ForEach(Array(segments.enumerated()), id: \.offset) { index, segment in
                cell(segment, isLast: index == segments.count - 1)
            }
        }
        .background(blankBackground, in: .rect(cornerRadius: DS.Radius.xs))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xs)
                .strokeBorder(blankBorder, lineWidth: 1)
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("단어 철자 입력")
    }

    private var blankBackground: Color {
        if isAnswered { return isCorrect ? DS.Wash.success : DS.Wash.danger }
        return isFilled ? DS.Wash.brand : DS.Surface.level0
    }

    private var blankBorder: Color {
        if isAnswered { return isCorrect ? DS.Solid.success : DS.Solid.danger }
        return isFilled ? DS.Solid.brand500.opacity(0.6) : DS.Surface.level300
    }

    @ViewBuilder
    private func cell(_ segment: BlankSegment, isLast: Bool) -> some View {
        switch segment {
        case let .fixed(char):
            Text(String(char))
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(DS.Surface.level800)
                .frame(width: 22, height: 32)
                .background(DS.Surface.level50)
                .overlay(alignment: .trailing) { divider(isLast) }

        case let .editable(index):
            LetterField(
                text: Binding(
                    get: {
                        // 틀렸으면 정답 철자를 보여준다 (웹과 같은 처리).
                        if isAnswered, !isCorrect { return String(Array(answer)[index]) }
                        return letter(at: index)
                    },
                    set: { setLetter($0, at: index) }
                ),
                tint: cellTint
            )
            .disabled(isAnswered)
            .focused($focusedIndex, equals: index)
            .overlay(alignment: .trailing) { divider(isLast) }
        }
    }

    private var cellTint: Color {
        guard isAnswered else { return DS.BrandText.base }
        return isCorrect ? DS.BrandText.success : DS.BrandText.danger
    }

    @ViewBuilder
    private func divider(_ isLast: Bool) -> some View {
        if !isLast {
            Rectangle().fill(DS.Surface.level200).frame(width: 1)
        }
    }

    private enum Token {
        case text(String)
        case blank
    }

    /// 예문을 placeholder 기준으로 잘라 단어 조각과 빈칸으로 만든다.
    private var tokens: [Token] {
        let paragraph = CompleteWordStageView.sentence(for: word)
        var result: [Token] = []

        for (index, piece) in paragraph.components(separatedBy: "{{1}}").enumerated() {
            if index > 0 { result.append(.blank) }
            for chunk in piece.split(separator: " ", omittingEmptySubsequences: true) {
                result.append(.text(String(chunk)))
            }
        }

        return result
    }

    // MARK: - 채점 후 정보

    private var verdictDetail: Text {
        if isCorrect {
            return Text("가장 어려운 단계를 통과했어요.")
                .foregroundStyle(DS.BrandText.success.opacity(0.75))
        }
        return Text("정답은 ")
            .foregroundStyle(DS.BrandText.danger.opacity(0.75))
            + Text(answer)
            .font(.system(size: 16, weight: .black))
            .foregroundStyle(DS.BrandText.danger)
            + Text(" 입니다.")
            .foregroundStyle(DS.BrandText.danger.opacity(0.75))
    }

    private var answerDetail: some View {
        VStack(alignment: .leading, spacing: 12) {
            infoCard(eyebrow: "Meaning") {
                Text(word.primaryMeaning.isEmpty ? "-" : word.primaryMeaning)
                    .font(.system(size: 17, weight: .black))
                    .foregroundStyle(DS.Surface.level900)

                if let definition = word.definitionsKo.first, !definition.isEmpty {
                    Text(definition)
                        .font(.system(size: 12, weight: .bold))
                        .lineSpacing(6)
                        .foregroundStyle(DS.Surface.level500)
                }
            }

            if let example = word.examples.first {
                infoCard(eyebrow: "Example") {
                    Text("\"\(example.en)\"")
                        .font(.system(size: 14, weight: .black))
                        .lineSpacing(4)
                        .foregroundStyle(DS.Surface.level900)
                    Text(example.ko)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(DS.Surface.level500)
                }
            }
        }
    }

    private func infoCard<Content: View>(
        eyebrow: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(eyebrow.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)
            content()
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.md)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
    }

    private var actionButton: some View {
        Button {
            if isAnswered {
                onAnswer(
                    CompleteWordEngine.userAnswer(segments: segments, input: typed),
                    isCorrect
                )
            } else {
                check()
            }
        } label: {
            Text(isAnswered ? "다음 문제" : "정답 확인")
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(
                    isAnswered || isFilled ? DS.Surface.level800 : DS.Surface.level100,
                    in: .rect(cornerRadius: 24)
                )
                .foregroundStyle(isAnswered || isFilled ? Color.white : DS.Surface.level400)
        }
        .buttonStyle(.plain)
        .disabled(!isAnswered && !isFilled)
        .animation(.smooth(duration: 0.2), value: isFilled)
    }

    // MARK: - 입력

    private func letter(at index: Int) -> String {
        index < typed.count ? typed[index] : ""
    }

    private func setLetter(_ value: String, at index: Int) {
        guard !isAnswered, index < typed.count else { return }

        // 마지막에 넣은 알파벳 한 글자만 남긴다 (웹과 같은 처리).
        let sanitized = String(value.filter { $0.isASCII && $0.isLetter }.suffix(1))
        typed[index] = sanitized

        if !sanitized.isEmpty, let next = editableIndices.first(where: { $0 > index }) {
            focusedIndex = next
        }
    }

    /// 힌트로 열린 글자는 입력값에서 지워 둔다. 그대로 두면 채점이 어긋난다.
    private func reveal() {
        showHint = true
        for index in 0..<typed.count where !editableIndices.contains(index) {
            typed[index] = ""
        }
        focusedIndex = editableIndices.first
    }

    private func check() {
        guard !isAnswered, isFilled else { return }
        focusedIndex = nil
        isAnswered = true
        feedback = isCorrect
    }
}

// MARK: - 예문 고르기

extension CompleteWordStageView {
    /// 단어가 그대로 들어간 예문을 찾아 그 자리를 `{{1}}`로 바꾼다.
    /// 맞는 예문이 없으면 웹과 같은 기본 문장을 쓴다.
    static func sentence(for word: Word) -> String {
        let target = word.word.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !target.isEmpty else { return "{{1}}." }

        let pattern = "\\b\(NSRegularExpression.escapedPattern(for: target))\\b"

        for example in word.examples {
            if let range = example.en.range(
                of: pattern,
                options: [.regularExpression, .caseInsensitive]
            ) {
                return example.en.replacingCharacters(in: range, with: "{{1}}")
            }
        }

        return "The passage uses {{1}} as the missing vocabulary word."
    }
}

/// 한 글자만 받는 입력 칸.
private struct LetterField: View {
    @Binding var text: String
    var tint: Color

    var body: some View {
        TextField("", text: $text)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(.asciiCapable)
            .multilineTextAlignment(.center)
            .font(.system(size: 17, weight: .bold))
            .foregroundStyle(tint)
            .frame(width: 22, height: 32)
            .background(DS.Surface.level0)
    }
}

#if DEBUG
#Preview("단어 완성") {
    ScrollView {
        VStack(spacing: 24) {
            QuizProgressHeader(current: 4, total: 10, correct: 3, wrong: 0)
            CompleteWordStageView(word: PreviewData.serendipity, onAnswer: { _, _ in })
        }
        .padding(16)
    }
    .background(DS.Surface.level50)
}
#endif
