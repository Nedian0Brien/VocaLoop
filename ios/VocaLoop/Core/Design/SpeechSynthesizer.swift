import AVFoundation

/// 단어 발음 재생.
///
/// Capacitor 버전에서는 WKWebView의 `speechSynthesis`가 무음이 되는 문제가 있어
/// 플러그인을 끼워야 했지만, 네이티브에서는 AVSpeechSynthesizer를 직접 쓴다.
@MainActor
final class SpeechSynthesizer {
    static let shared = SpeechSynthesizer()

    private let synthesizer = AVSpeechSynthesizer()

    private init() {
        // 무음 스위치가 켜져 있어도 발음은 들려야 한다.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
    }

    func speak(_ text: String, language: String = "en-US") {
        guard !text.isEmpty else { return }

        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        try? AVAudioSession.sharedInstance().setActive(true)

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language)
        // 단어 하나를 또렷하게 들려주려면 기본 속도보다 조금 느린 편이 낫다.
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        synthesizer.speak(utterance)
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
}
