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
                    VStack(spacing: 16) {
                        if let user = appState.currentUser {
                            profileCard(user)
                        }
                        statsCard
                        infoCard
                        signOutButton
                    }
                    .padding(.horizontal, 16)
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

    private func profileCard(_ user: User) -> some View {
        DSCard(variant: .dark, radius: DS.Radius.card, padding: .lg) {
            HStack(spacing: 16) {
                Text(user.initials)
                    .font(DS.Font.sectionTitle)
                    .foregroundStyle(.white)
                    .frame(width: 62, height: 62)
                    .background(DS.Gradient.hero, in: .circle)

                VStack(alignment: .leading, spacing: 4) {
                    Text(user.displayNameOrEmail)
                        .font(DS.Font.cardTitle)
                        .dsTightTracking(20)
                    Text(user.email)
                        .font(DS.Font.caption)
                        .foregroundStyle(.white.opacity(0.65))
                }

                Spacer(minLength: 0)
            }
        }
    }

    private var statsCard: some View {
        DSCard(variant: .elevated, radius: DS.Radius.xl, padding: .md) {
            VStack(alignment: .leading, spacing: 16) {
                DSSectionHeading(
                    title: "학습 통계",
                    subtitle: "웹과 실시간으로 동기화됩니다",
                    systemImage: "chart.bar.xaxis",
                    tone: .brand
                )

                HStack(spacing: 12) {
                    DSStat(
                        title: "전체 단어",
                        value: "\(words.count)",
                        systemImage: "square.stack.3d.up",
                        tone: .brand
                    )
                    Divider().frame(height: 52)
                    DSStat(
                        title: "외웠어요",
                        value: "\(words.count { $0.learningStatus == .memorized })",
                        systemImage: "checkmark.seal.fill",
                        tone: .success
                    )
                    Divider().frame(height: 52)
                    DSStat(
                        title: "즐겨찾기",
                        value: "\(words.count(where: \.isFlagged))",
                        systemImage: "star.fill",
                        tone: .warning
                    )
                }
            }
        }
    }

    private var infoCard: some View {
        DSCard(variant: .flat, radius: DS.Radius.xl, padding: .md) {
            VStack(spacing: 0) {
                infoRow("서버", AppEnvironment.apiBaseURL.host() ?? "-")
                Divider().padding(.vertical, 12)
                infoRow("버전", Bundle.main.shortVersion)
            }
        }
    }

    private func infoRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .font(DS.Font.meta)
                .foregroundStyle(DS.Surface.level600)
            Spacer()
            Text(value)
                .font(DS.Font.caption)
                .foregroundStyle(DS.Surface.level500)
        }
    }

    private var signOutButton: some View {
        Button("로그아웃") { isConfirmingSignOut = true }
            .buttonStyle(.ds(.secondary, size: .lg, fullWidth: true))
            .foregroundStyle(DS.BrandText.danger)
    }
}

extension Bundle {
    var shortVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}
