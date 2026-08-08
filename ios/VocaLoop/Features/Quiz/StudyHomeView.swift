import SwiftUI

/// 웹 `src/components/QuizDashboard.jsx`의 이식.
/// 수치는 웹을 375pt로 렌더링해 계산된 스타일을 뽑아 맞춘 값이다.
struct StudyHomeView: View {
    @Environment(AppState.self) private var appState

    @State private var config: QuizConfigState?
    @State private var session: QuizSession?
    @State private var mixedSession: MixedQuizSession?
    @State private var completeWordSession: CompleteWordSession?
    @State private var buildSentenceSession: BuildSentenceSession?
    /// 최근 활동에 남길 모드 이름. 모드 카드의 제목을 그대로 쓴다.
    @State private var runningModeTitle = ""

    @State private var history: [QuizPreferences.HistoryEntry] = []
    @State private var rateTrend = 0
    @State private var weeklyGoal = QuizPreferences.weeklyGoal
    @State private var isEditingGoal = false
    @State private var goalDraft = ""
    @FocusState private var goalFieldFocused: Bool

    private var words: [Word] { appState.vocabulary?.words ?? [] }
    private var folders: [Folder] { appState.vocabulary?.folders ?? [] }

    var body: some View {
        NavigationStack {
            ZStack {
                DS.Surface.level50.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        headerSection
                        // space-y-14 (56) 사이로 모드 영역이 온다.
                        modeSections.padding(.top, 56)
                        sidebarSection.padding(.top, 48)
                        smartTipCard.padding(.top, 56)
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
            .task { refreshDashboard() }
            .fullScreenCover(item: $config) { state in
                QuizConfigView(state: state, onStart: start)
            }
            .fullScreenCover(item: $session, onDismiss: refreshDashboard) { session in
                QuizContainerView(session: session, modeTitle: runningModeTitle)
            }
            .fullScreenCover(item: $mixedSession, onDismiss: refreshDashboard) { session in
                MixedQuizContainerView(session: session, modeTitle: runningModeTitle)
            }
            .fullScreenCover(item: $completeWordSession) { session in
                CompleteWordQuizView(session: session)
            }
            .fullScreenCover(item: $buildSentenceSession) { session in
                BuildSentenceQuizView(session: session)
            }
        }
    }

    // MARK: - 통계

    /// 웹 `avgRateInt` — 전체 단어 학습률 평균.
    private var averageMastery: Int {
        guard !words.isEmpty else { return 0 }
        return words.reduce(0) { $0 + $1.learningRate } / words.count
    }

    /// 웹 `studiedThisWeek` — 최근 7일 안에 추가된 단어 수.
    private var studiedThisWeek: Int {
        let weekAgo = Date().addingTimeInterval(-7 * 24 * 60 * 60)
        return words.count { $0.createdAt > weekAgo }
    }

    private var accuracyHistory: [QuizPreferences.HistoryEntry] { history }

    private var lastAccuracy: Int? { accuracyHistory.first?.percentage }

    private var accuracyTrend: Int {
        guard accuracyHistory.count >= 2 else { return 0 }
        return accuracyHistory[0].percentage - accuracyHistory[1].percentage
    }

    /// 학습률이 가장 낮은 폴더. Smart Tip이 추천에 쓴다.
    private var weakestFolder: (name: String, rate: Int, count: Int)? {
        let candidates: [(String, Int, Int)] = folders.compactMap { folder in
            let inFolder = words.filter { $0.folderIds.contains(folder.id) }
            guard !inFolder.isEmpty else { return nil }
            let average = inFolder.reduce(0) { $0 + $1.learningRate } / inFolder.count
            return (folder.name, average, inFolder.count)
        }
        return candidates.min { $0.1 < $1.1 }
    }

    private var goalProgress: Double {
        guard weeklyGoal > 0 else { return 0 }
        return min(Double(studiedThisWeek) / Double(weeklyGoal) * 100, 100)
    }

    private func refreshDashboard() {
        history = QuizPreferences.history
        weeklyGoal = QuizPreferences.weeklyGoal
        if !words.isEmpty {
            rateTrend = QuizPreferences.recordMastery(averageMastery, on: Date())
        }
    }

    // MARK: - 헤더

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSBadge(text: "Learning Dashboard", tone: .brand, style: .dot, size: .md)
                .padding(.bottom, 16)

            (
                Text("Let's ").foregroundStyle(DS.Surface.level900)
                + Text("Level Up").foregroundStyle(DS.BrandText.base)
                + Text(" Your Vocab.").foregroundStyle(DS.Surface.level900)
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

            kpiCard.padding(.top, 32)
            statCards.padding(.top, 48)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var kpiCard: some View {
        HStack(spacing: 16) {
            kpiCell(label: "Total Words", value: "\(words.count)", tint: DS.BrandText.base)
            kpiCell(label: "Active Folders", value: "\(folders.count)", tint: DS.Surface.level900)
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
                value: "\(averageMastery)%",
                subValue: "Mastery Level",
                symbol: "target",
                tint: DS.BrandText.base,
                tintBackground: DS.Wash.brand,
                trend: rateTrend
            )
            ResultStatCard(
                eyebrow: "Session Accuracy",
                value: lastAccuracy.map { "\($0)%" } ?? "0%",
                subValue: "Last Session",
                symbol: "rosette",
                tint: DS.BrandText.accent,
                tintBackground: DS.Wash.accent,
                trend: accuracyTrend
            )
            ResultStatCard(
                eyebrow: "Studied This Week",
                value: "\(studiedThisWeek)",
                subValue: "Words Completed",
                symbol: "book",
                tint: DS.BrandText.warning,
                tintBackground: DS.Wash.warning
            )
        }
    }

    // MARK: - 모드 섹션

    private var modeSections: some View {
        VStack(alignment: .leading, spacing: 64) {
            modeSection(
                title: "Vocabulary Training",
                subtitle: "암기 수준에 맞춘 기초 단계 학습",
                symbol: "book",
                tone: .indigo,
                modes: QuizModeRegistry.vocabulary
            )
            modeSection(
                title: "TOEFL Reading",
                subtitle: "2026 개정 Reading task와 실전 모의고사",
                symbol: "sparkles",
                tone: .brand,
                modes: QuizModeRegistry.toeflReading
            )
            modeSection(
                title: "TOEFL Writing",
                subtitle: "2026 개정 Writing 3유형과 실전형 12문항 구성",
                symbol: "square.and.pencil",
                tone: .accent,
                modes: QuizModeRegistry.toeflWriting
            )
        }
    }

    private func modeSection(
        title: String,
        subtitle: String,
        symbol: String,
        tone: DashboardSectionHeading.Tone,
        modes: [QuizModeInfo]
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            DashboardSectionHeading(
                title: title,
                subtitle: subtitle,
                systemImage: symbol,
                tone: tone
            )
            .padding(.horizontal, 8)
            .padding(.bottom, 32)

            VStack(spacing: 32) {
                ForEach(modes) { mode in
                    QuizModeCard(mode: mode, wordCount: words.count) { open(mode) }
                }
            }
        }
    }

