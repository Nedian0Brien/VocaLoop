import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var isConfirmingSignOut = false

    var body: some View {
        NavigationStack {
            List {
                if let user = appState.currentUser {
                    Section {
                        HStack(spacing: 14) {
                            Circle()
                                .fill(LinearGradient.brandGradient)
                                .frame(width: 52, height: 52)
                                .overlay {
                                    Text(user.initials)
                                        .font(.title3.bold())
                                        .foregroundStyle(.white)
                                }

                            VStack(alignment: .leading, spacing: 3) {
                                Text(user.displayNameOrEmail).font(.headline)
                                Text(user.email)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }

                Section("학습 통계") {
                    let words = appState.vocabulary?.words ?? []
                    LabeledContent("전체 단어", value: "\(words.count)개")
                    LabeledContent("학습 완료", value: "\(words.count { $0.status == .mastered })개")
                    LabeledContent("즐겨찾기", value: "\(words.count(where: \.isFlagged))개")
                }

                Section {
                    LabeledContent("서버", value: AppEnvironment.apiBaseURL.host() ?? "-")
                    LabeledContent("버전", value: Bundle.main.shortVersion)
                } header: {
                    Text("정보")
                } footer: {
                    Text("단어와 학습 기록은 서버에 저장되며 웹과 동기화됩니다.")
                }

                Section {
                    Button("로그아웃", role: .destructive) {
                        isConfirmingSignOut = true
                    }
                }
            }
            .navigationTitle("설정")
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
}

extension Bundle {
    var shortVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}
