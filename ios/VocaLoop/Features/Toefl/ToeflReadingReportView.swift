import SwiftUI

/// 웹 `src/components/ToeflReadingReport.jsx`의 이식.
///
/// 정답률만 보여주고 끝내지 않는다. 스킬별로 어디가 약한지 막대로 보여주고,
/// 오답마다 내가 고른 답과 정답, 해설을 함께 세운다.
struct ToeflReadingReportView: View {
    let report: ToeflReadingReport.Result
    let taskLabel: String
    let difficulty: ToeflDifficulty
    /// 모의고사에서만 쓰는 추정 밴드. 없으면 표시하지 않는다.
    var band: Int?
    var subtitleOverride: String?
    let onExit: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                if let band { bandCard(band) }
                metrics
                feedbackCard

                if !report.skillBreakdown.isEmpty {
                    breakdownSection("스킬별 정답률", buckets: report.skillBreakdown)
                }
                if !report.topicBreakdown.isEmpty {
                    breakdownSection("주제별 정답률", buckets: report.topicBreakdown)
                }

                reviewSection

                Button("모드 선택으로", action: onExit)
                    .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Reading 학습 리포트")
                .font(.system(size: 24, weight: .black))
                .tracking(-0.6)
                .foregroundStyle(DS.Surface.level900)

            Text(subtitleOverride ?? "\(taskLabel) · 정답 \(report.correctCount)/\(report.totalCount) · 정답률 \(report.accuracy)%")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DS.Surface.level500)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// 추정 밴드. 공식 점수가 아니라는 점을 반드시 함께 적는다.
    private func bandCard(_ band: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Estimated Reading Band".uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(.white.opacity(0.7))

            Text("\(band)")
                .font(.system(size: 56, weight: .black))
                .tracking(-2.8)
                .monospacedDigit()
                .foregroundStyle(.white)

            Text("공식 ETS 점수가 아닌 앱 내 연습용 추정치")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white.opacity(0.75))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Gradient.cta)
        .clipShape(.rect(cornerRadius: DS.Radius.card))
        .dsShadow(.glowIndigo)
    }

    private var metrics: some View {
        HStack(spacing: 12) {
            metricTile(
                "Accuracy",
                value: "\(report.accuracy)%",
                caption: difficulty.label,
                tint: DS.BrandText.base,
                background: DS.Wash.brand
            )
            metricTile(
                "Correct",
                value: "\(report.correctCount)",
                caption: "맞은 문항",
                tint: DS.BrandText.success,
                background: DS.Wash.success
            )
            metricTile(
                "Wrong",
                value: "\(report.wrongCount)",
                caption: "틀린 문항",
                tint: DS.BrandText.danger,
                background: DS.Wash.danger
            )
        }
    }

    private func metricTile(
        _ label: String,
        value: String,
        caption: String,
        tint: Color,
        background: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .opacity(0.8)

            Text(value)
                .font(.system(size: 28, weight: .black))
                .tracking(-0.7)
                .monospacedDigit()

            Text(caption)
                .font(.system(size: 11, weight: .bold))
                .opacity(0.75)
                .lineLimit(1)
        }
        .foregroundStyle(tint)
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background, in: .rect(cornerRadius: DS.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.lg)
                .strokeBorder(tint.opacity(0.2), lineWidth: 1)
        )
    }

    private var feedbackCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(DS.BrandText.accent)
                Text("AI 코멘트".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level400)
                Spacer(minLength: 0)
            }

            Text(report.feedback.headline)
                .font(.system(size: 16, weight: .black))
                .tracking(-0.4)
                .foregroundStyle(DS.Surface.level900)
                .fixedSize(horizontal: false, vertical: true)

            Text(report.feedback.detail)
                .font(.system(size: 14, weight: .semibold))
                .lineSpacing(8)
                .foregroundStyle(DS.Surface.level600)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(report.feedback.nextSteps.enumerated()), id: \.offset) { _, step in
                    HStack(alignment: .top, spacing: 8) {
                        Circle()
                            .fill(DS.Solid.brand500)
                            .frame(width: 5, height: 5)
                            .padding(.top, 7)
                        Text(step)
                            .font(.system(size: 13, weight: .bold))
                            .lineSpacing(6)
                            .foregroundStyle(DS.Surface.level700)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
        .dsShadow(.card)
    }

    private func breakdownSection(_ title: String, buckets: [ToeflReadingReport.Bucket]) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .foregroundStyle(DS.Surface.level900)

            ForEach(buckets) { bucket in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(bucket.label)
                            .font(.system(size: 14, weight: .black))
                            .foregroundStyle(DS.Surface.level800)
                        Spacer(minLength: 8)
                        Text("\(bucket.correct)/\(bucket.total) · \(bucket.accuracy)%")
                            .font(.system(size: 14, weight: .black))
                            .monospacedDigit()
                            .foregroundStyle(DS.Surface.level500)
                    }

                    GeometryReader { proxy in
                        ZStack(alignment: .leading) {
                            Capsule().fill(DS.Surface.level100)
                            Capsule()
                                .fill(barColor(bucket.accuracy))
                                .frame(width: proxy.size.width * Double(bucket.accuracy) / 100)
                        }
                    }
                    .frame(height: 8)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
    }

    /// 웹과 같은 구간 — 70% 이상 초록, 40% 이상 주황, 그 아래 빨강.
    private func barColor(_ accuracy: Int) -> Color {
        if accuracy >= 70 { return DS.Solid.success }
        if accuracy >= 40 { return DS.Solid.warning }
        return DS.Solid.danger
    }

    private var reviewSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("문항 리뷰")
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .foregroundStyle(DS.Surface.level900)

            ForEach(report.questionReviews) { review in
                reviewCard(review)
            }
        }
    }

    private func reviewCard(_ review: ToeflReadingReport.QuestionReview) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                DSBadge(
                    text: review.correct ? "정답" : "오답 Q\(review.number)",
                    tone: review.correct ? .success : .danger,
                    style: .tag,
                    size: .sm
                )
                DSBadge(text: review.skillTag, tone: .neutral, style: .tag, size: .sm)
                Spacer(minLength: 0)
            }

            Text(review.prompt)
                .font(.system(size: 14, weight: .black))
                .lineSpacing(6)
                .foregroundStyle(DS.Surface.level900)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 4) {
                Text("내 답: \(review.selectedAnswer)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(review.correct ? DS.BrandText.success : DS.BrandText.danger)
                Text("정답: \(review.correctAnswer)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(DS.Surface.level800)
            }
            .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 4) {
                Text("AI 피드백".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.BrandText.base)
                Text(review.explanationKo)
                    .font(.system(size: 14, weight: .semibold))
                    .lineSpacing(8)
                    .foregroundStyle(DS.BrandText.deep)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Wash.brand, in: .rect(cornerRadius: DS.Radius.sm))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.lg)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
    }
}
