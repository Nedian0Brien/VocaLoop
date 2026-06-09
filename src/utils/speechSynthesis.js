const ENGLISH_VOICE_NAMES = [
  'Samantha',
  'Google US English',
  'Microsoft Jenny',
  'Microsoft Aria',
  'Daniel',
  'Alex',
];

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

export const preloadSpeechSynthesisVoices = () => {
  if (!window.speechSynthesis) return undefined;

  window.speechSynthesis.getVoices();
  const handleVoicesChanged = () => window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', handleVoicesChanged);

  return () => {
    window.speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged);
  };
};

export const speakEnglishWord = (text) => {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(createEnglishWordUtterance(text));
};
