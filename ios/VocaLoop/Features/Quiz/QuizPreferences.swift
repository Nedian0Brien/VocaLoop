import Foundation

/// 학습 탭이 기기에 남기는 값들. 웹이 localStorage에 두는 것과 같은 항목이다.
///
/// 키 이름도 웹과 맞춰 뒀다. 저장소는 기기별로 따로지만, 같은 이름을 쓰면
/// 나중에 서버로 옮길 때 어느 값이 어느 값인지 헷갈리지 않는다.
enum QuizPreferences {
    /// `UserDefaults`는 Sendable로 표시돼 있지 않지만 내부적으로 스레드 안전하다.
    /// 여기서는 표준 저장소를 읽고 쓰기만 한다.
    private nonisolated(unsafe) static let defaults = UserDefaults.standard

    private enum Key {
        static let questionCount = "vocaloop_quiz_question_count"
        static let aiMode = "vocaloop_quiz_ai_mode"
        static let targetScore = "vocaloop_quiz_target_score"
        static let soundEnabled = "vocaloop_quiz_sound_enabled"
        static let mixedModes = "vocaloop_quiz_mixed_modes"
        static let studySetSize = "vocaloop_quiz_study_set_size"
        static let weeklyGoal = "vocaloop_weekly_goal"
        static let quizHistory = "vocaloop_quiz_history"
        static let masteryHistory = "vocaloop_mastery_history"
    }

    // MARK: - 퀴즈 설정

    static var questionCount: Int {
        get { defaults.object(forKey: Key.questionCount) as? Int ?? 10 }
        set { defaults.set(newValue, forKey: Key.questionCount) }
    }

    static var aiMode: Bool {
        get { defaults.bool(forKey: Key.aiMode) }
        set { defaults.set(newValue, forKey: Key.aiMode) }
    }

    static var soundEnabled: Bool {
        get { defaults.object(forKey: Key.soundEnabled) as? Bool ?? true }
        set { defaults.set(newValue, forKey: Key.soundEnabled) }
    }

    static var targetScore: ToeflDifficulty {
        get {
            guard let raw = defaults.string(forKey: Key.targetScore),
                  let level = ToeflDifficulty(rawValue: raw) else { return .intermediate }
            return level
        }
        set { defaults.set(newValue.rawValue, forKey: Key.targetScore) }
    }

    static var studySetSize: Int {
        get { defaults.object(forKey: Key.studySetSize) as? Int ?? AdaptiveQuizEngine.defaultSetSize }
        set { defaults.set(newValue, forKey: Key.studySetSize) }
    }

    static var mixedStages: [AdaptiveStage] {
        get {
            guard let raw = defaults.stringArray(forKey: Key.mixedModes) else {
                return AdaptiveStage.allCases
            }
            let stages = raw.compactMap(AdaptiveStage.init(rawValue:))
            return stages.isEmpty ? AdaptiveStage.allCases : AdaptiveQuizEngine.normalize(stages)
        }
        set { defaults.set(newValue.map(\.rawValue), forKey: Key.mixedModes) }
    }

    // MARK: - 주간 목표

    static let weeklyGoalRange = 5...500
    static let defaultWeeklyGoal = 50

    static var weeklyGoal: Int {
        get {
            let stored = defaults.object(forKey: Key.weeklyGoal) as? Int ?? defaultWeeklyGoal
            return min(weeklyGoalRange.upperBound, max(weeklyGoalRange.lowerBound, stored))
        }
        set {
            let clamped = min(weeklyGoalRange.upperBound, max(weeklyGoalRange.lowerBound, newValue))
            defaults.set(clamped, forKey: Key.weeklyGoal)
        }
    }

    // MARK: - 최근 활동

    /// 웹 `QuizResult`가 남기는 기록과 같은 모양이다.
    struct HistoryEntry: Codable, Identifiable, Hashable, Sendable {
        var date: Date
        var mode: String
        var correct: Int
        var total: Int
        var percentage: Int

        var id: String { "\(date.timeIntervalSince1970):\(mode)" }
    }

    /// 웹과 같이 최근 20개만 남긴다.
    private static let historyLimit = 20

    static var history: [HistoryEntry] {
        guard let data = defaults.data(forKey: Key.quizHistory),
              let decoded = try? JSONDecoder().decode([HistoryEntry].self, from: data) else {
            return []
        }
        return decoded
    }

    static func recordQuizResult(mode: String, correct: Int, total: Int, at date: Date) {
        let percentage = total > 0 ? Int((Double(correct) / Double(total) * 100).rounded()) : 0
        let entry = HistoryEntry(
            date: date,
            mode: mode,
            correct: correct,
            total: total,
            percentage: percentage
        )

        let next = Array(([entry] + history).prefix(historyLimit))
        if let data = try? JSONEncoder().encode(next) {
            defaults.set(data, forKey: Key.quizHistory)
        }
    }

    // MARK: - 평균 학습률 스냅샷

    private struct MasterySnapshot: Codable {
        var date: String
        var avgRate: Int
    }

    /// 웹과 같이 30일치만 남긴다.
    private static let snapshotLimit = 30

    /// 오늘자 평균 학습률을 기록하고, 직전 스냅샷과의 차이(%p)를 돌려준다.
    ///
    /// 하루에 여러 번 불러도 오늘 값은 마지막 것으로 덮어쓴다.
    @discardableResult
    static func recordMastery(_ avgRate: Int, on date: Date) -> Int {
        var snapshots = readSnapshots()
        let today = dayKey(date)

        if let index = snapshots.firstIndex(where: { $0.date == today }) {
            snapshots[index].avgRate = avgRate
        } else {
            snapshots.append(MasterySnapshot(date: today, avgRate: avgRate))
        }

        snapshots.sort { $0.date < $1.date }
        snapshots = Array(snapshots.suffix(snapshotLimit))

        if let data = try? JSONEncoder().encode(snapshots) {
            defaults.set(data, forKey: Key.masteryHistory)
        }

        guard snapshots.count >= 2 else { return 0 }
        return snapshots[snapshots.count - 1].avgRate - snapshots[snapshots.count - 2].avgRate
    }

    private static func readSnapshots() -> [MasterySnapshot] {
        guard let data = defaults.data(forKey: Key.masteryHistory),
              let decoded = try? JSONDecoder().decode([MasterySnapshot].self, from: data) else {
            return []
        }
        return decoded
    }

    /// `2026-08-08` 형태. 웹의 `toISOString().slice(0, 10)`과 같은 자리를 쓴다.
    private static func dayKey(_ date: Date) -> String {
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(
            format: "%04d-%02d-%02d",
            parts.year ?? 0, parts.month ?? 0, parts.day ?? 0
        )
    }
}
