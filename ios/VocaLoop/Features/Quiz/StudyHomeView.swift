import Charts
/// 학습 홈. 브랜드 색을 앞세운 대시보드 구조 — 그라디언트 히어로,
/// 색 그림자를 두른 카드, 시스템 텍스트 스타일(Dynamic Type).
/// 학습 홈. 네이티브 목록 구조로 다시 만들었다 — 큰 제목, 그룹 목록,
/// 시스템 폰트(Dynamic Type), 설정 모달은 시트.
struct StudyHomeView: View {
    @Environment(AppState.self) private var appState

    @State private var config: QuizConfigState?
    @State private var session: QuizSession?
    @State private var mixedSession: MixedQuizSession?
    @State private var completeWordSession: CompleteWordSession?
    @State private var buildSentenceSession: BuildSentenceSession?
    @State private var readingTaskSession: ReadingTaskSession?
    @State private var writingTaskSession: WritingTaskSession?
    @State private var readingMockSession: ReadingMockSession?
    @State private var writingMockSession: WritingMockSession?
    /// 최근 활동에 남길 모드 이름. 모드 줄의 제목을 그대로 쓴다.
    @State private var runningModeTitle = ""

    @State private var history: [QuizPreferences.HistoryEntry] = []
    /// 서버에 저장해 둔 TOEFL 세트. 눌러서 다시 연다.
    @State private var savedSets: [ToeflAsset] = []
    @State private var readingSummary = ToeflReadingStats.summarize()
    @State private var rateTrend = 0
    @State private var masteryTrend: [QuizPreferences.MasteryPoint] = []
    @State private var weeklyGoal = QuizPreferences.weeklyGoal

    private var words: [Word] { appState.vocabulary?.words ?? [] }
    private var folders: [Folder] { appState.vocabulary?.folders ?? [] }


    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    masteryHero
                    goalCard
                    readingMasteryCard

                    modeSection(
                        title: "단어 학습",
                        subtitle: "암기 수준에 맞춘 기초 단계 학습",
                        symbol: "book.fill",
                        tint: DS.Solid.brand500,
                        modes: QuizModeRegistry.vocabulary
                    )
                    modeSection(
                        title: "TOEFL Reading",
                        subtitle: "2026 개정 Reading task와 실전 모의고사",
                        symbol: "sparkles",
                        tint: DS.Solid.indigo,
                        modes: QuizModeRegistry.toeflReading
                    )
                    modeSection(
                        title: "TOEFL Writing",
                        subtitle: "2026 개정 Writing 3유형과 실전형 12문항 구성",
                        symbol: "square.and.pencil",
                        tint: DS.Solid.accent500,
                        modes: QuizModeRegistry.toeflWriting
                    )

