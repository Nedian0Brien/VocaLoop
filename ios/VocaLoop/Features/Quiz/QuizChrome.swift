import SwiftUI

/// 퀴즈 화면의 공통 구조. 수치는 웹을 375pt로 렌더링해 측정한 값이다.
enum QuizChrome {
    /// 카드 바깥 좌우 여백 (웹 max-w-2xl + px-1 기준 375pt에서 343 카드)
    static let cardWidth: CGFloat = 343
    static let cardRadius: CGFloat = 32
    /// 진행 영역은 카드보다 살짝 안쪽(px-1)에서 시작한다.
    static let headerInset: CGFloat = 4
    static let headerBottomGap: CGFloat = 24
}

/// 웹 퀴즈 상단의 진행 표시 — "Q. 3 / 10" + 정답/오답 + 진행 바.
struct QuizProgressHeader: View {
    let current: Int
    let total: Int
    let correct: Int
    let wrong: Int

    private var progress: Double {
        guard total > 0 else { return 0 }
        return min(1, Double(current - 1) / Double(total))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 0) {
                    eyebrow("Quiz Session", color: DS.Surface.level400)
                        .padding(.bottom, 2)

                    // "Q. 3 / 10" — 숫자만 브랜드색, 슬래시는 얇게.
                    HStack(spacing: 0) {
                        Text("Q. ")
                            .foregroundStyle(DS.Surface.level900)
                        Text("\(current)")
                            .foregroundStyle(DS.BrandText.base)
                        Text("/")
                            .font(.system(size: 20, weight: .light))
                            .foregroundStyle(DS.Surface.level300)
                            .padding(.horizontal, 6)
                        Text("\(total)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(DS.Surface.level400)
                    }
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                    .monospacedDigit()
                }

                Spacer(minLength: 8)

                HStack(spacing: 16) {
                    statBlock(
                        "Correct",
                        value: correct,
                        labelColor: DS.Solid.success,
                        valueColor: DS.BrandText.success
                    )
                    statBlock(
                        "Wrong",
                        value: wrong,
                        // 측정: 라벨 danger-400, 값 danger-500
                        labelColor: Color(hex: 0xF87171),
                        valueColor: DS.Solid.danger
                    )
                }
            }
            .padding(.bottom, 12)

            // 진행 바 — 트랙 surface-100, 채움 brand-500 → indigo-600
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(DS.Surface.level100)
                    Capsule()
                        .fill(LinearGradient(
                            colors: [DS.Solid.brand500, DS.Solid.indigo],
                            startPoint: .leading,
                            endPoint: .trailing
                        ))
                        .frame(width: progress * proxy.size.width)
                }
            }
            .frame(height: 8)
            .animation(.easeOut(duration: 0.6), value: progress)
        }
        .padding(.horizontal, QuizChrome.headerInset)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(total)문제 중 \(current)번째, 정답 \(correct)개, 오답 \(wrong)개")
    }

    private func eyebrow(_ text: String, color: Color) -> some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .black))
            .tracking(1)
            .foregroundStyle(color)
    }

    private func statBlock(
        _ label: String,
        value: Int,
        labelColor: Color,
        valueColor: Color
    ) -> some View {
        VStack(alignment: .trailing, spacing: 2) {
            eyebrow(label, color: labelColor)
            Text("\(value)")
                .font(.system(size: 18, weight: .black))
                .monospacedDigit()
                .foregroundStyle(valueColor)
        }
    }
}

/// 다크 헤더 좌상단의 모드 라벨. 웹은 반투명 박스 안에 넣는다.
/// (bg-white/5, 모서리 16, 보더 1px white/10, 패딩 10×4)
struct QuizModeBadge: View {
    let label: String

    var body: some View {
        Text(label.uppercased())
            .font(.system(size: 10, weight: .black))
            .tracking(0.5)
            // 측정: brand-200 70%
            .foregroundStyle(Color(hex: 0xBFDBFE).opacity(0.7))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(.white.opacity(0.05), in: .rect(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(.white.opacity(0.1), lineWidth: 1)
            )
    }
}

/// 단어를 카드로 보여주는 모드(플래시카드)의 다크 헤더.
/// 단어 대신 무엇을 하는 화면인지 안내한다.
struct QuizIntroHeader: View {
    let modeLabel: String
    let eyebrow: String
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            QuizModeBadge(label: modeLabel)
                .padding(.bottom, 24)

