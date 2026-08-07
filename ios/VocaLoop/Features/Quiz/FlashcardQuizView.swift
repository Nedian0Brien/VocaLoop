import SwiftUI

struct FlashcardQuizView: View {
    let word: Word
    let onAnswer: (String, Bool) -> Void

    @State private var isRevealed = false

    var body: some View {
        VStack(spacing: 20) {
            card
            Spacer(minLength: 0)
            controls
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 16)
        .onAppear { SpeechSynthesizer.shared.speak(word.word) }
    }

    private var card: some View {
        Button {
            withAnimation(.smooth(duration: 0.45)) { isRevealed.toggle() }
        } label: {
            DSCard(
                variant: isRevealed ? .gradient : .dark,
                radius: DS.Radius.hero,
                padding: .xl
            ) {
                VStack(spacing: 14) {
                    if isRevealed {
                        DSBadge(text: "Meaning", tone: .onDark, style: .pill)

                        Text(word.primaryMeaning)
                            .font(DS.Font.sectionTitle)
                            .dsTightTracking(24)
                            .multilineTextAlignment(.center)

                        if let example = word.examples.first {
                            Text(example.en)
                                .font(.system(size: 14, weight: .medium, design: .serif))
                                .foregroundStyle(.white.opacity(0.8))
                                .multilineTextAlignment(.center)
                                .padding(.top, 4)
                        }
                    } else {
                        Text(word.word)
                            .font(DS.Font.hero)
                            .tracking(DS.Tracking.tighter(48))
                            .minimumScaleFactor(0.45)
                            .lineLimit(1)

                        Text("탭하면 뜻이 보입니다")
                            .font(DS.Font.caption)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: 220)
                // 카드를 뒤집으면 내용도 좌우 반전되므로 같은 각도로 되돌려 글자를 바로 세운다.
                .rotation3DEffect(.degrees(isRevealed ? 180 : 0), axis: (x: 0, y: 1, z: 0))
            }
        }
        .buttonStyle(.plain)
        .rotation3DEffect(.degrees(isRevealed ? 180 : 0), axis: (x: 0, y: 1, z: 0))
        .accessibilityLabel(isRevealed ? word.primaryMeaning : word.word)
        .accessibilityHint("두 번 탭하면 뒤집힙니다")
    }

    private var controls: some View {
        VStack(spacing: 12) {
            if isRevealed {
                HStack(spacing: 10) {
                    Button("아직이에요") {
                        onAnswer(word.primaryMeaning, false)
                    }
                    .buttonStyle(.ds(.secondary, size: .lg, fullWidth: true))

                    Button("알아요") {
                        onAnswer(word.primaryMeaning, true)
                    }
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            } else {
                Button("뜻 보기") {
                    withAnimation(.smooth(duration: 0.45)) { isRevealed = true }
                }
                .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            }
        }
        .animation(.smooth(duration: 0.3), value: isRevealed)
    }
}

#if DEBUG
#Preview("플래시카드") {
    FlashcardQuizView(word: PreviewData.serendipity, onAnswer: { _, _ in })
        .background(DS.Surface.level50)
}
#endif
