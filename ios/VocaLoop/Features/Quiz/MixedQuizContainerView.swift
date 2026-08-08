import SwiftUI

/// 복합 퀴즈 화면. 웹 `QuizView`의 mixed 경로에 해당한다.
///
/// 단계마다 다른 퀴즈 화면을 띄우고, 세트를 끝낼 때마다 휴식 화면으로 끊어 준다.
struct MixedQuizContainerView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    let session: MixedQuizSession

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                if session.isFinished {
                    QuizResultView(
                        accuracy: session.accuracy,
                        total: session.answeredCount,
                        correct: session.correctCount,
                        wrong: session.wrongCount,
                        onDone: { dismiss() }
                    )
                } else if session.isAtSetBreak {
                    ScrollView {
                        StudySetBreakCard(
                            session: session,
                            onContinue: {
                                withAnimation(.smooth(duration: 0.3)) { session.startNextSet() }
                            },
                            onFinish: { session.finishNow() }
                        )
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                    }
                } else {
                    ScrollView {
                        VStack(spacing: QuizChrome.headerBottomGap) {
                            QuizProgressHeader(
                                current: session.progress.current,
                                total: session.progress.total,
                                correct: session.correctCount,
                                wrong: session.wrongCount
                            )
                            question
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                    }
                    .scrollEdgeEffectStyle(.soft, for: .top)
                    .scrollDismissesKeyboard(.interactively)
                }
            }
            .navigationTitle("복합 퀴즈")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("그만두기") { dismiss() }
                        .tint(DS.Surface.level500)
                }
                if !session.isFinished {
                    ToolbarItem(placement: .topBarTrailing) {
                        Text("세트 \(session.setNumber)/\(session.totalSets)")
                            .font(.system(size: 12, weight: .black))
                            .monospacedDigit()
                            .foregroundStyle(DS.Surface.level500)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var question: some View {
        if let word = session.currentWord, let stage = session.currentStage {
            Group {
                switch stage {
                case .flashcard:
                    FlashcardQuizView(word: word, onAnswer: record)
                case .multiple:
                    MultipleChoiceQuizView(
                        word: word,
                        choices: session.currentChoices,
                        onAnswer: record
                    )
                case .shortEnKo:
                    ShortAnswerQuizView(word: word, direction: .enToKo, onAnswer: record)
                case .shortKoEn:
                    ShortAnswerQuizView(word: word, direction: .koToEn, onAnswer: record)
                case .completeWord:
                    CompleteWordStageView(word: word, onAnswer: record)
                }
            }
            // 같은 단어가 단계만 바뀌어 다시 나오므로 단어 id만으로는 부족하다.
            // 진행 수까지 섞어야 재출제된 같은 단계도 상태가 초기화된다.
            .id("\(word.id):\(stage.rawValue):\(session.answeredCount)")
            .transition(.asymmetric(
                insertion: .move(edge: .trailing).combined(with: .opacity),
                removal: .move(edge: .leading).combined(with: .opacity)
            ))
        }
    }

    private func record(given: String, isCorrect: Bool) {
        guard let word = session.currentWord, let stage = session.currentStage else { return }

        withAnimation(.smooth(duration: 0.3)) {
            session.submit(isCorrect: isCorrect)
        }

        // 서버 반영은 화면 진행을 막지 않는다. 반영된 학습률은 세트 요약에 되먹인다.
        Task {
            await appState.vocabulary?.recordQuizResult(
                for: word,
                wasCorrect: isCorrect,
                stage: stage
            )
            if let updated = appState.vocabulary?.words.first(where: { $0.id == word.id }) {
                session.updateRate(wordID: word.id, rate: updated.learningRate)
            }
        }
    }
}

/// 웹 `StudySetBreak`의 이식 — 세트 하나를 끝냈을 때의 쉬어가기 화면.
struct StudySetBreakCard: View {
    let session: MixedQuizSession
    let onContinue: () -> Void
    let onFinish: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Image(systemName: "trophy.fill")
                .font(.system(size: 34, weight: .medium))
                .foregroundStyle(DS.BrandText.success)
                .frame(width: 80, height: 80)
                .background(DS.Wash.success, in: .rect(cornerRadius: 24))
                .dsShadow(.soft)
                .padding(.bottom, 24)

            DSBadge(text: "Study Break", tone: .success, style: .dot)
                .padding(.bottom, 20)

            Text("학습 세트 \(session.setNumber) 완료")
                .font(.system(size: 30, weight: .black))
                .tracking(-0.75)
                .multilineTextAlignment(.center)
                .foregroundStyle(DS.Surface.level900)
                .padding(.bottom, 12)

            Text("\(session.setProgress.count)개 단어의 복합 퀴즈를 끝냈습니다. 잠깐 쉬고 다음 세트로 이어가세요.")
                .font(.system(size: 15, weight: .bold))
                .lineSpacing(6)
                .multilineTextAlignment(.center)
                .foregroundStyle(DS.Surface.level500)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 32)

            statRow.padding(.bottom, 32)
            wordList.padding(.bottom, 32)

            VStack(spacing: 12) {
                Button("다음 학습으로", action: onContinue)
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                Button("여기서 마치기", action: onFinish)
                    .buttonStyle(.ds(.secondary, size: .lg, fullWidth: true))
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.hero))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.hero)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
        .dsShadow(.elevated)
    }

    private var statRow: some View {
        HStack(spacing: 12) {
            statCell(
                "Set",
                value: "\(session.setNumber)/\(session.totalSets)",
                tint: DS.BrandText.base,
                background: DS.Surface.level50,
                border: DS.Surface.level100
            )
            statCell(
                "Correct",
                value: "\(session.correctCount)",
                tint: DS.BrandText.success,
                background: DS.Wash.success,
                border: DS.Solid.success.opacity(0.2)
            )
            statCell(
                "Wrong",
                value: "\(session.wrongCount)",
                tint: DS.BrandText.danger,
                background: DS.Wash.danger,
                border: DS.Solid.danger.opacity(0.2)
            )
        }
    }

    private func statCell(
        _ label: String,
        value: String,
        tint: Color,
        background: Color,
        border: Color
    ) -> some View {
        VStack(spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)
            Text(value)
                .font(.system(size: 20, weight: .black))
                .monospacedDigit()
                .foregroundStyle(tint)
        }
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity)
        .background(background, in: .rect(cornerRadius: DS.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.md).strokeBorder(border, lineWidth: 1)
        )
    }

    /// 세트에서 다룬 단어와 학습률 변화.
    private var wordList: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("진행한 단어".uppercased())
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                        .foregroundStyle(DS.Surface.level400)
                    Text("\(session.setProgress.count)개 단어")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(DS.Surface.level600)
                }

                Spacer(minLength: 8)

                Text("학습률 증가 \(formatted(session.setRateDelta))")
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(
                        session.setRateDelta >= 0 ? DS.BrandText.success : DS.BrandText.danger
                    )
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.sm))
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.Radius.sm)
                            .strokeBorder(DS.Surface.level100, lineWidth: 1)
                    )
            }

            ForEach(session.setProgress) { progress in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(progress.word)
                            .font(.system(size: 14, weight: .black))
                            .foregroundStyle(DS.Surface.level900)
                            .lineLimit(1)
                        if !progress.meaning.isEmpty {
                            Text(progress.meaning)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(DS.Surface.level500)
                                .lineLimit(1)
                        }
                    }

                    Spacer(minLength: 8)

                    Text(formatted(progress.delta))
                        .font(.system(size: 12, weight: .black))
                        .monospacedDigit()
                        .foregroundStyle(
                            progress.delta >= 0 ? DS.BrandText.success : DS.BrandText.danger
                        )
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.sm))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.sm)
                        .strokeBorder(DS.Surface.level100, lineWidth: 1)
                )
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.md)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
    }

    private func formatted(_ delta: Int) -> String {
        "\(delta >= 0 ? "+" : "")\(delta)%p"
    }
}
