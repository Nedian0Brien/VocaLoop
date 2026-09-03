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
                    modes: QuizModeRegistry.vocabulary
                )
                modeSection(
                    title: "TOEFL Reading",
                    footer: "2026 개정 Reading task와 실전 모의고사",
                    modes: QuizModeRegistry.toeflReading
                )
                modeSection(
                    title: "TOEFL Writing",
                    footer: "2026 개정 Writing 3유형과 실전형 12문항 구성",
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
    }

    // MARK: - 현황

    private var summarySection: some View {
        Section {
            statRow("평균 학습률", value: "\(averageMastery)%", trend: rateTrend)
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
                HStack(spacing: 2) {
                    Image(systemName: trend > 0 ? "arrow.up" : "arrow.down")
                    Text("\(abs(trend))%p").monospacedDigit()
                }
                .font(.caption)
                .foregroundStyle(trend > 0 ? Color.green : Color.red)
            }
        }
    }

    // MARK: - 주간 목표

    private var weeklyGoalSection: some View {
        Section {
            ProgressView(
                value: Double(min(studiedThisWeek, weeklyGoal)),
                total: Double(max(weeklyGoal, 1))
            ) {
                Text("이번 주 \(studiedThisWeek)단어")
            } currentValueLabel: {
                Text("목표 \(weeklyGoal)단어")
                    .foregroundStyle(.secondary)
            }

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
        modes: [QuizModeInfo]
    ) -> some View {
        Section {
            ForEach(modes) { mode in
                modeRow(mode)
            }
        } header: {
            Text(title)
        } footer: {
            Text(footer)
        }
    }

    /// 모드 한 줄. 웹의 큰 카드 대신 목록 행이라 "Configure Mode" 같은
    /// 안내 문구가 필요 없다. 줄 전체가 버튼이고 꺾쇠가 그 자리를 대신한다.
    private func modeRow(_ mode: QuizModeInfo) -> some View {
        Button {
            open(mode)
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: mode.symbolName)
                    .font(.title3)
                    .foregroundStyle(mode.accent == .accent ? Color.purple : Color.accentColor)
                    .frame(width: 28)

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(mode.title)
                        if mode.recommended {
                            Text("추천")
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(.quaternary, in: .capsule)
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
                Image(systemName: "doc.text")
                    .font(.body)
                    .foregroundStyle(Color.purple)
                    .frame(width: 28)

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
                Image(systemName: "chart.bar")
                    .font(.body)
                    .foregroundStyle(entry.percentage >= 80 ? Color.green : Color.accentColor)
                    .frame(width: 28)

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
                Image(systemName: "brain.head.profile")
                    .foregroundStyle(Color.accentColor)
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
