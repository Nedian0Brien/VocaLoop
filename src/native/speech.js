import { TextToSpeech } from '@capacitor-community/text-to-speech';

import { isNativeApp } from './platform';

/**
 * WKWebView의 window.speechSynthesis는 voice 목록이 비거나 무음이 되는 사례가 잦다.
 * 네이티브에서는 AVSpeechSynthesizer를 직접 쓰고, 실패하면 웹 경로로 폴백한다.
 */
export const speakWithNativeTts = async (text) => {
    if (!isNativeApp() || !text) return false;

    try {
        await TextToSpeech.stop();
    } catch {
        // 재생 중인 발화가 없으면 stop이 실패할 수 있다. 무시해도 된다.
    }

    try {
        await TextToSpeech.speak({
            text,
            lang: 'en-US',
            rate: 0.9,
            pitch: 1.0,
            volume: 1.0,
            category: 'playback',
        });
        return true;
    } catch {
        return false;
    }
};

export const stopNativeTts = async () => {
    if (!isNativeApp()) return;

    try {
        await TextToSpeech.stop();
    } catch {
        // 무시
    }
};