    // MARK: - 사이드바 (최근 활동 + 주간 목표)

    private var sidebarSection: some View {
        VStack(alignment: .leading, spacing: 32) {
            recentActivity
            weeklyGoalCard
        }
    }

    private var recentActivity: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                Image(systemName: "clock")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(DS.Surface.level600)
                    .frame(width: 40, height: 40)
                    .background(DS.Surface.level100, in: .rect(cornerRadius: DS.Radius.md))
                    .dsShadow(.soft)

                Text("Recent Activity")
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                    .foregroundStyle(DS.Surface.level900)

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 32)

            if history.isEmpty {
                Text("아직 활동 기록이 없습니다.\n첫 퀴즈를 시작해보세요!")
                    .font(.system(size: 14, weight: .bold))
                    .lineSpacing(8)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(DS.Surface.level400)
                    .padding(32)
                    .frame(maxWidth: .infinity)
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.Radius.card).strokeBorder(
                            DS.Surface.level200,
                            style: StrokeStyle(lineWidth: 2, dash: [6, 6])
                        )
                    )
            } else {
                VStack(spacing: 16) {
                    ForEach(history.prefix(5)) { entry in
                        historyItem(entry)
                    }
                }
            }
        }
    }

    private func historyItem(_ entry: QuizPreferences.HistoryEntry) -> some View {
        let matched = QuizModeRegistry.mode(titled: entry.mode)
        let canRelaunch = matched.map { !$0.comingSoon } ?? false
        let success = entry.percentage >= 80

        return Button {
            if let matched, canRelaunch { open(matched) }
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(entry.date.formatted(date: .numeric, time: .omitted))
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                        .foregroundStyle(DS.Surface.level400)

                    Spacer(minLength: 8)

                    DSBadge(
                        text: "\(entry.percentage)% Accuracy",
                        tone: success ? .success : .brand,
                        style: .pill,
                        size: .xs
                    )
                }
                .padding(.bottom, 12)

                HStack(spacing: 12) {
                    Image(systemName: "chart.bar")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(success ? DS.Solid.success : DS.Solid.brand500)
                        .frame(width: 32, height: 32)
                        .background(
                            success ? DS.Wash.success : DS.Wash.brand,
                            in: .rect(cornerRadius: DS.Radius.md)
                        )

                    Text(entry.mode)
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(DS.Surface.level700)

                    Spacer(minLength: 0)

                    if canRelaunch {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(DS.Surface.level300)
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level0, in: .rect(cornerRadius: DS.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.xl)
                    .strokeBorder(DS.Surface.level100, lineWidth: 1)
            )
            .dsShadow(.card)
        }
        .buttonStyle(.plain)
        .disabled(!canRelaunch)
    }

    private var weeklyGoalCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Weekly Goal")
                .font(.system(size: 18, weight: .black))
                .tracking(-0.45)
                .foregroundStyle(.white)
                .padding(.bottom, 16)

            HStack(alignment: .bottom) {
                Text("Words Studied".uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(Color(hex: 0xDBEAFE))

                Spacer(minLength: 8)

                goalValue
            }
            .padding(.bottom, 4)

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(.black.opacity(0.2))
                    Capsule()
                        .fill(Color.white)
                        .frame(width: proxy.size.width * goalProgress / 100)
                        .shadow(color: .white.opacity(0.5), radius: 4)
                }
            }
            .frame(height: 8)
            .padding(.bottom, 16)
            .animation(.easeOut(duration: 0.8), value: goalProgress)

            Text(
                goalProgress >= 100
                    ? "이번 주 목표를 달성했어요!"
                    : "이번 주 목표의 \(Int(goalProgress.rounded()))%를 달성했습니다. 조금만 더 힘내세요."
            )
            .font(.system(size: 10, weight: .bold))
            .lineSpacing(6.25)
            .foregroundStyle(Color(hex: 0xDBEAFE).opacity(0.8))
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(32)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            DS.Gradient.cta
                .overlay(alignment: .topTrailing) {
                    Circle()
                        .fill(.white.opacity(0.1))
                        .frame(width: 128, height: 128)
                        .blur(radius: 32)
                        .offset(x: 64, y: -64)
                }
        }
        .clipShape(.rect(cornerRadius: DS.Radius.card))
        .dsShadow(.glowIndigo)
    }

    /// "18 / 50" — 목표 숫자는 눌러서 바로 고칠 수 있다.
    private var goalValue: some View {
        HStack(spacing: 4) {
            Text("\(studiedThisWeek)")
                .font(.system(size: 14, weight: .black))
                .monospacedDigit()
                .foregroundStyle(.white)

            Text("/")
                .font(.system(size: 14, weight: .black))
                .foregroundStyle(Color(hex: 0xDBEAFE))

            if isEditingGoal {
                TextField("", text: $goalDraft)
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.center)
                    .font(.system(size: 14, weight: .black))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .focused($goalFieldFocused)
                    .frame(width: 56)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.white.opacity(0.15), in: .rect(cornerRadius: DS.Radius.xs))
                    .onSubmit(commitGoal)
                    .onChange(of: goalFieldFocused) { _, focused in
                        if !focused { commitGoal() }
                    }
            } else {
                Button {
                    goalDraft = "\(weeklyGoal)"
                    isEditingGoal = true
                    goalFieldFocused = true
                } label: {
                    HStack(spacing: 4) {
                        Text("\(weeklyGoal)")
                            .font(.system(size: 14, weight: .black))
                            .monospacedDigit()
                        Image(systemName: "pencil")
                            .font(.system(size: 10, weight: .bold))
                            .opacity(0.5)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.white.opacity(0.001), in: .rect(cornerRadius: DS.Radius.xs))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("주간 목표 변경")
            }
        }
    }

    private func commitGoal() {
        defer { isEditingGoal = false }
        guard let parsed = Int(goalDraft.trimmingCharacters(in: .whitespaces)) else { return }
        QuizPreferences.weeklyGoal = parsed
        weeklyGoal = QuizPreferences.weeklyGoal
    }

    // MARK: - Smart Tip

    private var smartTipCard: some View {
        VStack(alignment: .leading, spacing: 40) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 40, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: 80, height: 80)
                .background(
                    LinearGradient(
                        colors: [DS.Solid.brand500, DS.Solid.indigo],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: .rect(cornerRadius: DS.Radius.card)
                )
                .shadow(color: .black.opacity(0.2), radius: 12, y: 10)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    Circle().fill(Color(hex: 0x60A5FA)).frame(width: 6, height: 6)
                    Text("Smart Learning Strategy")
                        .font(.system(size: 20, weight: .black))
                        .tracking(-0.5)
                        .foregroundStyle(.white)
                }
                .padding(.bottom, 12)

                smartTipBody
                    .font(.system(size: 16, weight: .bold))
                    .lineSpacing(10)
                    .foregroundStyle(DS.Surface.level400.opacity(0.9))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(40)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Solid.ink)
        .clipShape(.rect(cornerRadius: DS.Radius.hero))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.hero)
                .strokeBorder(Color(hex: 0x1E293B), lineWidth: 1)
        )
        .dsShadow(.elevated)
    }

    @ViewBuilder
    private var smartTipBody: some View {
        if let weakest = weakestFolder {
            Text("'\(weakest.name)'")
                .foregroundStyle(Color(hex: 0x60A5FA))
                .italic()
            + Text(" 폴더의 학습률이")
            + Text(" \(weakest.rate)%")
                .foregroundStyle(.white)
            + Text("로 가장 낮아요 (\(weakest.count)개 단어). 이 폴더를 선택해 집중 학습하면 전체 정답률을 가장 빠르게 올릴 수 있습니다. AI 모드를 켜면 뉘앙스 차이까지 점검할 수 있어요.")
        } else {
            Text("폴더를 만들고 단어를 분류한 다음, 학습률이 낮은 폴더부터 집중 공략해보세요. AI 모드를 활성화하면 단순한 암기를 넘어 단어 사이의 미묘한 뉘앙스 차이까지 완벽하게 파악할 수 있습니다.")
        }
    }

    // MARK: - 실행

    private func open(_ mode: QuizModeInfo) {
        guard !mode.comingSoon else { return }
        config = QuizConfigState(mode: mode, words: words, folders: folders)
    }

    private func start(_ launch: QuizLaunch) {
        SpeechSynthesizer.shared.isEnabled = launch.soundEnabled
        runningModeTitle = launch.mode.title

        switch launch.mode.id {
        case "mixed":
            mixedSession = MixedQuizSession(
                words: launch.words,
                stages: launch.stages,
                setSize: launch.studySetSize,
                aiMode: launch.aiMode
            )
        case "multiple":
            session = QuizSession(
                mode: .multipleChoice,
                words: launch.words,
                questionCount: launch.questionCount,
                aiMode: launch.aiMode
            )
        case "short":
            session = QuizSession(
                mode: .shortAnswer,
                words: launch.words,
                questionCount: launch.questionCount,
                aiMode: launch.aiMode
            )
        case "toefl-complete":
            completeWordSession = CompleteWordSession(
                service: CompleteWordService(api: appState.api),
                request: CompleteWordService.Request(
                    questionCount: min(3, launch.questionCount),
                    difficulty: launch.difficulty,
                    // 내 단어장 단어를 지문에 섞어 달라고 요청한다.
                    vocabularyWords: Array(launch.words.prefix(20).map(\.word))
                )
            )
        case "toefl-build":
            buildSentenceSession = BuildSentenceSession(
                service: BuildSentenceService(api: appState.api),
                request: BuildSentenceService.Request(
                    difficulty: launch.difficulty,
                    vocabularyWords: Array(launch.words.prefix(20).map(\.word))
                )
            )
        default:
            break
        }
    }
}

