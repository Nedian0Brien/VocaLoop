import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var isConfirmingSignOut = false

    private var words: [Word] { appState.vocabulary?.words ?? [] }

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        if let user = appState.currentUser {
                            profileCard(user)
                        }
                        statsCard
                        infoCard
                        signOutButton
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 4)
                    .padding(.bottom, 32)
                }
                .scrollEdgeEffectStyle(.soft, for: .top)
            }
            .navigationTitle("설정")
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .confirmationDialog("로그아웃할까요?", isPresented: $isConfirmingSignOut) {
                Button("로그아웃", role: .destructive) {
                    Task { await appState.signOut() }
                }
                Button("취소", role: .cancel) {}
            } message: {
                Text("다시 로그인하면 단어와 학습 기록이 그대로 남아 있습니다.")
            }
        }
    }

    /// 학습 홈 히어로와 같은 그라디언트. 화면마다 색을 가득 쓰는 자리는 하나뿐이다.
    private func profileCard(_ user: User) -> some View {
        HStack(spacing: 16) {
            Text(user.initials)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 62, height: 62)
                .background(.white.opacity(0.2), in: .circle)

            VStack(alignment: .leading, spacing: 3) {
                Text(user.displayNameOrEmail)
                    .font(.title3.bold())
                    .foregroundStyle(.white)
                Text(user.email)
                    .font(.footnote)
                    .foregroundStyle(.white.opacity(0.7))
            }

            Spacer(minLength: 0)
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Gradient.hero, in: .rect(cornerRadius: 26))
        .shadow(color: DS.Solid.indigo.opacity(0.35), radius: 22, y: 12)
    }

    private var statsCard: some View {
        card {
            VStack(alignment: .leading, spacing: 16) {
                Text("학습 통계")
                    .font(.subheadline.weight(.semibold))

                HStack(spacing: 0) {
                    stat("전체 단어", "\(words.count)", tint: DS.Solid.brand500)
                    Divider().frame(height: 44)
                    stat(
                        "외웠어요",
                        "\(words.count { $0.learningStatus == .memorized })",
                        tint: DS.Solid.success
                    )
                    Divider().frame(height: 44)
                    stat("즐겨찾기", "\(words.count(where: \.isFlagged))", tint: DS.Solid.warning)
                }
            }
        }
    }

    private func stat(_ label: String, _ value: String, tint: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .foregroundStyle(tint)
                .monospacedDigit()
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private var infoCard: some View {
        card {
            VStack(spacing: 0) {
                infoRow("서버", AppEnvironment.apiBaseURL.host() ?? "-")
                Divider().padding(.vertical, 12)
                infoRow("버전", Bundle.main.shortVersion)
            }
        }
    }

    private func infoRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title).font(.subheadline)
            Spacer(minLength: 8)
            Text(value)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    /// 흰 카드 한 장. 학습 홈과 같은 브랜드 그림자를 쓴다.
    private func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level0, in: .rect(cornerRadius: 20))
            .shadow(color: DS.Solid.brand500.opacity(0.1), radius: 14, y: 6)
    }

    private var signOutButton: some View {
        Button("로그아웃", role: .destructive) { isConfirmingSignOut = true }
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(DS.Surface.level0, in: .rect(cornerRadius: 20))
            .shadow(color: DS.Solid.danger.opacity(0.1), radius: 14, y: 6)
            .padding(.top, 4)
    }
}

extension Bundle {
    var shortVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}
