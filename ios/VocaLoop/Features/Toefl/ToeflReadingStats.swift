import Foundation

/// 웹 `src/services/toeflReadingStats.js`의 이식.
///
/// Reading을 풀 때마다 task/topic/skill별 정답 수를 쌓아 두고, 학습 탭에서
/// "어디가 가장 약한가"를 보여준다. 웹은 localStorage, 앱은 UserDefaults를
/// 쓰므로 기기별로 따로 쌓인다 (주간 목표·최근 기록과 같은 방식이다).
enum ToeflReadingStats {
    private static let storageKey = "vocaloop_toefl_reading_stats_v1"

    private nonisolated(unsafe) static let defaults = UserDefaults.standard

    /// 한 갈래의 맞춘 수 / 푼 수.
    struct Bucket: Codable, Sendable, Equatable {
        var correct = 0
        var total = 0

        var accuracy: Int {
            guard total > 0 else { return 0 }
            return Int((Double(correct) / Double(total) * 100).rounded())
        }
    }

    struct Snapshot: Codable, Sendable, Equatable {
        var totals = Bucket()
        var byTask: [String: Bucket] = [:]
        var byTopic: [String: Bucket] = [:]
        var bySkill: [String: Bucket] = [:]
    }

    /// 한 문항의 결과. 스킬별 집계에 쓴다.
    struct Result: Sendable {
        let isCorrect: Bool
        let skillTag: String
    }

    /// 가장 약한 갈래.
    struct Weakest: Sendable, Equatable {
        let id: String
        let accuracy: Int
        let total: Int
    }

    struct Summary: Sendable, Equatable {
        var accuracy = 0
        var total = 0
        var correct = 0
        var weakestTask: Weakest?
        var weakestTopic: Weakest?
        var weakestSkill: Weakest?

        /// 다음에 풀면 좋은 task. 웹 `nextTaskId`.
        var nextTaskID: String { weakestTask?.id ?? "daily-life" }

        var hasData: Bool { total > 0 }
    }

    // MARK: - 읽고 쓰기

    static func read() -> Snapshot {
        guard let data = defaults.data(forKey: storageKey),
              let snapshot = try? JSONCoding.decoder.decode(Snapshot.self, from: data)
        else { return Snapshot() }
        return snapshot
    }

    static func clear() {
        defaults.removeObject(forKey: storageKey)
    }

    /// 한 판의 결과를 더한다. 웹 `recordToeflReadingAttempt`와 같은 규칙이다.
    @discardableResult
    static func record(taskType: String, topicTags: [String], results: [Result]) -> Snapshot {
        var snapshot = read()
        guard !taskType.isEmpty, !results.isEmpty else { return snapshot }

        let correct = results.count(where: \.isCorrect)
        let total = results.count

        snapshot.totals.add(correct: correct, total: total)
        snapshot.byTask.add(key: taskType, correct: correct, total: total)

        // 스킬은 문항 하나씩, 주제는 판 전체 성적을 태그마다 더한다 (웹과 같다).
        for result in results {
            let skill = result.skillTag.isEmpty ? "general-reading" : result.skillTag
            snapshot.bySkill.add(key: skill, correct: result.isCorrect ? 1 : 0, total: 1)
        }

        let topics = topicTags.isEmpty ? ["general"] : topicTags
        for topic in topics {
            snapshot.byTopic.add(key: topic, correct: correct, total: total)
        }

        if let data = try? JSONCoding.encoder.encode(snapshot) {
            defaults.set(data, forKey: storageKey)
        }
        return snapshot
    }

    // MARK: - 요약

    static func summarize(_ snapshot: Snapshot = read()) -> Summary {
        Summary(
            accuracy: snapshot.totals.accuracy,
            total: snapshot.totals.total,
            correct: snapshot.totals.correct,
            weakestTask: weakest(in: snapshot.byTask),
            weakestTopic: weakest(in: snapshot.byTopic),
            weakestSkill: weakest(in: snapshot.bySkill)
        )
    }

    /// 정답률이 가장 낮은 갈래. 같으면 많이 푼 쪽을 고른다 (웹과 같다).
    private static func weakest(in map: [String: Bucket]) -> Weakest? {
        map
            .filter { $0.value.total > 0 }
            .map { Weakest(id: $0.key, accuracy: $0.value.accuracy, total: $0.value.total) }
            .sorted {
                $0.accuracy != $1.accuracy
                    ? $0.accuracy < $1.accuracy
                    : $0.total > $1.total
            }
            .first
    }

    /// 학습 탭에 보여줄 task 이름. 웹 `TOEFL_READING_LABELS`.
    static func label(forTask id: String) -> String {
        switch id {
        case "complete-words", "toefl-complete": return "Complete the Words"
        case "daily-life": return "Read in Daily Life"
        case "academic-passage": return "Read an Academic Passage"
        default: return id
        }
    }
}

private extension ToeflReadingStats.Bucket {
    mutating func add(correct: Int, total: Int) {
        self.correct += correct
        self.total += total
    }
}

private extension [String: ToeflReadingStats.Bucket] {
    mutating func add(key: String, correct: Int, total: Int) {
        guard !key.isEmpty else { return }
        self[key, default: ToeflReadingStats.Bucket()].add(correct: correct, total: total)
    }
}
