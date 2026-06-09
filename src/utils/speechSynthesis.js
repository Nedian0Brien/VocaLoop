const ENGLISH_VOICE_NAMES = [
  'Samantha',
  'Google US English',
  'Microsoft Jenny',
  'Microsoft Aria',
  'Daniel',
  'Alex',
];

const VOICES_READY_TIMEOUT_MS = 500;
let speechRequestId = 0;

const getSpeechSynthesis = () => window.speechSynthesis;

export const getPreferredEnglishVoice = (voices = []) => {
  const englishVoices = voices.filter((voice) => voice?.lang?.toLowerCase().startsWith('en'));
  return (
    ENGLISH_VOICE_NAMES
      .map((name) => englishVoices.find((voice) => voice.name === name || voice.name.includes(name)))
      .find(Boolean) ||
    englishVoices.find((voice) => voice.lang === 'en-US') ||
    englishVoices.find((voice) => voice.lang === 'en-GB') ||
    englishVoices[0] ||
    null
  );
};

export const createEnglishWordUtterance = (text, voices = window.speechSynthesis?.getVoices?.() || []) => {
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
  if (getPreferredEnglishVoice(voices)) {
    resolve(voices);
    return;
  }

  let timeoutId;
  const cleanup = () => {
    window.clearTimeout(timeoutId);
    speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged);
  };
  const finish = (nextVoices) => {
    cleanup();
    resolve(nextVoices);
  };
  const handleVoicesChanged = () => {
    const nextVoices = speechSynthesis.getVoices?.() || [];
    if (getPreferredEnglishVoice(nextVoices)) {
      finish(nextVoices);
    }
  };

  speechSynthesis.addEventListener?.('voiceschanged', handleVoicesChanged);
  timeoutId = window.setTimeout(() => finish(speechSynthesis.getVoices?.() || []), VOICES_READY_TIMEOUT_MS);
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

export const speakEnglishWord = async (text) => {
  const speechSynthesis = getSpeechSynthesis();
  if (!speechSynthesis || !text) return;

  const requestId = ++speechRequestId;
  speechSynthesis.cancel();
  const voices = await waitForEnglishVoices(speechSynthesis);
  if (requestId !== speechRequestId) return;

  speechSynthesis.speak(createEnglishWordUtterance(text, voices));
};
