import SwiftUI
import UIKit

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
    /// 한→영처럼 단어 대신 **뜻**을 세워야 할 때 쓴다.
    /// 웹과 같이 세리프를 쓰지 않고 발음과 발음 버튼도 숨긴다 — 정답을 알려주는 셈이라서다.
    var promptOverride: String?
    var onSpeak: () -> Void

    private var showsWord: Bool { promptOverride == nil }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            QuizModeBadge(label: modeLabel)

            Spacer(minLength: 12)

            HStack(alignment: .center, spacing: 12) {
                if let promptOverride {
                    Text(promptOverride)
                        .font(.system(size: 30, weight: .black))
                        .tracking(-0.75)
                        .foregroundStyle(.white)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    Text(word.word)
                        .font(.merriweather(size: 36, weight: .black))
                        .tracking(-0.9)
                        .foregroundStyle(.white)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                }

                Spacer(minLength: 0)

                if showsWord {
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
            }

            Spacer(minLength: 12)

            HStack(spacing: 12) {
                if showsWord, word.hasPronunciation {
                    Text(word.pronunciation ?? "")
                        .font(.merriweatherItalic(size: 18))
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
    var promptOverride: String?
    var onSpeak: () -> Void
    @ViewBuilder var content: Content

    var body: some View {
        QuizCardShell {
            QuizWordHeader(
                word: word,
                modeLabel: modeLabel,
                promptOverride: promptOverride,
                onSpeak: onSpeak
            )
        } content: {
            content
        }
    }
}

/// 채점 결과 배너 — 아이콘 사각형(56) + 제목 + 부연 한 줄.
/// 객관식·주관식·단어 완성이 함께 쓴다.
struct QuizVerdictBanner: View {
    let isCorrect: Bool
    let title: String
    /// 부연은 정답 단어를 굵게 강조해야 해서 밖에서 만들어 넘긴다.
    let detail: Text

    var body: some View {
        HStack(spacing: 20) {
            Image(systemName: isCorrect ? "checkmark" : "xmark")
                .font(.system(size: 24, weight: .black))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(
                    isCorrect ? DS.Solid.success : DS.Solid.danger,
                    in: .rect(cornerRadius: DS.Radius.lg)
                )
                .dsShadow(.card)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                detail
                    .font(.system(size: 16, weight: .bold))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .foregroundStyle(isCorrect ? DS.BrandText.success : DS.BrandText.danger)
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            isCorrect ? DS.Wash.success : DS.Wash.danger,
            in: .rect(cornerRadius: DS.Radius.xl)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl).strokeBorder(
                (isCorrect ? DS.Solid.success : DS.Solid.danger).opacity(0.25),
                lineWidth: 2
            )
        )
        .transition(.opacity.combined(with: .scale(scale: 0.97)))
    }
}

/// 한 글자 입력과 소프트웨어 키보드의 빈 칸 삭제를 전달하는 공용 필드.
///
/// SwiftUI `TextField`의 문자열 바인딩은 이미 비어 있는 칸에서 Backspace를
/// 눌러도 바뀌지 않는다. `UITextField.deleteBackward()`를 직접 관찰해 웹과
/// 같은 이전/다음 칸 포커스 이동을 구현한다.
struct QuizLetterInput: UIViewRepresentable {
    @Binding var text: String

    let isFocused: Bool
    var isEnabled = true
    var font = UIFont.systemFont(ofSize: 16, weight: .medium)
    var textColor = UIColor.label
    var onFocus: () -> Void
    var onInsert: () -> Void
    var onDeleteWhenEmpty: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> BackspaceTextField {
        let field = BackspaceTextField()
        field.delegate = context.coordinator
        field.addTarget(
            context.coordinator,
            action: #selector(Coordinator.textDidChange(_:)),
            for: .editingChanged
        )
        field.onDeleteWhenEmpty = context.coordinator.deleteWhenEmpty
        field.autocapitalizationType = .none
        field.autocorrectionType = .no
        field.keyboardType = .asciiCapable
        field.spellCheckingType = .no
        field.textAlignment = .center
        field.borderStyle = .none
        field.backgroundColor = .clear
        return field
    }

    func updateUIView(_ field: BackspaceTextField, context: Context) {
        context.coordinator.parent = self
        field.onDeleteWhenEmpty = context.coordinator.deleteWhenEmpty
        field.isEnabled = isEnabled
        field.font = font
        field.textColor = textColor

        if field.text != text {
            field.text = text
        }

        if isFocused, isEnabled {
            if !field.isFirstResponder { field.becomeFirstResponder() }
        } else if !isEnabled, field.isFirstResponder {
            field.resignFirstResponder()
        }
    }

    @MainActor
    final class Coordinator: NSObject, UITextFieldDelegate {
        var parent: QuizLetterInput

        init(parent: QuizLetterInput) {
            self.parent = parent
        }

        func textFieldDidBeginEditing(_ textField: UITextField) {
            parent.onFocus()
        }

        @objc func textDidChange(_ field: UITextField) {
            let sanitized = String(
                (field.text ?? "").filter { $0.isASCII && $0.isLetter }.suffix(1)
            )
            if field.text != sanitized { field.text = sanitized }
            parent.text = sanitized
            if !sanitized.isEmpty { parent.onInsert() }
        }

        func deleteWhenEmpty() {
            parent.onDeleteWhenEmpty()
        }
    }
}

@MainActor
final class BackspaceTextField: UITextField {
    var onDeleteWhenEmpty: (() -> Void)?

    override func deleteBackward() {
        let wasEmpty = text?.isEmpty ?? true
        super.deleteBackward()
        if wasEmpty { onDeleteWhenEmpty?() }
    }
}
