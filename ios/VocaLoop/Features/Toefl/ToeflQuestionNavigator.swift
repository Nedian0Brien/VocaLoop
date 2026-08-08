import SwiftUI

/// 웹 `ToeflQuestionSetNavigator`의 이식.
///
/// 지문 하나에 문항이 여러 개 딸린 모드에서 쓴다. 어느 문항을 풀었는지 한눈에
/// 보이고, 번호를 눌러 바로 건너뛸 수 있다.
struct ToeflQuestionNavigator: View {
    let total: Int
    let currentIndex: Int
    /// 문항별로 답을 골랐는지.
    let answered: (Int) -> Bool
    /// 채점 후의 정답 여부. 채점 전에는 nil이라 색이 새지 않는다.
    let result: (Int) -> Bool?
    let isChecked: Bool
    let onNavigate: (Int) -> Void

    private var answeredCount: Int {
        (0..<total).count { answered($0) }
    }

    var body: some View {
        // 문항이 하나면 이동할 곳이 없다.
        if total > 1 {
            VStack(alignment: .leading, spacing: 12) {
                header
                bar
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.md)
                    .strokeBorder(DS.Surface.level100, lineWidth: 1)
            )
            .accessibilityElement(children: .contain)
            .accessibilityLabel("문항 진행")
        }
    }

    private var header: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 2) {
                Text("문항 진행".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)

                HStack(spacing: 0) {
                    Text("풀이 \(answeredCount)/\(total)")
                        .foregroundStyle(DS.Surface.level900)
                    if isChecked {
                        Text(" · 채점 완료").foregroundStyle(DS.Surface.level400)
                    }
                }
                .font(.system(size: 14, weight: .black))
                .monospacedDigit()
            }

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                stepButton(symbol: "chevron.left", target: currentIndex - 1)
                stepButton(symbol: "chevron.right", target: currentIndex + 1)
            }
        }
    }

    private func stepButton(symbol: String, target: Int) -> some View {
        let enabled = target >= 0 && target < total

        return Button {
            onNavigate(target)
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 13, weight: .black))
                .foregroundStyle(enabled ? DS.Surface.level900 : DS.Surface.level300)
                .frame(width: 36, height: 36)
                .background(DS.Surface.level100, in: .rect(cornerRadius: DS.Radius.sm))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .accessibilityLabel(symbol == "chevron.left" ? "이전 문항" : "다음 문항")
    }

    private var bar: some View {
        HStack(spacing: 6) {
            ForEach(0..<total, id: \.self) { index in
                Button {
                    onNavigate(index)
                } label: {
                    Text("\(index + 1)")
                        .font(.system(size: 12, weight: .black))
                        .monospacedDigit()
                        .frame(maxWidth: .infinity)
                        .frame(height: 32)
                        .foregroundStyle(foreground(at: index))
                        .background(background(at: index), in: .rect(cornerRadius: DS.Radius.sm))
                        .overlay(
                            RoundedRectangle(cornerRadius: DS.Radius.sm)
                                .strokeBorder(border(at: index), lineWidth: index == currentIndex ? 2 : 1)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("문항 \(index + 1)로 이동")
            }
        }
    }

    private func background(at index: Int) -> Color {
        switch result(index) {
        case .some(true): return DS.Solid.success
        case .some(false): return DS.Solid.danger
        case nil: return answered(index) ? DS.Solid.brand500 : DS.Surface.level0
        }
    }

    private func foreground(at index: Int) -> Color {
        result(index) != nil || answered(index) ? .white : DS.Surface.level400
    }

    private func border(at index: Int) -> Color {
        if index == currentIndex { return DS.Solid.brand }
        return result(index) != nil || answered(index) ? .clear : DS.Surface.level200
    }
}
