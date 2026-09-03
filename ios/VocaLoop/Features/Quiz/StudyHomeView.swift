import Charts
import SwiftUI

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
            List {
                summarySection
                weeklyGoalSection
                readingMasterySection
                modeSection(
                    title: "단어 학습",
                    footer: "암기 수준에 맞춘 기초 단계 학습",
                    tint: .blue,
                    modes: QuizModeRegistry.vocabulary
                )
                modeSection(
                    title: "TOEFL Reading",
                    footer: "2026 개정 Reading task와 실전 모의고사",
                    tint: .indigo,
                    modes: QuizModeRegistry.toeflReading
                )
                modeSection(
                    title: "TOEFL Writing",
                    footer: "2026 개정 Writing 3유형과 실전형 12문항 구성",
                    tint: .purple,
                    modes: QuizModeRegistry.toeflWriting
                )
                recentActivitySection
                smartTipSection
            }
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

    // MARK: - 현황

    private var summarySection: some View {
        Section {
            masteryCard
            statRow(
                "지난 판 정답률",
                value: lastAccuracy.map { "\($0)%" } ?? "-",
                trend: accuracyTrend
            )
            statRow("이번 주 학습", value: "\(studiedThisWeek)단어", trend: 0)
        } header: {
            Text("현황")
        } footer: {
            Text("단어 \(words.count)개 · 폴더 \(folders.count)개")
        }
    }

    /// 화면에서 제일 큰 숫자. 목록 행 하나로는 위계가 안 서서 카드로 세운다.
    /// 링과 추이 차트 모두 시스템 컴포넌트(Gauge, Swift Charts)다.
    private var masteryCard: some View {
        VStack(spacing: 16) {
            HStack(spacing: 20) {
                Gauge(value: Double(averageMastery), in: 0...100) {
                    EmptyView()
                } currentValueLabel: {
                    Text("\(averageMastery)")
                        .font(.system(.footnote, design: .rounded, weight: .bold))
                        .monospacedDigit()
                }
                .gaugeStyle(.accessoryCircularCapacity)
                .tint(masteryTint)

                VStack(alignment: .leading, spacing: 4) {
                    Text("평균 학습률")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("\(averageMastery)%")
                            .font(.system(.title, design: .rounded, weight: .bold))
                            .monospacedDigit()

                        if rateTrend != 0 {
                            trendChip(rateTrend)
                        }
                    }
                }

                Spacer(minLength: 0)
            }

            if masteryTrend.count >= 2 {
                masteryChart
            }
        }
        .padding(.vertical, 6)
    }

    /// 최근 30일 평균 학습률. 눈금은 지우고 흐름만 남긴다.
    private var masteryChart: some View {
        Chart(masteryTrend) { point in
            AreaMark(
                x: .value("날짜", point.date),
                y: .value("학습률", point.rate)
            )
            .foregroundStyle(
                .linearGradient(
                    colors: [masteryTint.opacity(0.35), masteryTint.opacity(0.02)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.monotone)

            LineMark(
                x: .value("날짜", point.date),
                y: .value("학습률", point.rate)
            )
            .foregroundStyle(masteryTint)
            .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
            .interpolationMethod(.monotone)
        }
        .chartYScale(domain: chartRange)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .frame(height: 72)
        .accessibilityLabel("최근 평균 학습률 추이")
    }

    /// 0~100 전체를 그리면 값이 바닥에 깔려 흐름이 안 보인다.
    /// 실제 값 폭에 여유를 조금 붙여 그 구간만 그린다.
    private var chartRange: ClosedRange<Double> {
        let rates = masteryTrend.map { Double($0.rate) }
        guard let low = rates.min(), let high = rates.max() else { return 0...100 }
        let padding = max((high - low) * 0.3, 6)
        return max(0, low - padding)...min(100, high + padding)
    }

    /// 학습률 구간 색은 목록 그룹 헤더와 같은 기준을 쓴다.
    private var masteryTint: Color {
        switch LearningStatus(rate: averageMastery) {
        case .difficult: return .red
        case .learning: return .blue
        case .memorized: return .green
        }
    }

    private func trendChip(_ trend: Int) -> some View {
        HStack(spacing: 2) {
            Image(systemName: trend > 0 ? "arrow.up" : "arrow.down")
            Text("\(abs(trend))%p").monospacedDigit()
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(trend > 0 ? Color.green : Color.red)
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(
            (trend > 0 ? Color.green : Color.red).opacity(0.12),
            in: .capsule
        )
    }

    /// 값 뒤에 증감을 붙인다. 단위를 %p로 적어야 값과 헷갈리지 않는다.
    /// 증감이 0이면(첫 기록이거나 변화가 없으면) 아무것도 붙이지 않는다.
    private func statRow(_ title: String, value: String, trend: Int) -> some View {
        HStack(spacing: 8) {
            Text(title)

            Spacer(minLength: 8)

            Text(value)
                .monospacedDigit()
                .foregroundStyle(.secondary)

            if trend != 0 {
                trendChip(trend)
            }
        }
    }

    // MARK: - 주간 목표

    private var weeklyGoalSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(studiedThisWeek)")
                        .font(.system(.title2, design: .rounded, weight: .bold))
                        .monospacedDigit()
                    Text("/ \(weeklyGoal)단어")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()

                    Spacer(minLength: 0)

                    if goalProgress >= 100 {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                    }
                }

                Gauge(
                    value: Double(min(studiedThisWeek, weeklyGoal)),
                    in: 0...Double(max(weeklyGoal, 1))
                ) {
                    EmptyView()
                }
                .gaugeStyle(.accessoryLinearCapacity)
                .tint(goalProgress >= 100 ? .green : .accentColor)
            }
            .padding(.vertical, 4)

            Stepper(
                "목표 \(weeklyGoal)단어",
                value: $weeklyGoal,
                in: QuizPreferences.weeklyGoalRange,
                step: 5
            )
            .onChange(of: weeklyGoal) { _, value in
                QuizPreferences.weeklyGoal = value
            }
        } header: {
            Text("주간 목표")
        } footer: {
            Text(
                goalProgress >= 100
                    ? "이번 주 목표를 달성했어요."
                    : "이번 주 목표의 \(Int(goalProgress.rounded()))%를 채웠습니다."
            )
        }
    }

    // MARK: - TOEFL Reading 성적

    @ViewBuilder
    private var readingMasterySection: some View {
        if readingSummary.hasData {
            Section("TOEFL Reading 성적") {
                LabeledContent(
                    "정답률",
                    value: "\(readingSummary.accuracy)%  \(readingSummary.correct)/\(readingSummary.total)"
                )
                LabeledContent(
                    "약한 task",
                    value: ToeflReadingStats.label(forTask: readingSummary.weakestTask?.id ?? "")
                )
                LabeledContent("약한 주제", value: readingSummary.weakestTopic?.id ?? "-")
                LabeledContent("약한 스킬", value: readingSummary.weakestSkill?.id ?? "-")
            }
        }
    }

    // MARK: - 모드

    private func modeSection(
        title: String,
        footer: String,
        tint: Color,
        modes: [QuizModeInfo]
    ) -> some View {
        Section {
            ForEach(modes) { mode in
                modeRow(mode, tint: tint)
            }
        } header: {
            Text(title)
        } footer: {
            Text(footer)
        }
    }

    /// 모드 한 줄. 웹의 큰 카드 대신 목록 행이라 "Configure Mode" 같은
    /// 안내 문구가 필요 없다. 줄 전체가 버튼이고 꺾쇠가 그 자리를 대신한다.
    /// 설정 앱의 아이콘 타일. 목록에 색을 되돌려 주는 가장 네이티브한 자리다.
    private func symbolTile(_ symbol: String, tint: Color) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 29, height: 29)
            .background(tint.gradient, in: .rect(cornerRadius: 7, style: .continuous))
    }

    private func modeRow(_ mode: QuizModeInfo, tint: Color) -> some View {
        Button {
            open(mode)
        } label: {
            HStack(alignment: .top, spacing: 12) {
                symbolTile(mode.symbolName, tint: tint)

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(mode.title)
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
                        .lineLimit(2)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.forward")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
                    // 꺾쇠는 제목 줄에 맞춘다.
                    .padding(.top, 3)
            }
        }
        .foregroundStyle(.primary)
        .disabled(mode.comingSoon)
    }

    // MARK: - 최근 활동

    @ViewBuilder
    private var recentActivitySection: some View {
        Section("최근 활동") {
            if savedSets.isEmpty, history.isEmpty {
                ContentUnavailableView(
                    "활동 기록이 없습니다",
                    systemImage: "clock",
                    description: Text("첫 퀴즈를 시작해 보세요.")
                )
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
        Button {
            reopen(asset)
        } label: {
            HStack(spacing: 12) {
                symbolTile("doc.text", tint: .indigo)

                VStack(alignment: .leading, spacing: 2) {
                    Text(asset.title).lineLimit(1)
                    Text(asset.modeInfo?.title ?? asset.mode)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                Text(asset.createdAt.formatted(date: .numeric, time: .omitted))
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if canReopen(asset) {
                    Image(systemName: "chevron.forward")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .foregroundStyle(.primary)
        .disabled(!canReopen(asset))
    }

    private func historyRow(_ entry: QuizPreferences.HistoryEntry) -> some View {
        let matched = QuizModeRegistry.mode(titled: entry.mode)
        let canRelaunch = matched.map { !$0.comingSoon } ?? false

        return Button {
            if let matched, canRelaunch { open(matched) }
        } label: {
            HStack(spacing: 12) {
                symbolTile("chart.bar.fill", tint: entry.percentage >= 80 ? .green : .blue)

                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.mode).lineLimit(1)
                    Text(entry.date.formatted(date: .numeric, time: .omitted))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 8)

                Text("\(entry.percentage)%")
                    .font(.subheadline)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)

                if canRelaunch {
                    Image(systemName: "chevron.forward")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .foregroundStyle(.primary)
        .disabled(!canRelaunch)
    }

    // MARK: - 학습 제안

    private var smartTipSection: some View {
        Section("학습 제안") {
            Label {
                smartTipText
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            } icon: {
                symbolTile("brain.head.profile", tint: .teal)
            }
            .labelStyle(.titleAndIcon)
        }
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