// MARK: - 모드 카드

/// 웹 `ModeCard` — 아이콘 박스, 배지, 제목, 설명, CTA.
/// 배경 우하단에 아이콘을 3% 투명도로 크게 깔아 두는 것까지 같다.
struct QuizModeCard: View {
    let mode: QuizModeInfo
    let wordCount: Int
    let action: () -> Void

    /// 웹은 단어가 없으면 단어장 기반 모드를 잠근다.
    private var locked: Bool {
        mode.comingSoon
            || (["multiple", "short", "mixed"].contains(mode.id) && wordCount == 0)
    }

    private var accentText: Color {
        mode.accent == .brand ? DS.BrandText.base : DS.BrandText.accent
    }

    private var accentWash: Color {
        mode.accent == .brand ? DS.Wash.brand : DS.Wash.accent
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 0) {
                Image(systemName: mode.symbolName)
                    .font(.system(size: 28, weight: .medium))
                    .foregroundStyle(locked ? DS.Surface.level500 : accentText)
                    .frame(width: 56, height: 56)
                    .background(
                        locked ? DS.Surface.level200 : accentWash,
                        in: .rect(cornerRadius: DS.Radius.xl)
                    )
                    .dsShadow(.soft)
                    .padding(.bottom, 24)

                if mode.recommended && !locked {
                    DSBadge(text: "Recommended", tone: .success, style: .pill, size: .sm)
                        .padding(.bottom, 12)
                }

                Text(mode.title)
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                    .foregroundStyle(DS.Surface.level900)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.bottom, 8)

