import SwiftUI

/// 웹 `src/components/MultipleChoiceQuiz.jsx`의 이식.
/// 수치는 웹을 375pt로 렌더링해 측정한 값이다.
struct MultipleChoiceQuizView: View {
    let word: Word
    let choices: [String]
    /// 설정에서 AI 모드를 켰는지. 켜져 있으면 헷갈릴 만한 오답 보기를 AI가 만든다.
    var aiMode: Bool = false
    var grader: AiQuizGrader?
    let onAnswer: (String, Bool) -> Void

    /// 화면에 그리는 보기. AI 보기를 받아오면 갈아끼운다.
    @State private var options: [String] = []
    @State private var isLoadingOptions = false
    @State private var selected: String?
    /// 보기를 고른 것만으로는 정답이 드러나지 않는다. 웹처럼 "정답 확인"을
    /// 눌러야 채점되며, 그전까지는 고른 보기만 브랜드색으로 표시한다.
    @State private var isAnswered = false
    @State private var feedback: Bool?

    private var answer: String { word.primaryMeaning }
    private var isCorrect: Bool { selected == answer }

    var body: some View {
        QuizCard(word: word, modeLabel: "Multiple Choice", onSpeak: speak) {
            HStack(spacing: 12) {
                QuizPromptLabel(text: "정확한 한국어 뜻을 선택하세요:")
                if isLoadingOptions {
                    ProgressView().controlSize(.small)
                }
            }
            .padding(.bottom, 24)

            VStack(spacing: 12) {
                ForEach(Array(options.enumerated()), id: \.element) { index, choice in
                    ChoiceButton(
                        index: index + 1,
                        text: choice,
                        state: state(for: choice),
                        action: { select(choice) }
                    )
                }
            }
            .padding(.bottom, 32)

            if isAnswered {
                QuizVerdictBanner(
                    isCorrect: isCorrect,
                    // 웹은 제목 뒤에 이모지를 붙이지만 좁은 화면에서 혼자 줄바꿈돼 뺐다.
                    title: isCorrect ? "Correct Answer!" : "Study More",
                    detail: verdictDetail
                )
                .padding(.bottom, 32)

                QuizNextButton {
                    if let selected { onAnswer(selected, selected == answer) }
                }
                .padding(.bottom, 32)

                // 웹은 채점 뒤 정의·뉘앙스·예문·유의어를 이어서 보여준다.
                WordInsightPanel(word: word)
            } else {
                submitButton
            }
        }
        .sensoryFeedback(.success, trigger: feedback) { _, new in new == true }
        .sensoryFeedback(.error, trigger: feedback) { _, new in new == false }
        .animation(.smooth(duration: 0.25), value: isAnswered)
        .task { await prepareOptions() }
        .onAppear(perform: speak)
    }

    /// 채점 전 버튼. 웹은 보기를 고르기 전에는 회색으로 잠가 둔다.
    private var submitButton: some View {
        Button(action: check) {
            Text(selected == nil ? "뜻을 선택하세요" : "정답 확인")
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(
                    selected == nil ? DS.Surface.level100 : DS.Solid.brand,
                    in: .rect(cornerRadius: DS.Radius.xl)
                )
                .foregroundStyle(selected == nil ? DS.Surface.level400 : Color.white)
        }
        .buttonStyle(.plain)
        .disabled(selected == nil)
        .animation(.smooth(duration: 0.2), value: selected)
    }

    private var verdictDetail: Text {
        if isCorrect {
            return Text("잘 맞췄어요!").foregroundStyle(DS.BrandText.success.opacity(0.7))
        }
        return Text("정답은 ")
            .foregroundStyle(DS.BrandText.danger.opacity(0.7))
            + Text(answer)
            .font(.system(size: 16, weight: .black))
            .foregroundStyle(DS.BrandText.danger)
            + Text(" 입니다.")
            .foregroundStyle(DS.BrandText.danger.opacity(0.7))
    }

    private func state(for choice: String) -> ChoiceButton.State {
        guard isAnswered else {
            return choice == selected ? .selected : .idle
        }
        if choice == answer { return .correct }
        if choice == selected { return .wrong }
        return .dimmed
    }

    /// 로컬 보기를 먼저 세워 두고, AI 모드면 더 헷갈리는 보기로 갈아끼운다.
    /// 실패하면 로컬 보기를 그대로 쓴다 — 웹도 그렇게 되돌린다.
    private func prepareOptions() async {
        guard options.isEmpty else { return }
        options = choices

        guard aiMode, let grader else { return }

        isLoadingOptions = true
        defer { isLoadingOptions = false }

        if let generated = try? await grader.multipleChoiceOptions(for: word),
           generated.contains(answer) {
            // 정답이 빠진 보기를 받으면 풀 수 없는 문제가 되므로 버린다.
            options = generated
        }
    }

