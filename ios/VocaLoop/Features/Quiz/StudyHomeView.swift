import SwiftUI

/// 웹 `src/components/QuizDashboard.jsx`의 이식.
/// 수치는 웹을 375pt로 렌더링해 측정한 값이다.
struct StudyHomeView: View {
    @Environment(AppState.self) private var appState

    @State private var questionCount = 10
    @State private var session: QuizSession?
    @State private var completeWordSession: CompleteWordSession?
    @State private var toeflDifficulty: ToeflDifficulty = .intermediate

    private var words: [Word] { appState.vocabulary?.words ?? [] }

    private var availableWords: [Word] {
        words.filter { !$0.primaryMeaning.isEmpty }
    }

    /// 웹의 Avg. Mastery — 전체 단어 학습률 평균.
    private var averageMastery: Int {
        guard !words.isEmpty else { return 0 }
        return words.reduce(0) { $0 + $1.learningRate } / words.count
    }

    private var folderCount: Int { appState.vocabulary?.folders.count ?? 0 }

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        header
                        kpiRow.padding(.top, 32)
                        statCards.padding(.top, 48)
                        modeSection.padding(.top, 48)
                        toeflSection.padding(.top, 48)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
                .scrollEdgeEffectStyle(.soft, for: .top)
            }
            .navigationTitle("학습")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DS.Surface.level50, for: .navigationBar)
            .fullScreenCover(item: $session) { session in
                QuizContainerView(session: session)
            }
            .fullScreenCover(item: $completeWordSession) { session in
                CompleteWordQuizView(session: session)
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSBadge(text: "Learning Dashboard", tone: .brand, style: .dot)
                .padding(.bottom, 16)

            // "Let's Level Up Your Vocab." — 가운데 두 단어만 브랜드색
            (
                Text("Let's ")
                    .foregroundStyle(DS.Surface.level900)
                + Text("Level Up")
                    .foregroundStyle(DS.BrandText.base)
                + Text(" Your Vocab.")
                    .foregroundStyle(DS.Surface.level900)
            )
            .font(.system(size: 36, weight: .black))
            .tracking(-0.9)
            .lineSpacing(4)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.bottom, 16)

            Text("당신만을 위한 지능형 학습 대시보드입니다. 오늘의 목표를 정하고 퀴즈를 시작해보세요.")
                .font(.system(size: 16, weight: .bold))
                .lineSpacing(10)
                .foregroundStyle(DS.Surface.level500)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// 흰 카드 안에 옅은 셀 두 개가 들어간 형태.
    private var kpiRow: some View {
        HStack(spacing: 16) {
            kpiCell(label: "Total Words", value: "\(words.count)", tint: DS.BrandText.base)
            kpiCell(label: "Active Folders", value: "\(folderCount)", tint: DS.Surface.level900)
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Surface.level100, lineWidth: 1)
        )
        .dsShadow(.soft)
    }

    private func kpiCell(label: String, value: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)
            Text(value)
                .font(.system(size: 20, weight: .black))
                .tracking(-1)
                .monospacedDigit()
                .foregroundStyle(tint)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(DS.Surface.level50, in: .rect(cornerRadius: DS.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl)
                .strokeBorder(DS.Surface.level100.opacity(0.5), lineWidth: 1)
        )
    }

    private var statCards: some View {
        VStack(spacing: 24) {
            ResultStatCard(
                eyebrow: "Avg. Mastery",
                value: "\(averageMastery)",
                subValue: "Mastery Level",
                symbol: "target",
                tint: DS.BrandText.base,
                tintBackground: DS.Wash.brand
            )
            ResultStatCard(
                eyebrow: "Memorized",
                value: "\(words.count { $0.learningStatus == .memorized })",
                subValue: "외웠어요",
                symbol: "rosette",
                tint: DS.BrandText.accent,
                tintBackground: DS.Wash.accent
            )
            ResultStatCard(
                eyebrow: "Needs Review",
                value: "\(words.count { $0.learningStatus == .difficult })",
                subValue: "어려워요",
                symbol: "exclamationmark.triangle",
                tint: DS.BrandText.danger,
                tintBackground: DS.Wash.danger
            )
        }
    }

    // MARK: - Modes

    private var modeSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Vocabulary Training")
                .font(.system(size: 24, weight: .black))
                .tracking(-0.6)
                .foregroundStyle(DS.Surface.level900)
                .padding(.bottom, 6)

            Text("암기 수준에 맞춘 기초 단계 학습")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DS.Surface.level500)
                .padding(.bottom, 20)

            countPicker.padding(.bottom, 20)

            VStack(spacing: 16) {
                ForEach(QuizMode.allCases) { mode in
                    modeCard(mode)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var countPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("문제 수".uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)

            HStack(spacing: 8) {
                ForEach([5, 10, 20, 30], id: \.self) { count in
                    Button {
                        questionCount = count
                    } label: {
                        Text("\(count)")
                            .font(.system(size: 14, weight: .black))
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

    /// 웹의 모드 카드 — 세로 배치에 배지·제목·설명·화살표.
    private func modeCard(_ mode: QuizMode) -> some View {
        let enabled = canStart(mode)

        return Button {
            session = QuizSession(
                mode: mode,
                words: availableWords,
                questionCount: questionCount
            )
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Image(systemName: mode.symbolName)
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(DS.BrandText.base)
                        .frame(width: 48, height: 48)
                        .background(DS.Wash.brand, in: .rect(cornerRadius: 20))

                    Spacer(minLength: 0)

                    if mode == .multipleChoice {
                        DSBadge(text: "Recommended", tone: .success, style: .pill)
                    }
                }
                .padding(.bottom, 16)

                Text(mode.title)
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                    .foregroundStyle(DS.Surface.level900)
                    .padding(.bottom, 8)

                Text(mode.detail)
                    .font(.system(size: 12, weight: .bold))
                    .lineSpacing(6)
                    .foregroundStyle(DS.Surface.level500.opacity(0.8))
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.bottom, 32)

                HStack(spacing: 6) {
                    Text(enabled ? "시작하기" : reason(for: mode))
                        .font(.system(size: 12, weight: .black))
                    if enabled {
                        Image(systemName: "arrow.right")
                            .font(.system(size: 12, weight: .black))
                    }
                }
                .foregroundStyle(enabled ? DS.BrandText.base : DS.Surface.level400)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.card)
                    .strokeBorder(DS.Surface.level100, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.6)
    }

    // MARK: - TOEFL

    private var toeflSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("TOEFL Practice")
                .font(.system(size: 24, weight: .black))
                .tracking(-0.6)
                .foregroundStyle(DS.Surface.level900)
                .padding(.bottom, 6)

            Text("학술 지문으로 실전 감각을 익힙니다")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DS.Surface.level500)
                .padding(.bottom, 20)

            difficultyPicker.padding(.bottom, 20)

            completeWordCard
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var difficultyPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("난이도".uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1)
                .foregroundStyle(DS.Surface.level400)

            HStack(spacing: 8) {
                ForEach(ToeflDifficulty.allCases) { level in
                    Button {
                        toeflDifficulty = level
                    } label: {
                        Text(level.label)
                            .font(.system(size: 14, weight: .black))
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .foregroundStyle(
                                toeflDifficulty == level ? .white : DS.Surface.level600
                            )
                            .background(
                                toeflDifficulty == level
                                    ? AnyShapeStyle(DS.Solid.accent)
                                    : AnyShapeStyle(DS.Surface.level0),
                                in: .rect(cornerRadius: DS.Radius.md)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: DS.Radius.md).strokeBorder(
                                    toeflDifficulty == level ? .clear : DS.Surface.level200,
                                    lineWidth: 1
                                )
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .animation(.smooth(duration: 0.2), value: toeflDifficulty)
        }
    }

    private var completeWordCard: some View {
        Button {
            completeWordSession = CompleteWordSession(
                service: CompleteWordService(api: appState.api),
                request: CompleteWordService.Request(
                    difficulty: toeflDifficulty,
                    // 내 단어장 단어를 지문에 섞어 달라고 요청한다.
                    vocabularyWords: Array(availableWords.prefix(20).map(\.word))
                )
            )
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Image(systemName: "text.word.spacing")
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(DS.BrandText.accent)
                        .frame(width: 48, height: 48)
                        .background(DS.Wash.accent, in: .rect(cornerRadius: 20))

                    Spacer(minLength: 0)

                    DSBadge(text: "AI", tone: .accent, style: .pill)
                }
                .padding(.bottom, 16)

                Text("Complete the Words")
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                    .foregroundStyle(DS.Surface.level900)
                    .padding(.bottom, 8)

                Text("AI가 만든 학술 지문의 빈칸을 한 글자씩 채웁니다. 앞 글자만 보여주므로 철자까지 익힐 수 있습니다.")
                    .font(.system(size: 12, weight: .bold))
                    .lineSpacing(6)
                    .foregroundStyle(DS.Surface.level500.opacity(0.8))
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.bottom, 32)

                HStack(spacing: 6) {
                    Text("시작하기").font(.system(size: 12, weight: .black))
                    Image(systemName: "arrow.right").font(.system(size: 12, weight: .black))
                }
                .foregroundStyle(DS.BrandText.accent)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.card)
                    .strokeBorder(DS.Surface.level100, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    /// 객관식은 오답 보기가 필요해 최소 인원이 있어야 말이 된다.
    private func canStart(_ mode: QuizMode) -> Bool {
        switch mode {
        case .multipleChoice: return availableWords.count >= 4
        case .shortAnswer, .flashcard: return !availableWords.isEmpty
        }
    }

    private func reason(for mode: QuizMode) -> String {
        mode == .multipleChoice ? "단어 4개 이상 필요" : "뜻이 있는 단어가 없습니다"
    }
}

extension QuizSession: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
