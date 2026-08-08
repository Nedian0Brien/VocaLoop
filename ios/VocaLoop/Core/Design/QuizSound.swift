import AVFoundation

/// 웹 `src/utils/soundEffects.js`의 이식. 정답·오답·완료 세 가지 효과음.
///
/// 웹은 mixkit CDN의 mp3를 그때그때 받아 재생하지만, 앱에서 남의 CDN에 매번
/// 붙는 것은 곤란하다. 같은 세 가지 신호를 짧은 음으로 직접 만들어 낸다.
/// 울리는 **시점**은 웹과 같다.
enum QuizSound {
    case success
    case fail
    case complete

    /// 퀴즈 설정의 사운드 토글. 발음 자동 재생과 같은 스위치를 쓴다.
    ///
    /// 웹은 TOEFL 화면에만 이 스위치를 넘기지 않아 꺼도 효과음이 났는데,
    /// 토글 설명이 "정답 효과음이 나오지 않습니다"이므로 앱에서는 전부 따르게 한다.
    @MainActor
    static var isEnabled = true

    @MainActor
    static func play(_ sound: QuizSound) {
        guard isEnabled else { return }
        ToneEngine.shared.play(sound.notes)
    }

    /// (주파수, 길이) 목록. 올라가면 정답, 내려가면 오답, 아르페지오면 완료다.
    private var notes: [ToneEngine.Note] {
        switch self {
        case .success:
            return [.init(frequency: 1046.50, duration: 0.09), .init(frequency: 1318.51, duration: 0.13)]
        case .fail:
            return [.init(frequency: 392.00, duration: 0.12), .init(frequency: 261.63, duration: 0.18)]
        case .complete:
            return [
                .init(frequency: 523.25, duration: 0.08),
                .init(frequency: 659.25, duration: 0.08),
                .init(frequency: 783.99, duration: 0.08),
                .init(frequency: 1046.50, duration: 0.22),
            ]
        }
    }
}

/// 짧은 음을 만들어 재생한다. 음원 파일을 들고 다니지 않기 위한 것이다.
@MainActor
private final class ToneEngine {
    struct Note {
        let frequency: Double
        let duration: Double
    }

    static let shared = ToneEngine()

    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
    private var isPrepared = false

    private init() {}

    func play(_ notes: [Note]) {
        guard let buffer = buffer(for: notes), prepare() else { return }
        player.scheduleBuffer(buffer, completionHandler: nil)
        player.play()
    }

    private func prepare() -> Bool {
        if isPrepared { return true }

        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
        do {
            try engine.start()
        } catch {
            // 소리는 학습을 막지 않는다. 실패하면 조용히 넘어간다.
            return false
        }
        isPrepared = true
        return true
    }

    private func buffer(for notes: [Note]) -> AVAudioPCMBuffer? {
        let sampleRate = format.sampleRate
        let total = notes.reduce(0) { $0 + Int($1.duration * sampleRate) }
        guard total > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(total)),
              let samples = buffer.floatChannelData?[0]
        else { return nil }

        buffer.frameLength = AVAudioFrameCount(total)

        var cursor = 0
        for note in notes {
            let count = Int(note.duration * sampleRate)
            for index in 0..<count {
                let time = Double(index) / sampleRate
                // 시작과 끝을 부드럽게 깎아야 "탁" 하는 잡음이 안 난다.
                let progress = Double(index) / Double(max(count - 1, 1))
                let envelope = min(progress * 12, 1) * min((1 - progress) * 6, 1)
                // 웹의 `audio.volume = 0.5`와 같은 크기로 맞춘다.
                samples[cursor + index] = Float(sin(2 * .pi * note.frequency * time) * envelope * 0.5)
            }
            cursor += count
        }

        return buffer
    }
}
