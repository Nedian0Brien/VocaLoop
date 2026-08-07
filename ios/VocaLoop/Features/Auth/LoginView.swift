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
            LinearGradient.brandGradient.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 28) {
                    header
                    card
                }
                .padding(.horizontal, 24)
                .padding(.top, 60)
                .padding(.bottom, 40)
            }
            .scrollBounceBehavior(.basedOnSize)
            .scrollDismissesKeyboard(.interactively)
        }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(spacing: 12) {
            VocaLoopMark(size: 56)
            Text("VocaLoop")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)
            Text("AI가 단어를 분석하고, 반복이 기억으로 남습니다")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
        }
    }

    private var card: some View {
        VStack(spacing: 18) {
            Picker("모드", selection: $mode) {
                ForEach(Mode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: mode) { errorMessage = nil }

            fields

            if let errorMessage {
                Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                    .font(.footnote)
                    .foregroundStyle(Color.dangerRed)
                    .frame(maxWidth: .infinity, alignment: .leading)
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
            .buttonStyle(.borderedProminent)
            .controlSize(.extraLarge)
            .tint(.brand)
            .frame(maxWidth: .infinity)
            .disabled(!canSubmit)

            if mode == .signup {
                Text("비밀번호는 8자 이상이어야 합니다.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(24)
        .background(.regularMaterial, in: .rect(cornerRadius: 28))
        .animation(.smooth(duration: 0.25), value: errorMessage)
        .animation(.smooth(duration: 0.25), value: mode)
    }

    @ViewBuilder
    private var fields: some View {
        VStack(spacing: 12) {
            if mode == .signup {
                TextField("이름 (선택)", text: $displayName)
                    .textContentType(.name)
                    .focused($focusedField, equals: .displayName)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .email }
                    .authFieldStyle()
            }

            TextField("이메일", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focusedField, equals: .email)
                .submitLabel(.next)
                .onSubmit { focusedField = .password }
                .authFieldStyle()

            SecureField("비밀번호", text: $password)
                .textContentType(mode == .login ? .password : .newPassword)
                .focused($focusedField, equals: .password)
                .submitLabel(.go)
                .onSubmit { if canSubmit { Task { await submit() } } }
                .authFieldStyle()
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

private extension View {
    func authFieldStyle() -> some View {
        self
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(.thinMaterial, in: .rect(cornerRadius: 14))
    }
}

#Preview {
    LoginView()
        .environment(AppState())
}
