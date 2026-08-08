import SwiftUI

/// 웹 `src/components/ShortAnswerQuiz.jsx`의 이식.
///
/// 채점 뒤에는 맞았는지만 알려주고 넘기지 않는다. 웹처럼 **전체 뜻**과 정의·뉘앙스·
/// 예문·유의어를 그 자리에서 펼쳐, 틀린 단어를 바로 익히게 한다.
struct ShortAnswerQuizView: View {
    let word: Word
    var direction: ShortAnswerDirection = .enToKo
    /// 설정에서 AI 모드를 켰는지. 켜져 있으면 채점을 AI에게 맡긴다.
    var aiMode: Bool = false
    var grader: AiQuizGrader?
    /// AI가 인정한 답을 단어에 저장한다.
    var onAcceptAnswer: ((String, String?) async -> Void)?
    let onAnswer: (String, Bool) -> Void

    @State private var input = ""
    @State private var result: ShortAnswerGrading.Result?
    /// 로컬 채점 대신 AI가 내린 판정. 있으면 이쪽이 화면에 뜬다.
    @State private var aiFeedback: String?
    @State private var isGrading = false
    @State private var isReviewing = false
    @State private var reviewError: String?
    @State private var showHint = false
    @FocusState private var isFocused: Bool

    private var isKoToEn: Bool { direction == .koToEn }
    private var answer: String { QuizSession.answer(for: word, direction: direction) }
    private var isAnswered: Bool { result != nil }

    /// 웹은 한→영에서는 AI 채점을 쓰지 않는다. 철자를 묻는 문제라 의미 판단이 의미 없다.
    private var usesAiGrading: Bool { aiMode && !isKoToEn && grader != nil }

    /// 틀렸을 때만 재검토를 권한다. 맞은 답을 다시 물을 이유가 없다.
    private var canRequestReview: Bool {
        grader != nil && result?.isCorrect == false && !isReviewing
    }

    var body: some View {
        QuizCard(
            word: word,
            modeLabel: isKoToEn ? "Short Answer 한→영" : "Short Answer 영→한",
            promptOverride: isKoToEn ? word.primaryMeaning : nil,
            onSpeak: speak
        ) {
            promptRow.padding(.bottom, 12)
            answerField.padding(.bottom, 32)

            if let result {
                resultSection(result)
            } else {
                submitButton
            }
        }
        .sensoryFeedback(.success, trigger: result) { _, new in new?.isCorrect == true }
        .sensoryFeedback(.error, trigger: result) { _, new in new?.isCorrect == false }
        .onAppear {
            isFocused = true
            speak()
        }
        .animation(.smooth(duration: 0.3), value: isAnswered)
    }

    // MARK: - 입력