            Text(eyebrow.uppercased())
                .font(.system(size: 10, weight: .black))
                // 웹: tracking-[0.3em] → 10pt에서 3
                .tracking(3)
                .foregroundStyle(Color(hex: 0xBFDBFE).opacity(0.6))
                .padding(.bottom, 12)

            Text(title)
                .font(.system(size: 24, weight: .black))
                .tracking(-0.6)
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            LinearGradient(
                colors: [Color(hex: 0x1E293B), Color(hex: 0x0F172A)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .overlay(alignment: .topTrailing) {
                Circle()
                    .fill(DS.Solid.brand500.opacity(0.1))
                    .frame(width: 256, height: 256)
                    .blur(radius: 80)
                    .offset(x: 34, y: -56)
            }
        }
        .clipped()
    }
}

/// 퀴즈 카드의 다크 헤더. 단어를 크게 세우고 발음·품사를 붙인다.
struct QuizWordHeader: View {
    let word: Word
    let modeLabel: String
    var onSpeak: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            QuizModeBadge(label: modeLabel)

            Spacer(minLength: 12)

            HStack(alignment: .center, spacing: 12) {
                Text(word.word)
                    .font(.system(size: 36, weight: .black, design: .serif))
                    .tracking(-0.9)
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)

                Spacer(minLength: 0)

                Button(action: onSpeak) {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(.white.opacity(0.05), in: .rect(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .strokeBorder(.white.opacity(0.1), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(word.word) 발음 듣기")
            }

            Spacer(minLength: 12)

            HStack(spacing: 12) {
                if word.hasPronunciation {
                    Text(word.pronunciation ?? "")
                        .font(.system(size: 18, design: .serif))
                        .italic()
                        // 측정: brand-200 50%
                        .foregroundStyle(Color(hex: 0xBFDBFE).opacity(0.5))
                }

                if let pos = word.pos, !pos.isEmpty {
                    Text(pos.uppercased())
                        .font(.system(size: 10, weight: .black))
                        .tracking(0.5)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 2)
                        .background(DS.Solid.brand500.opacity(0.1), in: .rect(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(Color(hex: 0x60A5FA).opacity(0.1), lineWidth: 1)
                        )
                        .foregroundStyle(Color(hex: 0x60A5FA).opacity(0.8))
                }

                Spacer(minLength: 0)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, minHeight: 186.5, alignment: .leading)
        .background {
            // surface-800 → surface-900 대각 그라디언트 + 우상단 브랜드 글로우
            LinearGradient(
                colors: [Color(hex: 0x1E293B), Color(hex: 0x0F172A)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .overlay(alignment: .topTrailing) {
                Circle()
                    .fill(DS.Solid.brand500.opacity(0.1))
                    .frame(width: 256, height: 256)
                    .blur(radius: 80)
                    .offset(x: 34, y: -56)
            }
        }
        .clipped()
    }
}

/// 본문 섹션의 제목 — 왼쪽 브랜드 바 + 굵은 문구.
struct QuizPromptLabel: View {
    let text: String

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Capsule()
                .fill(DS.Solid.brand)
                .frame(width: 6, height: 28)
            Text(text)
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .foregroundStyle(DS.Surface.level800)
            Spacer(minLength: 0)
        }
    }
}

/// 퀴즈 카드 껍데기 — 다크 헤더 + 흰 본문.
/// 헤더는 모드마다 달라서 밖에서 넣는다.
struct QuizCardShell<Header: View, Content: View>: View {
    @ViewBuilder var header: Header
    @ViewBuilder var content: Content

    var body: some View {
        VStack(spacing: 0) {
            header
            VStack(alignment: .leading, spacing: 0) { content }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DS.Surface.level0)
        }
        .clipShape(.rect(cornerRadius: QuizChrome.cardRadius))
        .overlay(
            RoundedRectangle(cornerRadius: QuizChrome.cardRadius)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
        .dsShadow(.elevated)
    }
}

/// 단어를 헤더에 세우는 모드(객관식·주관식)용 축약형.
struct QuizCard<Content: View>: View {
    let word: Word
    let modeLabel: String
    var onSpeak: () -> Void
    @ViewBuilder var content: Content

    var body: some View {
        QuizCardShell {
            QuizWordHeader(word: word, modeLabel: modeLabel, onSpeak: onSpeak)
        } content: {
            content
        }
    }
}
