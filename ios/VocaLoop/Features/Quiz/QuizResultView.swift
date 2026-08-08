import SwiftUI

/// 웹 `src/components/QuizResult.jsx`의 이식.
/// 수치는 웹을 375pt로 렌더링해 측정한 값이다.
/// 단독 퀴즈와 복합 퀴즈가 함께 쓰므로 세션이 아니라 숫자만 받는다.
struct QuizResultView: View {
    let accuracy: Int
    /// 푼 문제 수. 복합 퀴즈에서는 단어 수가 아니라 단계 수다.
    let total: Int
    let correct: Int
    let wrong: Int
    let onDone: () -> Void
    var onRestart: (() -> Void)?

    private var grade: ResultGrade { ResultGrade(accuracy: accuracy) }

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                heroCard
                statCards
                actions
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
    }

    // MARK: - Hero

    /// 바깥은 흰 카드(모서리 48), 안쪽에 등급별 그라디언트 히어로가 들어간다.
    private var heroCard: some View {
        VStack(spacing: 0) {
            VStack(spacing: 24) {
                gradeBadge

                VStack(spacing: 8) {
                    Text(grade.message)
                        .font(.system(size: 36, weight: .black))
                        .tracking(-0.9)
                        .lineSpacing(4)
                        .multilineTextAlignment(.center)

                    Text(grade.detail)
                        .font(.system(size: 16, weight: .bold))
                        .lineSpacing(10)
                        .foregroundStyle(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                }

                VStack(spacing: 8) {
                    Text("\(accuracy)%")
                        .font(.system(size: 96, weight: .black))
                        .tracking(-4.8)
                        .monospacedDigit()
                        .contentTransition(.numericText())
                        // 웹은 같은 숫자를 blur 사본으로 한 겹 더 깔아 빛나 보이게 한다.
                        .background {
                            Text("\(accuracy)%")
                                .font(.system(size: 96, weight: .black))
                                .tracking(-4.8)
                                .monospacedDigit()
                                .opacity(0.2)
                                .blur(radius: 4)
                        }

                    Text("Overall Accuracy".uppercased())
                        .font(.system(size: 12, weight: .black))
                        .tracking(4.8)
                        .opacity(0.6)
                }
                .padding(.top, 16)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(48)
            .background {
                grade.gradient
                    .overlay(alignment: .topLeading) {
                        Circle().fill(.white.opacity(0.1))
                            .frame(width: 256, height: 256).blur(radius: 80)
                            .offset(x: -34, y: -90)
                    }
                    .overlay(alignment: .bottomTrailing) {
                        Circle().fill(.black.opacity(0.1))
                            .frame(width: 256, height: 256).blur(radius: 80)
                            .offset(x: 34, y: 90)
                    }
            }
            .clipped()
        }
        .background(DS.Surface.level0)
        .clipShape(.rect(cornerRadius: DS.Radius.hero))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.hero)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
        .dsShadow(.floating)
    }

    private var gradeBadge: some View {
        HStack(spacing: 8) {
            Image(systemName: grade.symbol)
                .font(.system(size: 16, weight: .semibold))
            Text("\(grade.name) Achievement".uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(2)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
        .background(.white.opacity(0.1), in: .capsule)
        .overlay(Capsule().strokeBorder(.white.opacity(0.2), lineWidth: 1))
    }

    // MARK: - Stats

    private var statCards: some View {
        VStack(spacing: 24) {
            ResultStatCard(
                eyebrow: "Total Questions",
                value: "\(total)",
                subValue: "Answered",
                symbol: "chart.bar",
                tint: DS.Surface.level600,
                tintBackground: DS.Surface.level100
            )
            ResultStatCard(
                eyebrow: "Correct Items",
                value: "\(correct)",
                subValue: "Great job!",
                symbol: "checkmark.circle",
                tint: DS.BrandText.success,
                tintBackground: DS.Wash.success
            )
            ResultStatCard(
                eyebrow: "Wrong Items",
                value: "\(wrong)",
                subValue: "Needs review",
                symbol: "xmark.circle",
                tint: DS.BrandText.danger,
                tintBackground: DS.Wash.danger
            )
        }
    }

    private var actions: some View {
        VStack(spacing: 12) {
            if let onRestart {
                Button("다시 풀기", action: onRestart)
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            }
            Button("대시보드로 이동", action: onDone)
                .buttonStyle(.ds(.secondary, size: .lg, fullWidth: true))
        }
    }
}

/// 웹의 등급 구간. 문구·색까지 `QuizResult.jsx`의 `getResultInfo`와 같다.
enum ResultGrade {
    case excellent, great, good, practice

    init(accuracy: Int) {
        switch accuracy {
        case 90...: self = .excellent
        case 80...: self = .great
        case 70...: self = .good
        default: self = .practice
        }
    }

    var name: String {
        switch self {
        case .excellent: return "Excellent"
        case .great: return "Great"
        case .good: return "Good"
        case .practice: return "Practice"
        }
    }

    var message: String {
        switch self {
        case .excellent: return "완벽한 마스터! 🎉"
        case .great: return "훌륭한 실력이에요! 👏"
        case .good: return "잘 해내셨어요! 💪"
        case .practice: return "좋은 시도였어요! 🔥"
        }
    }

    var detail: String {
        switch self {
        case .excellent: return "당신의 암기력은 정말 놀랍군요. 이제 다음 레벨로 넘어갈 시간입니다!"
        case .great: return "조금만 더 집중하면 완벽해질 수 있습니다. 틀린 단어들만 다시 훑어보세요."
        case .good: return "안정적인 실력을 보여주고 계시네요. 꾸준함이 가장 큰 무기입니다."
        case .practice: return "실패는 성공의 어머니입니다. 오늘 배운 단어들이 내일의 실력이 될 거예요."
        }
    }

    var symbol: String {
        switch self {
        case .excellent: return "trophy.fill"
        case .great: return "target"
        case .good: return "bolt.fill"
        case .practice: return "heart.fill"
        }
    }

    var gradient: LinearGradient {
        let colors: [Color]
        switch self {
        case .excellent: colors = [DS.Solid.success, Color(hex: 0x047857)]
        case .great: colors = [DS.Solid.brand500, DS.Solid.indigo]
        case .good: colors = [DS.Solid.accent500, DS.Solid.indigo]
        case .practice: colors = [DS.Solid.warning, DS.Solid.dangerDeep]
        }
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

/// 웹 `Stat` 프리미티브. 아이콘 박스 48/모서리 20, 값 30/900.
struct ResultStatCard: View {
    let eyebrow: String
    let value: String
    var subValue: String?
    let symbol: String
    var tint: Color = DS.BrandText.base
    var tintBackground: Color = DS.Wash.brand
    var trend: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Image(systemName: symbol)
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(tint)
                    .frame(width: 48, height: 48)
                    .background(tintBackground, in: .rect(cornerRadius: 20))

                Spacer(minLength: 0)

                if let trend {
                    HStack(spacing: 2) {
                        Image(systemName: trend >= 0 ? "arrow.up" : "arrow.down")
                            .font(.system(size: 9, weight: .black))
                        Text("\(abs(trend))%")
                            .font(.system(size: 10, weight: .black))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        trend >= 0 ? DS.Wash.success : DS.Wash.danger,
                        in: .capsule
                    )
                    .foregroundStyle(trend >= 0 ? DS.BrandText.success : DS.BrandText.danger)
                }
            }
            .padding(.bottom, 20)

            Text(eyebrow.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)
                .padding(.bottom, 6)

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(value)
                    .font(.system(size: 30, weight: .black))
                    .tracking(-0.75)
                    .monospacedDigit()
                    .foregroundStyle(DS.Surface.level900)

                if let subValue {
                    Text(subValue)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(DS.Surface.level400.opacity(0.7))
                }
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
        .dsShadow(.card)
    }
}

#if DEBUG
#Preview("결과") {
    QuizResultView(
        accuracy: 90,
        total: 10,
        correct: 9,
        wrong: 1,
        onDone: {},
        onRestart: {}
    )
    .background(DS.Surface.level50)
}
#endif
