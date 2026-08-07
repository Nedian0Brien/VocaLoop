import { isNativeApp } from '../native/platform';
import { speakWithNativeTts } from '../native/speech';
import { resolveAssetUrl } from '../services/apiClient';

const ENGLISH_VOICE_NAMES = [
  'Samantha',
  'Google US English',
  'Microsoft Jenny',
  'Microsoft Aria',
  'Daniel',
  'Alex',
];

const VOICES_READY_TIMEOUT_MS = 1500;
let speechRequestId = 0;

const getSpeechSynthesis = () => globalThis.window?.speechSynthesis || globalThis.speechSynthesis;

export const getPreferredEnglishVoice = (voices = []) => {
  const englishVoices = voices.filter((voice) => voice?.lang?.toLowerCase().startsWith('en'));
  return (
    ENGLISH_VOICE_NAMES
      .map((name) => englishVoices.find((voice) => voice.name === name || voice.name.includes(name)))
      .find(Boolean) ||
    englishVoices.find((voice) => voice.lang?.toLowerCase() === 'en-us') ||
    englishVoices.find((voice) => voice.lang?.toLowerCase() === 'en-gb') ||
    englishVoices[0] ||
    null
  );
};

export const createEnglishWordUtterance = (text, voices = getSpeechSynthesis()?.getVoices?.() || []) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.8;

  const preferredVoice = getPreferredEnglishVoice(voices);
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  return utterance;
};

const waitForEnglishVoices = (speechSynthesis) => new Promise((resolve) => {
  const voices = speechSynthesis.getVoices?.() || [];
  const preferredVoice = getPreferredEnglishVoice(voices);
  if (preferredVoice) {
    resolve({ preferredVoice, voices });
    return;
  }

  let timeoutId;
  const previousVoicesChangedHandler = speechSynthesis.onvoiceschanged;
  const cleanup = () => {
    globalThis.clearTimeout(timeoutId);
    speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged);
    speechSynthesis.onvoiceschanged = previousVoicesChangedHandler;
  };
  const finish = (nextVoices) => {
    const nextPreferredVoice = getPreferredEnglishVoice(nextVoices);
    cleanup();
    resolve({ preferredVoice: nextPreferredVoice, voices: nextVoices });
  };
  const handleVoicesChanged = () => {
    const nextVoices = speechSynthesis.getVoices?.() || [];
    if (getPreferredEnglishVoice(nextVoices)) {
      finish(nextVoices);
    }
  };

  speechSynthesis.addEventListener?.('voiceschanged', handleVoicesChanged);
  speechSynthesis.onvoiceschanged = handleVoicesChanged;
  timeoutId = globalThis.setTimeout(() => finish(speechSynthesis.getVoices?.() || []), VOICES_READY_TIMEOUT_MS);
});

export const preloadSpeechSynthesisVoices = () => {
  const speechSynthesis = getSpeechSynthesis();
  if (!speechSynthesis) return undefined;

  speechSynthesis.getVoices();
  const handleVoicesChanged = () => speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', handleVoicesChanged);

  return () => {
    speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged);
  };
};

const playPronunciationAudio = async (audioUrl) => {
  if (!audioUrl || typeof Audio !== 'function') return false;

  // 네이티브에서는 앱 origin이 API 서버가 아니라 상대 경로를 절대 URL로 바꿔야 한다.
  const audio = new Audio(resolveAssetUrl(audioUrl));
  audio.preload = 'auto';
  await audio.play();
  return true;
};

export const speakEnglishWord = async (text, audioUrl = null) => {
  if (await playPronunciationAudio(audioUrl)) return;

  // WKWebView의 speechSynthesis는 무음이 되는 경우가 있어 네이티브 TTS를 먼저 시도한다.
  // 웹에서는 동기 단축평가로 빠져 브라우저 경로의 실행 타이밍이 그대로 유지된다.
  if (isNativeApp() && (await speakWithNativeTts(text))) return;

  const speechSynthesis = getSpeechSynthesis();
  if (!speechSynthesis || !text) return;

  const requestId = ++speechRequestId;
  speechSynthesis.cancel();
  const { preferredVoice, voices } = await waitForEnglishVoices(speechSynthesis);
  if (requestId !== speechRequestId) return;
  if (!preferredVoice) return;

  speechSynthesis.speak(createEnglishWordUtterance(text, voices));
};
