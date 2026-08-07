import SwiftUI

/// 웹 `LearningRateDonut`의 이식. 학습률을 링으로 보여준다.
struct LearningRateDonut: View {
    let rate: Int
    var size: CGFloat = 30
    var lineWidth: CGFloat = 3

    private var progress: Double { Double(max(0, min(100, rate))) / 100 }
    private var tint: Color { LearningRate.color(for: rate) }

    var body: some View {
        ZStack {
            Circle()
                .stroke(DS.Surface.level200, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))

            if progress > 0 {
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(tint, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                    // 12시 방향에서 시작하도록 돌린다.
                    .rotationEffect(.degrees(-90))
                    .shadow(color: tint.opacity(0.25), radius: 2)
            }
        }
        .frame(width: size, height: size)
        .animation(.easeOut(duration: 0.6), value: progress)
        .accessibilityLabel("학습률 \(rate)퍼센트")
    }
}

/// 웹 `LearningStatusBadge` — 색 점 + 라벨.
struct LearningStatusBadge: View {
    let rate: Int

    private var status: LearningStatus { LearningStatus(rate: rate) }

    /// 측정값: 높이 16.5, 폰트 10/900 자간 0.25, 패딩 2×8, 점 6pt, 간격 4.
    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(status.badgeDotColor)
                .frame(width: 6, height: 6)
            Text(status.label)
                .font(.system(size: 10, weight: .black))
                .tracking(0.25)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 2)
        .background(status.badgeBackgroundColor, in: .capsule)
        .foregroundStyle(status.badgeTextColor)
        .accessibilityLabel(status.label)
    }
}

#if DEBUG
#Preview("도넛과 배지") {
    VStack(spacing: 24) {
        HStack(spacing: 20) {
            ForEach([0, 25, 50, 75, 100], id: \.self) { rate in
                VStack(spacing: 8) {
                    LearningRateDonut(rate: rate, size: 44, lineWidth: 4)
                    Text("\(rate)%").font(DS.Font.caption)
                }
            }
        }
        VStack(spacing: 10) {
            ForEach([20, 60, 90], id: \.self) { rate in
                LearningStatusBadge(rate: rate)
            }
        }
    }
    .padding(32)
    .background(DS.Surface.level50)
}
#endif
