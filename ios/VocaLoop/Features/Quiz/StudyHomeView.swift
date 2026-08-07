import SwiftUI

struct StudyHomeView: View {
    @Environment(AppState.self) private var appState

    @State private var selectedMode: QuizMode = .multipleChoice
    @State private var questionCount = 10
    @State private var session: QuizSession?

    private var availableWords: [Word] {
        appState.vocabulary?.words.filter { !$0.primaryMeaning.isEmpty } ?? []
    }

    /// 객관식은 오답 보기가 필요해 최소 인원이 있어야 말이 된다.
    private var canStart: Bool {
        switch selectedMode {
        case .multipleChoice: return availableWords.count >= 4
        case .shortAnswer, .flashcard: return !availableWords.isEmpty
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        heroCard
                        statsRow
                        modeSection
                        countSection
                        startButton
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 4)
                    .padding(.bottom, 32)
                }
                .scrollEdgeEffectStyle(.soft, for: .top)
            }
            .navigationTitle("학습")
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .fullScreenCover(item: $session) { session in
                QuizContainerView(session: session)
            }
        }
    }

    private var heroCard: some View {
        DSCard(variant: .gradient, radius: DS.Radius.card, padding: .lg) {
            VStack(alignment: .leading, spacing: 12) {
                DSBadge(text: "Today's loop", tone: .onDark, style: .pill)

                Text("오늘도 한 바퀴\n돌려볼까요?")
                    .font(DS.Font.sectionTitle)
                    .dsTightTracking(24)
                    .fixedSize(horizontal: false, vertical: true)

                Text("\(availableWords.count)개 단어가 학습 대기 중입니다")
                    .font(DS.Font.meta)
                    .foregroundStyle(.white.opacity(0.85))
            }
        }
    }

    private var statsRow: some View {
        let words = appState.vocabulary?.words ?? []

        return DSCard(variant: .elevated, radius: DS.Radius.xl, padding: .md) {
            HStack(spacing: 12) {
                DSStat(
                    title: "전체",
                    value: "\(words.count)",
                    systemImage: "square.stack.3d.up",
                    tone: .brand
                )
                Divider().frame(height: 52)
                DSStat(
                    title: "학습 중",
                    value: "\(words.count { $0.learningStatus == .learning })",
                    systemImage: "arrow.trianglehead.2.clockwise",
                    tone: .warning
                )
                Divider().frame(height: 52)
                DSStat(
                    title: "외웠어요",
                    value: "\(words.count { $0.learningStatus == .memorized })",
                    systemImage: "checkmark.seal.fill",
                    tone: .success
                )
            }
        }
    }

    private var modeSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            DSSectionHeading(
                title: "Vocabulary Training",
                subtitle: "암기 수준에 맞춘 기초 단계 학습",
                systemImage: "book.pages",
                tone: .brand
            )

            VStack(spacing: 10) {
                ForEach(QuizMode.allCases) { mode in
                    modeCard(mode)
                }
            }
        }
        .animation(.smooth(duration: 0.2), value: selectedMode)
    }

    private func modeCard(_ mode: QuizMode) -> some View {
        let isSelected = selectedMode == mode

        return Button {
            selectedMode = mode
        } label: {
            DSCard(
                variant: isSelected ? .elevated : .flat,
                radius: DS.Radius.xl,
                padding: .none
            ) {
                HStack(spacing: 14) {
                    Image(systemName: mode.symbolName)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(isSelected ? .white : DS.Surface.level500)
                        .frame(width: 44, height: 44)
                        .background(
                            isSelected
                                ? AnyShapeStyle(DS.Solid.brand)
                                : AnyShapeStyle(DS.Surface.level100),
                            in: .rect(cornerRadius: DS.Radius.md)
                        )

                    VStack(alignment: .leading, spacing: 2) {
                        Text(mode.title)
                            .font(DS.Font.bodyStrong)
                            .dsTightTracking(16)
                            .foregroundStyle(DS.Surface.level900)
                        Text(mode.detail)
                            .font(DS.Font.caption)
                            .foregroundStyle(DS.Surface.level500)
                    }

                    Spacer(minLength: 0)

                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(isSelected ? DS.BrandText.base : DS.Surface.level300)
                }
                .padding(16)
            }
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.xl)
                    .strokeBorder(isSelected ? DS.Solid.brand : .clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    private var countSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("문제 수")
                .font(DS.Font.bodyStrong)
                .dsTightTracking(16)
                .foregroundStyle(DS.Surface.level900)

            HStack(spacing: 8) {
                ForEach([5, 10, 20, 30], id: \.self) { count in
                    Button {
                        questionCount = count
                    } label: {
                        Text("\(count)")
                            .font(DS.Font.label)
                            .monospacedDigit()
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .foregroundStyle(questionCount == count ? .white : DS.Surface.level600)
                            .background(
                                questionCount == count
                                    ? AnyShapeStyle(DS.Solid.brand)
                                    : AnyShapeStyle(DS.Surface.level0),
                                in: .rect(cornerRadius: DS.Radius.md)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: DS.Radius.md).strokeBorder(
                                    questionCount == count ? .clear : DS.Surface.level200,
                                    lineWidth: 1
                                )
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .animation(.smooth(duration: 0.2), value: questionCount)
        }
    }

    private var startButton: some View {
        VStack(spacing: 10) {
            Button("학습 시작") {
                session = QuizSession(
                    mode: selectedMode,
                    words: availableWords,
                    questionCount: questionCount
                )
            }
            .buttonStyle(.ds(.primary, size: .lg, fullWidth: true))
            .disabled(!canStart)

            if !canStart {
                Text(
                    selectedMode == .multipleChoice
                        ? "객관식은 뜻이 있는 단어가 4개 이상 필요합니다."
                        : "뜻이 등록된 단어가 없습니다."
                )
                .font(DS.Font.caption)
                .foregroundStyle(DS.Surface.level500)
                .multilineTextAlignment(.center)
            }
        }
    }
}

extension QuizSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
