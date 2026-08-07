import SwiftUI

struct FlashcardQuizView: View {
    let word: Word
    let onAnswer: (String, Bool) -> Void

    @State private var isRevealed = false

    var body: some View {
        VStack(spacing: 24) {
            card
            Spacer()
            controls
        }
        .padding(20)
        .onAppear { SpeechSynthesizer.shared.speak(word.word) }
    }

    private var card: some View {
        Button {
            withAnimation(.smooth(duration: 0.45)) { isRevealed.toggle() }
        } label: {
            VStack(spacing: 14) {
                if isRevealed {
                    Text(word.primaryMeaning)
                        .font(.title.bold())
                        .multilineTextAlignment(.center)
                    if let pos = word.pos, !pos.isEmpty {
                        Text(pos).font(.caption).foregroundStyle(.secondary)
                    }
                    if let example = word.examples.first {
                        Text(example.en)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.top, 6)
                    }
                } else {
                    Text(word.word)
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                    Text("탭하면 뜻이 보입니다")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 60)
            .padding(.horizontal, 20)
            // 카드를 뒤집으면 내용도 좌우 반전되므로 같은 각도로 되돌려 글자를 바로 세운다.
            .rotation3DEffect(.degrees(isRevealed ? 180 : 0), axis: (x: 0, y: 1, z: 0))
        }
        .buttonStyle(.plain)
        .background(.quaternary.opacity(0.4), in: .rect(cornerRadius: 28))
        .rotation3DEffect(.degrees(isRevealed ? 180 : 0), axis: (x: 0, y: 1, z: 0))
        .accessibilityLabel(isRevealed ? word.primaryMeaning : word.word)
        .accessibilityHint("두 번 탭하면 뒤집힙니다")
    }

    private var controls: some View {
        VStack(spacing: 12) {
            if isRevealed {
                HStack(spacing: 12) {
                    Button {
                        onAnswer(word.primaryMeaning, false)
                    } label: {
                        Label("아직이에요", systemImage: "arrow.counterclockwise")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .tint(.dangerRed)

                    Button {
                        onAnswer(word.primaryMeaning, true)
                    } label: {
                        Label("알아요", systemImage: "checkmark")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(.successGreen)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            } else {
                Button("뜻 보기") {
                    withAnimation(.smooth(duration: 0.45)) { isRevealed = true }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.extraLarge)
                .tint(.brand)
                .frame(maxWidth: .infinity)
            }
        }
        .animation(.smooth(duration: 0.3), value: isRevealed)
    }
}
