import SwiftUI

struct LoginView: View {
    private enum Mode: String, CaseIterable {
        case login = "로그인"
        case signup = "회원가입"
    }

    private enum Field: Hashable {
        case email, password, displayName
    }

    @Environment(AppState.self) private var appState

    @State private var mode: Mode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var errorMessage: String?
    @State private var isSubmitting = false
    @FocusState private var focusedField: Field?

    private var canSubmit: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty
            && password.count >= 8
            && !isSubmitting
    }

    var body: some View {
        ZStack {
            DS.Gradient.hero.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    header
                    card
                }
                .padding(.horizontal, 20)
                .padding(.top, 56)
                .padding(.bottom, 40)
            }
            .scrollBounceBehavior(.basedOnSize)
            .scrollDismissesKeyboard(.interactively)
        }
    }

    private var header: some View {
        VStack(spacing: 14) {
            VocaLoopMark(size: 52)

            Text("VocaLoop")
                .font(DS.Font.hero)
                .tracking(DS.Tracking.tighter(48))
                .foregroundStyle(.white)

            DSBadge(text: "AI Adaptive Learning", tone: .onDark, style: .pill)

            Text("AI가 단어를 분석하고, 반복이 기억으로 남습니다")
                .font(DS.Font.meta)
                .foregroundStyle(.white.opacity(0.9))
                .multilineTextAlignment(.center)
        }
    }

    private var card: some View {
        DSCard(variant: .elevated, radius: DS.Radius.card, padding: .lg) {
            VStack(spacing: 20) {
                modeSwitch
                fields

                if let errorMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 12, weight: .bold))
                        Text(errorMessage).font(DS.Font.caption)
                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(DS.BrandText.danger)
                    .padding(12)
                    .background(DS.Wash.danger, in: .rect(cornerRadius: DS.Radius.sm))
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }

                Button {
                    Task { await submit() }
                } label: {
                    if isSubmitting {
                        ProgressView().tint(.white)
                    } else {
                        Text(mode.rawValue)
                    }
                }
                .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
                .disabled(!canSubmit)

                if mode == .signup {
                    Text("비밀번호는 8자 이상이어야 합니다.")
                        .font(DS.Font.caption)
                        .foregroundStyle(DS.Surface.level500)
                }
            }
        }
        .animation(.smooth(duration: 0.25), value: errorMessage)
        .animation(.smooth(duration: 0.25), value: mode)
    }

    /// 세그먼티드 대신 웹의 pill 토글을 옮겼다. 시스템 컨트롤을 쓰면
    /// 이 화면만 iOS 기본 룩으로 튀어 카드의 편집 디자인과 어긋난다.
    private var modeSwitch: some View {
        HStack(spacing: 4) {
            ForEach(Mode.allCases, id: \.self) { item in
                Button {
                    mode = item
                    errorMessage = nil
                } label: {
                    Text(item.rawValue)
                        .font(DS.Font.label)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .foregroundStyle(mode == item ? .white : DS.Surface.level600)
                        .background(
                            mode == item ? AnyShapeStyle(DS.Solid.brand) : AnyShapeStyle(.clear),
                            in: .rect(cornerRadius: DS.Radius.sm)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(DS.Surface.level100, in: .rect(cornerRadius: DS.Radius.md))
    }

    @ViewBuilder
    private var fields: some View {
        VStack(spacing: 12) {
            if mode == .signup {
                DSTextField(
                    label: "이름 (선택)",
                    systemImage: "person",
                    text: $displayName,
                    placeholder: "표시할 이름"
                )
                .textContentType(.name)
                .focused($focusedField, equals: .displayName)
                .submitLabel(.next)
                .onSubmit { focusedField = .email }
            }

            DSTextField(label: "이메일", systemImage: "envelope", text: $email, placeholder: "example@email.com")
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focusedField, equals: .email)
                .submitLabel(.next)
                .onSubmit { focusedField = .password }

            DSTextField(
                label: "비밀번호",
                systemImage: "lock",
                text: $password,
                isSecure: true,
                placeholder: "8자 이상"
            )
            .textContentType(mode == .login ? .password : .newPassword)
            .focused($focusedField, equals: .password)
            .submitLabel(.go)
            .onSubmit { if canSubmit { Task { await submit() } } }
        }
    }

    private func submit() async {
        guard canSubmit else { return }

        focusedField = nil
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }

        let trimmedEmail = email.trimmingCharacters(in: .whitespaces)
        let trimmedName = displayName.trimmingCharacters(in: .whitespaces)

        do {
            let user: User
            switch mode {
            case .login:
                user = try await appState.auth.login(email: trimmedEmail, password: password)
            case .signup:
                user = try await appState.auth.signup(
                    email: trimmedEmail,
                    password: password,
                    displayName: trimmedName.isEmpty ? nil : trimmedName
                )
            }
            password = ""
            appState.signIn(user)
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

/// 웹 `Input` 프리미티브 — 라벨 + 좌측 아이콘 + 12px 모서리.
struct DSTextField: View {
    let label: String
    var systemImage: String?
    @Binding var text: String
    var isSecure = false
    var placeholder: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(DS.Font.caption)
                .foregroundStyle(DS.Surface.level600)

            HStack(spacing: 10) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DS.Surface.level400)
                        .frame(width: 18)
                }

                Group {
                    if isSecure {
                        SecureField(placeholder, text: $text)
                    } else {
                        TextField(placeholder, text: $text)
                    }
                }
                .font(DS.Font.body)
                .foregroundStyle(DS.Surface.level900)
            }
            .padding(.horizontal, 14)
            .frame(height: 48)
            .background(DS.Surface.level100, in: .rect(cornerRadius: DS.Radius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.sm)
                    .strokeBorder(DS.Surface.level200, lineWidth: 1)
            )
        }
    }
}

#if DEBUG
#Preview("로그인") {
    LoginView().environment(AppState())
}
#endif