                Text(mode.detail)
                    .font(.system(size: 12, weight: .bold))
                    .lineSpacing(7.5)
                    .foregroundStyle(DS.Surface.level500.opacity(0.8))
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.bottom, 32)

                HStack(spacing: 8) {
                    Text(mode.comingSoon ? "Coming Soon" : "Configure Mode")
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                    if !locked {
                        Text("→").font(.system(size: 16, weight: .regular))
                    }
                }
                .foregroundStyle(locked ? DS.Surface.level400 : accentText)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(alignment: .bottomTrailing) {
                // 웹의 고스트 아이콘 (96pt, 3%)
                Image(systemName: mode.symbolName)
                    .font(.system(size: 84, weight: .medium))
                    .foregroundStyle(accentText.opacity(0.03))
                    .frame(width: 96, height: 96)
                    .offset(x: 16, y: 16)
                    .allowsHitTesting(false)
            }
            .background(
                locked ? DS.Surface.level50 : DS.Surface.level0,
                in: .rect(cornerRadius: DS.Radius.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.card)
                    .strokeBorder(DS.Surface.level100, lineWidth: 2)
            )
            .clipShape(.rect(cornerRadius: DS.Radius.card))
        }
        .buttonStyle(.plain)
        .disabled(locked)
        .opacity(locked ? 0.6 : 1)
        .saturation(locked ? 0 : 1)
    }
}

// MARK: - 섹션 헤딩

/// 웹 `SectionHeading` — 솔리드 색 아이콘 박스에 흰 아이콘.
/// 대시보드에만 쓰는 형태라 `DSSectionHeading`(옅은 배경)과 따로 둔다.
struct DashboardSectionHeading: View {
    enum Tone {
        case indigo, brand, accent

        var background: Color {
            switch self {
            case .indigo: return DS.Solid.indigo
            case .brand: return DS.Solid.brand
            case .accent: return DS.Solid.accent
            }
        }

        var glow: DS.Shadow {
            switch self {
            case .indigo: return .glowIndigo
            case .brand: return .glowBrand
            case .accent: return DS.Shadow(color: DS.Solid.accent.opacity(0.35), radius: 15, y: 10)
            }
        }
    }

    let title: String
    let subtitle: String
    var systemImage: String
    var tone: Tone = .indigo

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: systemImage)
                .font(.system(size: 24, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(tone.background, in: .rect(cornerRadius: DS.Radius.lg))
                .dsShadow(tone.glow)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 24, weight: .black))
                    .tracking(-0.6)
                    .foregroundStyle(DS.Surface.level900)
                Text(subtitle)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(DS.Surface.level400)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
    }
}

extension QuizConfigState: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}
