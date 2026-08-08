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
                accuracyLevelCard
                actions
                smartReviewTip
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

    // MARK: - 정확도 눈금

    /// 웹의 "Accuracy Level" 카드. 등급 색으로 채워지는 막대와 3단 눈금.
    private var accuracyLevelCard: some View {
        VStack(spacing: 12) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(grade.tint)
                    Text("Accuracy Level".uppercased())
                        .font(.system(size: 12, weight: .black))
                        .tracking(1)
                        .foregroundStyle(DS.Surface.level700)
                }
                Spacer(minLength: 8)
                Text("\(accuracy)% Mastery")
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(grade.tint)
            }
            .padding(.horizontal, 4)

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(DS.Surface.level200.opacity(0.5))
                    Capsule()
                        .fill(grade.barGradient)
                        .frame(width: proxy.size.width * Double(accuracy) / 100)
                }
                .overlay(Capsule().strokeBorder(DS.Surface.level100, lineWidth: 1))
            }
            .frame(height: 16)

            HStack {
                Text("Novice")
                Spacer(minLength: 8)
                Text("Professional")
                Spacer(minLength: 8)
                Text("Master")
            }
            .font(.system(size: 10, weight: .black))
            .tracking(1)
            .foregroundStyle(DS.Surface.level400)
            .padding(.horizontal, 4)
        }
        .padding(20)
        .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
    }

    // MARK: - 팁

    /// 웹의 "Smart Review Tip". 틀린 단어가 다음 퀴즈에서 먼저 나온다는 안내다.
    private var smartReviewTip: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(.white.opacity(0.2), in: .rect(cornerRadius: DS.Radius.lg))

            VStack(alignment: .leading, spacing: 8) {
                Text("Smart Review Tip")
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                    .foregroundStyle(.white)

                (
                    Text("오늘 틀린 ")
                        + Text("\(wrong)개").fontWeight(.black).underline()
                        + Text("의 단어들은 학습 알고리즘에 의해 ")
                        + Text("우선 순위").foregroundColor(.white)
                        + Text("가 높아졌습니다. 내일 다시 퀴즈를 풀면 자동으로 이 단어들이 먼저 출제되어 완벽한 암기를 도와드립니다.")
                )
                .font(.system(size: 14, weight: .bold))
                .lineSpacing(6)
                .foregroundStyle(.white.opacity(0.9))
                .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Solid.brand, in: .rect(cornerRadius: DS.Radius.card))
        .dsShadow(.glowBrand)
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
        case .excellent: return "완벽한 마스터!"
        case .great: return "훌륭한 실력이에요!"
        case .good: return "잘 해내셨어요!"
        case .practice: return "좋은 시도였어요!"
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

    /// 정확도 막대와 눈금 글자에 쓰는 색. 웹 `res.text` / `res.barBg`.
    var tint: Color {
        switch self {
        case .excellent: return DS.BrandText.success
        case .great: return DS.BrandText.base
        case .good: return DS.BrandText.accent
        case .practice: return DS.BrandText.danger
        }
    }

    var barGradient: LinearGradient {
        let colors: [Color]
        switch self {
        case .excellent: colors = [DS.Solid.success, Color(hex: 0x047857)]
        case .great: colors = [DS.Solid.brand500, DS.Solid.indigo]
        case .good: colors = [DS.Solid.accent500, DS.Solid.indigo]
        case .practice: colors = [DS.Solid.warning, DS.Solid.danger]
        }
        return LinearGradient(colors: colors, startPoint: .leading, endPoint: .trailing)
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
                    // 웹 `TrendBadge` — 0이면 "Stable", 부호에 따라 화살표를 붙인다.
                    Text(trend > 0 ? "↑ \(trend)%" : trend < 0 ? "↓ \(abs(trend))%" : "Stable")
                        .font(.system(size: 10, weight: .black))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            trend > 0 ? DS.Wash.success
                                : trend < 0 ? DS.Wash.danger : DS.Surface.level100,
                            in: .rect(cornerRadius: DS.Radius.md)
                        )
                        .foregroundStyle(
                            trend > 0 ? DS.BrandText.success
                                : trend < 0 ? DS.BrandText.danger : DS.Surface.level400
                        )
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