                    recentActivity
                    smartTipCard
                }
                .padding(.horizontal, 20)
                .padding(.top, 4)
                .padding(.bottom, 32)
            }
            .background(DS.Surface.level50)
            .navigationTitle("학습")
            .navigationBarTitleDisplayMode(.large)
            .task { refreshDashboard() }
            // 설정은 화면을 다 덮을 만큼 무거운 단계가 아니라 시트로 띄운다.
            // 퀴즈 본편만 전체 화면을 쓴다.
            .sheet(item: $config) { state in
                QuizConfigView(state: state, onStart: start)
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
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
            .fullScreenCover(item: $readingTaskSession, onDismiss: refreshDashboard) { session in
                ReadingTaskQuizView(session: session)
            }
            .fullScreenCover(item: $writingTaskSession) { session in
                WritingTaskQuizView(session: session)
            }
            .fullScreenCover(item: $readingMockSession) { session in
                ReadingMockQuizView(session: session)
            }
            .fullScreenCover(item: $writingMockSession) { session in
                WritingMockQuizView(session: session)
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
        Task { savedSets = (try? await ToeflAssetService(api: appState.api).list(limit: 10)) ?? [] }
        weeklyGoal = QuizPreferences.weeklyGoal
        readingSummary = ToeflReadingStats.summarize()
        if !words.isEmpty {
            rateTrend = QuizPreferences.recordMastery(averageMastery, on: Date())
        }
        masteryTrend = QuizPreferences.masteryTrend
    }

    // MARK: - 히어로

    /// 화면에서 유일하게 색을 가득 쓰는 자리. 나머지 카드는 흰 바탕이라
    /// 여기 하나만 브랜드 그라디언트를 써도 화면 인상이 정해진다.
    private var masteryHero: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("평균 학습률")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.85))

                Spacer(minLength: 8)

                if rateTrend != 0 {
                    Text("\(rateTrend > 0 ? "+" : "-")\(abs(rateTrend))%p")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.white)
                        .monospacedDigit()
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.white.opacity(0.2), in: .capsule)
                }
            }

            Text("\(averageMastery)%")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(.white)
                .monospacedDigit()

            if masteryTrend.count >= 2 {
                heroChart.frame(height: 60)
            }

            HStack(spacing: 24) {
                heroStat("지난 판", lastAccuracy.map { "\($0)%" } ?? "-")
                heroStat("이번 주", "\(studiedThisWeek)단어")
                Spacer(minLength: 0)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Gradient.hero, in: .rect(cornerRadius: 26))
        .shadow(color: DS.Solid.indigo.opacity(0.35), radius: 22, y: 12)
    }

    private var heroChart: some View {
        Chart(masteryTrend) { point in
            AreaMark(
                x: .value("날짜", point.date),
                y: .value("학습률", point.rate)
            )
            .foregroundStyle(
                .linearGradient(
                    colors: [.white.opacity(0.35), .white.opacity(0.02)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.monotone)

            LineMark(
                x: .value("날짜", point.date),
                y: .value("학습률", point.rate)
            )
            .foregroundStyle(.white)
            .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round))
            .interpolationMethod(.monotone)
        }
        .chartYScale(domain: chartRange)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .accessibilityLabel("최근 평균 학습률 추이")
    }

    /// 0~100 전체를 그리면 값이 바닥에 깔려 흐름이 안 보인다.
    private var chartRange: ClosedRange<Double> {
        let rates = masteryTrend.map { Double($0.rate) }
        guard let low = rates.min(), let high = rates.max() else { return 0...100 }
        let padding = max((high - low) * 0.3, 6)
        return max(0, low - padding)...min(100, high + padding)
    }

    private func heroStat(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
                .monospacedDigit()
        }
    }

    // MARK: - 주간 목표

    private var goalCard: some View {
        card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("주간 목표")
                        .font(.subheadline.weight(.semibold))

                    Spacer(minLength: 8)

                    Text("\(studiedThisWeek)")
                        .font(.system(.title3, design: .rounded, weight: .bold))
                        .foregroundStyle(DS.BrandText.base)
                        .monospacedDigit()
                    Text("/ \(weeklyGoal)단어")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()

                    Stepper(
                        "주간 목표",
                        value: $weeklyGoal,
                        in: QuizPreferences.weeklyGoalRange,
                        step: 5
                    )
                    .labelsHidden()
                    .onChange(of: weeklyGoal) { _, value in
                        QuizPreferences.weeklyGoal = value
                    }
                }

                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(DS.Wash.brand)
                        Capsule()
                            .fill(goalProgress >= 100 ? AnyShapeStyle(Color.green.gradient) : AnyShapeStyle(DS.Gradient.cta))
                            .frame(width: proxy.size.width * min(goalProgress, 100) / 100)
                    }
                }
                .frame(height: 10)
                .animation(.easeOut(duration: 0.6), value: goalProgress)

                Text(
                    goalProgress >= 100
                        ? "이번 주 목표를 달성했어요."
                        : "이번 주 목표의 \(Int(goalProgress.rounded()))%를 채웠습니다."
                )
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - TOEFL Reading 성적

    @ViewBuilder
    private var readingMasteryCard: some View {
        if readingSummary.hasData {
            card {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("TOEFL Reading")
                            .font(.subheadline.weight(.semibold))
                        Spacer(minLength: 8)
                        Text("\(readingSummary.accuracy)%")
                            .font(.system(.title3, design: .rounded, weight: .bold))
                            .foregroundStyle(DS.BrandText.base)
                            .monospacedDigit()
                        Text("\(readingSummary.correct)/\(readingSummary.total)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }

                    VStack(spacing: 8) {
                        weakestRow("약한 task", ToeflReadingStats.label(forTask: readingSummary.weakestTask?.id ?? ""))
                        weakestRow("약한 주제", readingSummary.weakestTopic?.id ?? "-")
                        weakestRow("약한 스킬", readingSummary.weakestSkill?.id ?? "-")
                    }
                }
            }
        }
    }

    private func weakestRow(_ label: String, _ value: String) -> some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.footnote)
                .foregroundStyle(.secondary)
            Spacer(minLength: 8)
            Text(value.isEmpty ? "-" : value)
                .font(.footnote.weight(.semibold))
                .multilineTextAlignment(.trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(DS.Surface.level50, in: .rect(cornerRadius: 10))
    }

    // MARK: - 모드

    private func modeSection(
        title: String,
        subtitle: String,
        symbol: String,
        tint: Color,
        modes: [QuizModeInfo]
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: symbol)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(tint.gradient, in: .rect(cornerRadius: 9, style: .continuous))
                    .shadow(color: tint.opacity(0.3), radius: 8, y: 4)

                VStack(alignment: .leading, spacing: 1) {
                    Text(title).font(.title3.bold())
                    Text(subtitle).font(.caption).foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)
            }
            .padding(.top, 8)

            ForEach(modes) { mode in
                modeRow(mode, tint: tint)
            }
        }
    }

    private func modeRow(_ mode: QuizModeInfo, tint: Color) -> some View {
        Button {
            open(mode)
        } label: {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: mode.symbolName)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 42, height: 42)
                    .background(tint.opacity(0.12), in: .rect(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(mode.title).font(.body.weight(.semibold))
                        if mode.recommended {
                            Text("추천")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(tint)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(tint.opacity(0.14), in: .capsule)
                        }
                    }
                    Text(mode.comingSoon ? "준비 중입니다" : mode.detail)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.forward")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(DS.Surface.level300)
                    .padding(.top, 5)
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level0, in: .rect(cornerRadius: 20))
            .shadow(color: tint.opacity(0.1), radius: 12, y: 5)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.primary)
        .disabled(mode.comingSoon)
        .opacity(mode.comingSoon ? 0.55 : 1)
    }

    // MARK: - 최근 활동

    private var recentActivity: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "clock.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(DS.Surface.level400.gradient, in: .rect(cornerRadius: 9, style: .continuous))

                Text("최근 활동").font(.title3.bold())
                Spacer(minLength: 0)
            }
            .padding(.top, 8)

            if savedSets.isEmpty, history.isEmpty {
                Text("아직 활동 기록이 없습니다.\n첫 퀴즈를 시작해 보세요.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(28)
                    .frame(maxWidth: .infinity)
                    .background(DS.Surface.level0, in: .rect(cornerRadius: 20))
            } else {
                ForEach(savedSets.prefix(5)) { asset in
                    savedSetRow(asset)
                }
                ForEach(history.prefix(5)) { entry in
                    historyRow(entry)
                }
            }
        }
    }

    /// 저장해 둔 TOEFL 세트. 누르면 AI를 다시 부르지 않고 그대로 연다.
    private func savedSetRow(_ asset: ToeflAsset) -> some View {
        activityRow(
            symbol: "doc.text.fill",
            tint: DS.Solid.accent500,
            title: asset.title,
            detail: asset.modeInfo?.title ?? asset.mode,
            trailing: asset.createdAt.formatted(date: .numeric, time: .omitted),
            enabled: canReopen(asset)
        ) {
            reopen(asset)
        }
    }

    private func historyRow(_ entry: QuizPreferences.HistoryEntry) -> some View {
        let matched = QuizModeRegistry.mode(titled: entry.mode)
        let canRelaunch = matched.map { !$0.comingSoon } ?? false
        let success = entry.percentage >= 80

        return activityRow(
            symbol: "chart.bar.fill",
            tint: success ? DS.Solid.success : DS.Solid.brand500,
            title: entry.mode,
            detail: entry.date.formatted(date: .numeric, time: .omitted),
            trailing: "\(entry.percentage)%",
            enabled: canRelaunch
        ) {
            if let matched, canRelaunch { open(matched) }
        }
    }

    private func activityRow(
        symbol: String,
        tint: Color,
        title: String,
        detail: String,
        trailing: String,
        enabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 38, height: 38)
                    .background(tint.opacity(0.12), in: .rect(cornerRadius: 11, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.subheadline.weight(.semibold)).lineLimit(1)
                    Text(detail).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }

                Spacer(minLength: 8)

                Text(trailing)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .monospacedDigit()

                if enabled {
                    Image(systemName: "chevron.forward")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(DS.Surface.level300)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level0, in: .rect(cornerRadius: 18))
            .shadow(color: tint.opacity(0.08), radius: 10, y: 4)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.primary)
        .disabled(!enabled)
    }

    // MARK: - 학습 제안

    private var smartTipCard: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 42, height: 42)
                .background(DS.Gradient.cta, in: .rect(cornerRadius: 12, style: .continuous))
                .shadow(color: DS.Solid.indigo.opacity(0.3), radius: 10, y: 5)

            VStack(alignment: .leading, spacing: 4) {
                Text("학습 제안").font(.subheadline.weight(.bold))
                smartTipText
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.Wash.brand.opacity(0.5), in: .rect(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(DS.Wash.brandStrong, lineWidth: 1)
        )
        .padding(.top, 8)
    }

    /// 굵기는 마크다운으로 준다. `Text + Text`는 iOS 26에서 권장되지 않는다.
    private var smartTipText: Text {
        guard let weakest = weakestFolder else {
            return Text(
                "폴더를 만들고 단어를 분류한 다음, 학습률이 낮은 폴더부터 집중 공략해 보세요. "
                    + "AI 모드를 켜면 단어 사이의 뉘앙스 차이까지 짚어 줍니다."
            )
        }
        return Text(
            .init(
                "**\(weakest.name)** 폴더의 학습률이 **\(weakest.rate)%**로 가장 낮아요 "
                    + "(\(weakest.count)개 단어). 이 폴더부터 집중 학습하면 전체 정답률이 가장 빨리 오릅니다."
            )
        )
    }

    /// 흰 카드 한 장. 그림자는 브랜드 색을 옅게 깔아 화면 전체 톤을 맞춘다.
    private func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Surface.level0, in: .rect(cornerRadius: 20))
            .shadow(color: DS.Solid.brand500.opacity(0.1), radius: 14, y: 6)
    }

    /// 지금 다시 열 수 있는 모드인지. Reading task 두 종만 저장본으로 되살린다.
    private func canReopen(_ asset: ToeflAsset) -> Bool {
        asset.mode == "toefl-daily-life" || asset.mode == "toefl-academic-passage"
    }

    private func reopen(_ asset: ToeflAsset) {
        guard canReopen(asset),
              let stored = try? asset.decodePayload(as: StoredReadingTaskSet.self) else { return }

        runningModeTitle = asset.modeInfo?.title ?? asset.title
        readingTaskSession = ReadingTaskSession(
            service: ReadingTaskService(api: appState.api),
            request: ReadingTaskService.Request(
                taskType: asset.mode == "toefl-academic-passage" ? .academicPassage : .dailyLife,
                difficulty: QuizPreferences.targetScore
            ),
            assets: ToeflAssetService(api: appState.api),
            restoring: stored.restored,
            assetID: asset.id
        )
    }

    // MARK: - 실행

    private func open(_ mode: QuizModeInfo) {
        guard !mode.comingSoon else { return }
        config = QuizConfigState(mode: mode, words: words, folders: folders)
    }

    private func start(_ launch: QuizLaunch) {
        SpeechSynthesizer.shared.isEnabled = launch.soundEnabled
        QuizSound.isEnabled = launch.soundEnabled
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
        case "toefl-daily-life", "toefl-academic-passage":
            readingTaskSession = ReadingTaskSession(
                service: ReadingTaskService(api: appState.api),
                request: ReadingTaskService.Request(
                    taskType: launch.mode.id == "toefl-academic-passage"
                        ? .academicPassage
                        : .dailyLife,
                    questionCount: launch.questionCount,
                    difficulty: launch.difficulty,
                    vocabularyWords: Array(launch.words.prefix(20))
                ),
                assets: ToeflAssetService(api: appState.api)
            )
        case "toefl-writing-email", "toefl-writing-discussion":
            writingTaskSession = WritingTaskSession(
                service: WritingTaskService(api: appState.api),
                request: WritingTaskService.Request(
                    taskType: launch.mode.id == "toefl-writing-email"
                        ? .email
                        : .academicDiscussion,
                    difficulty: launch.difficulty,
                    vocabularyWords: Array(launch.words.prefix(20))
                )
            )
        case "toefl-reading-mock":
            readingMockSession = ReadingMockSession(
                service: ReadingMockService(api: appState.api),
                request: ReadingMockService.Request(
                    questionCount: max(4, launch.questionCount),
                    difficulty: launch.difficulty,
                    vocabularyWords: Array(launch.words.prefix(20))
                )
            )
        case "toefl-writing-mock":
            writingMockSession = WritingMockSession(
                service: WritingMockService(api: appState.api),
                request: WritingMockService.Request(
                    difficulty: launch.difficulty,
                    vocabularyWords: Array(launch.words.prefix(20))
                )
            )
        default:
            break
        }
    }
}

extension QuizConfigState: Identifiable {
    nonisolated var id: ObjectIdentifier { ObjectIdentifier(self) }
}