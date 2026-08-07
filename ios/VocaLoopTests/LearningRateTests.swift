import Foundation
import SwiftUI
import Testing

@testable import VocaLoop

/// 웹 `src/utils/learningRate.js`와 동작이 같아야 한다.
/// 두 클라이언트가 같은 단어를 다르게 분류하거나 다른 학습률을 만들면 안 된다.
@Suite("학습 상태 분류")
struct LearningStatusTests {
    @Test("웹과 같은 구간으로 나눈다", arguments: [
        (0, LearningStatus.difficult),
        (39, LearningStatus.difficult),
        (40, LearningStatus.learning),
        (79, LearningStatus.learning),
        (80, LearningStatus.memorized),
        (100, LearningStatus.memorized),
    ])
    func classifiesByRate(rate: Int, expected: LearningStatus) {
        #expect(LearningStatus(rate: rate) == expected)
    }

    @Test("라벨은 웹 문구를 그대로 쓴다")
    func usesWebLabels() {
        #expect(LearningStatus.difficult.label == "어려워요")
        #expect(LearningStatus.learning.label == "학습 중")
        #expect(LearningStatus.memorized.label == "외웠어요")
    }

    @Test("서버 status가 아니라 학습률에서 파생한다")
    func derivesFromRateNotServerStatus() {
        // 서버가 status를 new로 두고 있어도 학습률이 높으면 '외웠어요'다.
        let word = PreviewData.word(id: 1, "test", "시험", status: .new, learningRate: 85)
        #expect(word.learningStatus == .memorized)
    }
}

@Suite("학습률 변동")
struct LearningRateChangeTests {
    @Test("정답 시 퀴즈 유형별 가중치가 적용된다")
    func correctGainByMode() {
        // 웹: BASE_CORRECT_GAIN(12) × weight
        #expect(LearningRate.rateAfterCorrect(currentRate: 0, mode: .flashcard) == 6)
        #expect(LearningRate.rateAfterCorrect(currentRate: 0, mode: .multipleChoice) == 12)
        #expect(LearningRate.rateAfterCorrect(currentRate: 0, mode: .shortAnswer) == 17)
    }

    @Test("첫 오답은 5, 반복 오답은 횟수에 비례해 깎인다")
    func wrongPenaltyScales() {
        #expect(LearningRate.rateAfterWrong(currentRate: 50, wrongCount: 0) == 45)
        #expect(LearningRate.rateAfterWrong(currentRate: 50, wrongCount: 1) == 40)
        #expect(LearningRate.rateAfterWrong(currentRate: 50, wrongCount: 2) == 30)
        #expect(LearningRate.rateAfterWrong(currentRate: 50, wrongCount: 3) == 20)
    }

    @Test("오답 배수는 3에서 멈춘다")
    func wrongPenaltyCaps() {
        let atCap = LearningRate.rateAfterWrong(currentRate: 90, wrongCount: 3)
        let beyondCap = LearningRate.rateAfterWrong(currentRate: 90, wrongCount: 10)
        #expect(atCap == beyondCap)
    }

    @Test("0~100 범위를 벗어나지 않는다")
    func clampsToRange() {
        #expect(LearningRate.rateAfterCorrect(currentRate: 95, mode: .shortAnswer) == 100)
        #expect(LearningRate.rateAfterWrong(currentRate: 3, wrongCount: 5) == 0)
    }
}

@Suite("도넛 색")
struct LearningRateColorTests {
    /// SwiftUI `Color`는 생성 경로가 다르면 값이 같아도 `==`가 아니다.
    /// 실제로 중요한 건 RGB 값이므로 그걸 비교한다.
    private func rgb(_ color: Color) -> (r: Int, g: Int, b: Int) {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(color).getRed(&r, green: &g, blue: &b, alpha: &a)
        return (Int((r * 255).rounded()), Int((g * 255).rounded()), Int((b * 255).rounded()))
    }

    @Test("구간 경계 색이 웹 팔레트와 같다")
    func boundaryColors() {
        #expect(rgb(LearningRate.color(for: 0)) == (0xEF, 0x44, 0x44))   // red-500
        #expect(rgb(LearningRate.color(for: 40)) == (0x3B, 0x82, 0xF6))  // blue-500
        #expect(rgb(LearningRate.color(for: 80)) == (0x22, 0xC5, 0x5E))  // green-500
        #expect(rgb(LearningRate.color(for: 100)) == (0x22, 0xC5, 0x5E))
    }

    @Test("구간 안에서는 두 색 사이로 보간된다")
    func interpolatesWithinBand() {
        let mid = rgb(LearningRate.color(for: 20))
        // 빨강에서 파랑으로 가는 중간이라 빨강은 줄고 파랑은 늘어야 한다.
        #expect(mid.r < 0xEF && mid.r > 0x3B)
        #expect(mid.b > 0x44 && mid.b < 0xF6)
    }

    @Test("범위를 벗어난 값도 안전하게 처리한다")
    func handlesOutOfRange() {
        #expect(rgb(LearningRate.color(for: -20)) == (0xEF, 0x44, 0x44))
        #expect(rgb(LearningRate.color(for: 400)) == (0x22, 0xC5, 0x5E))
    }
}
