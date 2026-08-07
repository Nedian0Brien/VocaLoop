import SwiftUI

/// 웹 `src/components/FlashcardQuiz.jsx`의 이식.
///
/// 웹은 이 모드에서 단어장과 **같은 `WordCard`를 그대로 재사용**한다.
/// 따로 카드를 만들면 앞/뒷면 레이아웃이 두 벌이 되어 어긋나므로 여기서도 재사용한다.
/// 헤더도 단어를 세우지 않고 무엇을 하는 화면인지만 안내한다.
struct FlashcardQuizView: View {
    let word: Word
    let onAnswer: (String, Bool) -> Void

    @State private var isRevealed = false

    var body: some View {
        QuizCardShell {
            QuizIntroHeader(
                modeLabel: "Flashcard",
                eyebrow: "Word Card",
                title: "카드로 뜻을 확인하세요"
            )
        } content: {
            WordFlipCard(
                word: word,
                onToggleFlag: {},
                onSpeak: { SpeechSynthesizer.shared.speak(word.word) },
                onFlipChange: { revealed in
                    withAnimation(.smooth(duration: 0.3)) { isRevealed = revealed }
                }
            )

            if isRevealed {
                reviewActions
                    .padding(.top, 20)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .onAppear { SpeechSynthesizer.shared.speak(word.word) }
    }

    /// 뒤집은 뒤에만 나오는 2칸 버튼. 웹은 secondary / primary 조합을 쓴다.
    private var reviewActions: some View {
        HStack(spacing: 12) {
            Button {
                onAnswer(word.primaryMeaning, false)
            } label: {
                Label("다시 볼래요", systemImage: "xmark")
            }
            .buttonStyle(.ds(.secondary, size: .md, fullWidth: true))

            Button {
                onAnswer(word.primaryMeaning, true)
            } label: {
                Label("알고 있어요", systemImage: "checkmark")
                    .labelStyle(.trailingIcon)
            }
            .buttonStyle(.ds(.primary, size: .md, fullWidth: true))
        }
    }
}

/// 웹의 `rightIcon`처럼 아이콘을 글자 뒤에 붙인다.
struct TrailingIconLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            configuration.title
            configuration.icon
        }
    }
}

extension LabelStyle where Self == TrailingIconLabelStyle {
    static var trailingIcon: TrailingIconLabelStyle { TrailingIconLabelStyle() }
}

#if DEBUG
#Preview("플래시카드") {
    ScrollView {
        VStack(spacing: 24) {
            QuizProgressHeader(current: 2, total: 10, correct: 1, wrong: 0)
            FlashcardQuizView(word: PreviewData.serendipity, onAnswer: { _, _ in })
        }
        .padding(16)
    }
    .background(DS.Surface.level50)
}
#endif