    private var promptRow: some View {
        HStack(alignment: .center, spacing: 12) {
            QuizPromptLabel(text: isKoToEn ? "영어 단어를 입력하세요" : "한국어 뜻을 입력하세요")

            Button("Get Hint") { showHint = true }
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.BrandText.base)
                .buttonStyle(.plain)
                .disabled(isAnswered || showHint)
                .opacity(isAnswered || showHint ? 0.3 : 1)
        }
    }

    /// 힌트는 첫 글자와 글자 수만 흘린다. 웹과 같은 형식이다 — `S******* (8글자)`
    private var placeholder: String {
        guard showHint else {
            return isKoToEn ? "영어 단어 입력..." : "뜻을 입력하세요..."
        }
        guard let first = answer.first else { return "" }
        return "\(first)\(String(repeating: "*", count: max(0, answer.count - 1))) (\(answer.count)글자)"
    }

    private var answerField: some View {
        TextField(placeholder, text: $input)
            .autocorrectionDisabled()
            .textInputAutocapitalization(isKoToEn ? .never : .sentences)
            .font(.system(size: 20, weight: .bold))
            .foregroundStyle(fieldForeground)
            .focused($isFocused)
            .submitLabel(.done)
            .onSubmit(check)
            .disabled(isAnswered)
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(fieldBackground, in: .rect(cornerRadius: DS.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.xl)
                    .strokeBorder(fieldBorder, lineWidth: 2)
            )
    }

    private var fieldBackground: Color {
        guard let result else { return DS.Surface.level50 }
        return result.isCorrect ? DS.Wash.success : DS.Wash.danger
    }

    private var fieldBorder: Color {
        guard let result else { return DS.Surface.level100 }
        return result.isCorrect ? DS.Solid.success : DS.Solid.danger
    }

    private var fieldForeground: Color {
        guard let result else { return DS.Surface.level900 }
        return result.isCorrect ? DS.BrandText.success : DS.BrandText.danger
    }

    private var submitButton: some View {
        Button(action: check) {
            Text(isGrading ? "채점 중..." : "정답 확인")
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(
                    canSubmit ? DS.Surface.level800 : DS.Surface.level100,
                    in: .rect(cornerRadius: DS.Radius.xl)
                )
                .foregroundStyle(canSubmit ? DS.Surface.level0 : DS.Surface.level400)
        }
        .buttonStyle(.plain)
        .disabled(!canSubmit)
        .animation(.smooth(duration: 0.2), value: canSubmit)
    }

    private var canSubmit: Bool {
        !isGrading && !input.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - 채점 결과

    @ViewBuilder
    private func resultSection(_ result: ShortAnswerGrading.Result) -> some View {
        QuizVerdictBanner(
            isCorrect: result.isCorrect,
            // 웹은 제목 뒤에 이모지를 붙이지만 좁은 화면에서 혼자 줄바꿈돼 뺐다.
            title: result.isCorrect ? "Great Job!" : "Incorrect",
            detail: verdictDetail(result)
        )
        .padding(.bottom, 12)

        if !result.unmatchedAnswers.isEmpty {
            unmatchedPanel(result.unmatchedAnswers).padding(.bottom, 12)
        }

        feedbackPanel(result).padding(.bottom, 12)

        if canRequestReview || isReviewing {
            aiReviewPanel.padding(.bottom, 12)
        }

        QuizNextButton { onAnswer(input, result.isCorrect) }
            .padding(.top, 20)
            .padding(.bottom, 32)

        WordInsightPanel(word: word)
    }

    /// 의미는 맞는데 로컬 채점이 걸러낸 답을 AI에게 다시 물어본다.
    private var aiReviewPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("의미가 맞는 답이라면 AI 재검토를 요청할 수 있습니다.")
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(DS.BrandText.deep)
                Text("정답으로 인정되면 이 표현은 다음 채점부터 자동으로 반영됩니다.")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(DS.BrandText.base)
            }
            .fixedSize(horizontal: false, vertical: true)

            Button {
                Task { await requestAiReview() }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles").font(.system(size: 14, weight: .bold))
                    Text(isReviewing ? "재검토 중..." : "AI 재검토")
                }
                .font(.system(size: 14, weight: .black))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    canRequestReview ? DS.Solid.brand : DS.Wash.brandStrong,
                    in: .rect(cornerRadius: DS.Radius.lg)
                )
            }
            .buttonStyle(.plain)
            .disabled(!canRequestReview)

            if let reviewError {
                Text(reviewError)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(DS.BrandText.danger)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Wash.brand.opacity(0.6), in: .rect(cornerRadius: DS.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl)
                .strokeBorder(DS.Wash.brandStrong, lineWidth: 1)
        )
    }

    /// 웹 문구 그대로. 맞았을 때도 **전체 뜻**을 다시 보여준다.
    private func verdictDetail(_ result: ShortAnswerGrading.Result) -> Text {
        if result.isCorrect {
            return Text(isKoToEn ? "정답: " : "전체 뜻: ")
                .foregroundStyle(DS.BrandText.success.opacity(0.7))
                + Text(answer)
                .font(.system(size: 16, weight: .black))
                .foregroundStyle(DS.BrandText.success)
        }
        return Text("정답은 ")
            .foregroundStyle(DS.BrandText.danger.opacity(0.7))
            + Text(answer)
            .font(.system(size: 16, weight: .black))
            .foregroundStyle(DS.BrandText.danger)
            + Text(" 입니다.")
            .foregroundStyle(DS.BrandText.danger.opacity(0.7))
    }

    /// 쉼표로 여러 개 적었을 때 인정되지 않은 조각을 알려준다.
    private func unmatchedPanel(_ answers: [String]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(DS.Solid.warningDeep)
                Text("정답으로 인정되지 않은 입력")
                    .font(.system(size: 14, weight: .black))
                Spacer(minLength: 0)
            }

            FlowLayout(spacing: 8) {
                ForEach(Array(answers.enumerated()), id: \.offset) { _, answer in
                    Text(answer)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(DS.BrandText.warning)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(DS.Surface.level0.opacity(0.7), in: .rect(cornerRadius: DS.Radius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: DS.Radius.md)
                                .strokeBorder(Color(hex: 0xFCD34D), lineWidth: 1)
                        )
                }
            }
        }
        .foregroundStyle(DS.BrandText.warning)
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Wash.warning.opacity(0.8), in: .rect(cornerRadius: DS.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl)
                .strokeBorder(Color(hex: 0xFDE68A), lineWidth: 1)
        )
    }

    /// 채점 근거. AI가 판단했으면 그 이유를, 아니면 로컬 유사도를 보여준다.
    private func feedbackPanel(_ result: ShortAnswerGrading.Result) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            if aiFeedback != nil {
                Text("AI 판단 이유".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.BrandText.base)
            }

            Text(
                aiFeedback ?? (
                    result.isCorrect
                        ? "정답입니다!"
                        : "유사도: \(Int((result.similarity * 100).rounded()))%"
                )
            )
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(DS.Surface.level600)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl)
                .strokeBorder(DS.Surface.level200, lineWidth: 1)
        )
    }

    // MARK: - 동작

    private func speak() {
        // 한→영에서는 발음을 들려주면 정답을 알려주는 셈이라 웹도 막아 둔다.
        guard !isKoToEn else { return }
        SpeechSynthesizer.shared.speak(word.word)
    }

    private func check() {
        guard result == nil, canSubmit, !isGrading else { return }

        isFocused = false
        let local = ShortAnswerGrading.grade(
            input,
            against: answer,
            direction: direction,
            acceptedAnswers: acceptedAnswersForDirection
        )

        // 로컬이 이미 정답이면 AI를 부르지 않는다. 웹도 그렇게 아낀다.
        guard usesAiGrading, !local.isCorrect, let grader else {
            result = local
            QuizSound.play(local.isCorrect ? .success : .fail)
            return
        }

        isGrading = true
        Task {
            defer { isGrading = false }
            do {
                let verdict = try await grader.grade(
                    userAnswer: input,
                    correctAnswer: answer,
                    word: word
                )
                aiFeedback = verdict.feedback
                result = ShortAnswerGrading.Result(
                    isCorrect: verdict.isCorrect,
                    similarity: verdict.isCorrect ? 1 : local.similarity,
                    matchedAnswer: local.matchedAnswer,
                    matchedAnswers: local.matchedAnswers,
                    unmatchedAnswers: verdict.isCorrect ? [] : local.unmatchedAnswers
                )
                QuizSound.play(verdict.isCorrect ? .success : .fail)
            } catch {
                // 웹과 같이 로컬 채점으로 되돌린다. 네트워크 때문에 퀴즈가 멈추면 안 된다.
                result = local
                QuizSound.play(local.isCorrect ? .success : .fail)
            }
        }
    }

    private var acceptedAnswersForDirection: [String] {
        word.acceptedAnswers(for: direction)
    }

    /// 오답 판정을 AI에게 다시 물어보고, 인정되면 단어에 그 표현을 저장한다.
    private func requestAiReview() async {
        guard canRequestReview, let grader, let current = result else { return }

        isReviewing = true
        reviewError = nil
        defer { isReviewing = false }

        do {
            let verdict = try await grader.grade(
                userAnswer: input,
                correctAnswer: answer,
                word: word
            )
            aiFeedback = verdict.feedback
            result = ShortAnswerGrading.Result(
                isCorrect: verdict.isCorrect,
                similarity: verdict.isCorrect ? 1 : current.similarity,
                matchedAnswer: current.matchedAnswer,
                matchedAnswers: current.matchedAnswers,
                unmatchedAnswers: verdict.isCorrect ? [] : current.unmatchedAnswers
            )

            if verdict.isCorrect {
                QuizSound.play(.success)
                await onAcceptAnswer?(
                    input.trimmingCharacters(in: .whitespaces),
                    verdict.feedback
                )
            }
        } catch {
            reviewError = "AI 재검토에 실패했습니다. 잠시 후 다시 시도해주세요."
        }
    }
}

#if DEBUG
#Preview("주관식") {
    ScrollView {
        VStack(spacing: 24) {
            QuizProgressHeader(current: 5, total: 10, correct: 3, wrong: 1)
            ShortAnswerQuizView(word: PreviewData.serendipity, onAnswer: { _, _ in })
        }
        .padding(16)
    }
    .background(DS.Surface.level50)
}
#endif
