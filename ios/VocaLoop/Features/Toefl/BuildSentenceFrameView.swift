import SwiftUI

/// 빈칸이 섞인 문장 틀. 단독 Build a Sentence와 Writing 모의고사가 함께 쓴다.
///
/// 채운 칸을 누르면 그 토큰을 도로 뺀다.
struct BuildSentenceFrameView: View {
    let question: BuildSentenceQuestion
    /// 빈칸에 놓은 토큰의 색인.
    let arrangement: [Int]
    var onRemove: ((Int) -> Void)?

    private var tokens: [String] {
        arrangement.compactMap { index in
            question.words.indices.contains(index) ? question.words[index] : nil
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            QuizPromptLabel(text: "문장을 완성하세요")

            FlowLayout(spacing: 6) {
                ForEach(
                    Array(BuildSentenceEngine.split(frame: question.sentenceFrame).enumerated()),
                    id: \.offset
                ) { _, part in
                    switch part {
                    case let .text(value):
                        // 단어 단위로 쪼개야 FlowLayout이 자연스럽게 줄바꿈한다.
                        ForEach(Array(value.split(separator: " ").enumerated()), id: \.offset) { _, word in
                            Text(String(word))
                                .font(.system(size: 17, weight: .medium))
                                .foregroundStyle(DS.Surface.level800)
                        }
                    case let .blank(blankIndex):
                        blankSlot(
                            text: blankIndex < tokens.count ? tokens[blankIndex] : nil,
                            position: blankIndex
                        )
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func blankSlot(text: String?, position: Int) -> some View {
        let label = Text(text ?? "＿＿")
            .font(.system(size: 17, weight: text == nil ? .medium : .bold))
            .foregroundStyle(text == nil ? DS.Surface.level300 : DS.BrandText.strong)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                text == nil ? DS.Surface.level100 : DS.Wash.brand,
                in: .rect(cornerRadius: DS.Radius.xs)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.xs).strokeBorder(
                    text == nil ? DS.Surface.level200 : DS.Solid.brand500.opacity(0.5),
                    lineWidth: 1
                )
            )

        if text != nil, let onRemove {
            Button { onRemove(position) } label: { label }
                .buttonStyle(.plain)
                .accessibilityLabel("\(text ?? "") 빼기")
        } else {
            label
        }
    }
}