    private func speak() {
        SpeechSynthesizer.shared.speak(word.word)
    }

    private func select(_ choice: String) {
        guard !isAnswered else { return }
        selected = choice
    }

    private func check() {
        guard !isAnswered, let selected else { return }
        isAnswered = true
        feedback = selected == answer
    }
}

/// 웹의 보기 버튼 — 번호 원형 + 뜻 + 배경에 깔리는 고스트 숫자.
struct ChoiceButton: View {
    enum State {
        /// 고르기 전.
        case idle
        /// 골랐지만 아직 채점 전 — 브랜드색으로 세워만 둔다.
        case selected
        case correct, wrong, dimmed
    }

    let index: Int
    let text: String
    let state: State
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // 번호 원형: 36×36, 모서리 16, 보더 2
                Text("\(index)")
                    .font(.system(size: 12, weight: .black))
                    .frame(width: 36, height: 36)
                    .background(badgeBackground, in: .rect(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(badgeBorder, lineWidth: 2)
                    )
                    .foregroundStyle(badgeForeground)

                Text(text)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(textColor)
                    .multilineTextAlignment(.leading)

                Spacer(minLength: 0)

                if let symbol {
                    Image(systemName: symbol)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(accent)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(alignment: .bottomTrailing) {
                // 웹의 고스트 숫자 (72/900, surface-500 3%)
                Text("\(index)")
                    .font(.system(size: 72, weight: .black))
                    .foregroundStyle(DS.Surface.level500.opacity(0.03))
                    .offset(x: 8, y: 16)
                    .allowsHitTesting(false)
            }
            .background(background, in: .rect(cornerRadius: 24))
            .overlay(
                RoundedRectangle(cornerRadius: 24).strokeBorder(border, lineWidth: 2)
            )
            .clipShape(.rect(cornerRadius: 24))
        }
        .buttonStyle(.plain)
        .opacity(state == .dimmed ? 0.45 : 1)
        .animation(.smooth(duration: 0.3), value: state)
    }

    private var symbol: String? {
        switch state {
        case .correct: return "checkmark.circle.fill"
        case .wrong: return "xmark.circle.fill"
        case .idle, .selected, .dimmed: return nil
        }
    }

    private var accent: Color {
        state == .correct ? DS.BrandText.success : DS.BrandText.danger
    }

    private var background: Color {
        switch state {
        case .correct: return DS.Wash.success
        case .wrong: return DS.Wash.danger
        // 웹은 고른 보기에 brand-50을 30%만 깔아 아주 옅게 표시한다.
        case .selected: return DS.Wash.brand.opacity(0.3)
        case .idle, .dimmed: return DS.Surface.level0
        }
    }

    /// 기본 보더는 surface-50 — 거의 보이지 않는 얇은 테두리다.
    private var border: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .selected: return DS.Solid.brand
        case .idle, .dimmed: return DS.Surface.level50
        }
    }

    private var textColor: Color {
        switch state {
        case .correct: return DS.BrandText.success
        case .wrong: return DS.BrandText.danger
        case .selected: return DS.BrandText.base
        case .idle, .dimmed: return DS.Surface.level700
        }
    }

    private var badgeBackground: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .selected: return DS.Solid.brand
        case .idle, .dimmed: return DS.Surface.level50
        }
    }

    private var badgeBorder: Color {
        switch state {
        case .correct: return DS.Solid.success
        case .wrong: return DS.Solid.danger
        case .selected: return DS.Solid.brand
        case .idle, .dimmed: return DS.Surface.level100
        }
    }

    private var badgeForeground: Color {
        switch state {
        case .correct, .wrong, .selected: return .white
        case .idle, .dimmed: return DS.Surface.level400
        }
    }
}

#if DEBUG
#Preview("객관식") {
    ScrollView {
        VStack(spacing: 24) {
            QuizProgressHeader(current: 3, total: 10, correct: 2, wrong: 1)
            MultipleChoiceQuizView(
                word: PreviewData.serendipity,
                choices: ["어디에나 있는", "유창한", "뜻밖의 행운", "회복력"],
                onAnswer: { _, _ in }
            )
        }
        .padding(16)
    }
    .background(DS.Surface.level50)
}
#endif
