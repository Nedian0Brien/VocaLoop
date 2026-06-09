import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createEnglishWordUtterance, speakEnglishWord } from './speechSynthesis';

const setWindowSpeechSynthesis = (speechSynthesis) => {
  globalThis.speechSynthesis = speechSynthesis;
  globalThis.window = globalThis.window || {};
  globalThis.window.speechSynthesis = speechSynthesis;
  globalThis.window.setTimeout = globalThis.setTimeout;
  globalThis.window.clearTimeout = globalThis.clearTimeout;
};

describe('createEnglishWordUtterance', () => {
  beforeEach(() => {
    vi.useRealTimers();
    delete globalThis.speechSynthesis;
    delete globalThis.window;
    delete globalThis.Audio;
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
  });

  test('selects an English voice over a Korean default voice', () => {
    const voices = [
      { name: 'Yuna', lang: 'ko-KR', default: true },
      { name: 'Google US English', lang: 'en-US', default: false },
    ];

    const utterance = createEnglishWordUtterance('serendipity', voices);

    expect(utterance.lang).toBe('en-US');
    expect(utterance.voice).toBe(voices[1]);
  });

  test('waits for Chromium voices before speaking an English word', async () => {
    const voices = [
      { name: 'Yuna', lang: 'ko-KR', default: true },
      { name: 'Google US English', lang: 'en-US', default: false },
    ];
    let currentVoices = [];
    let voicesChangedHandler;

    const speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => currentVoices),
      addEventListener: vi.fn((eventName, handler) => {
        if (eventName === 'voiceschanged') voicesChangedHandler = handler;
      }),
      removeEventListener: vi.fn(),
    };
    setWindowSpeechSynthesis(speechSynthesis);

    const speaking = speakEnglishWord('serendipity');
    await Promise.resolve();
    expect(speechSynthesis.speak).not.toHaveBeenCalled();

    currentVoices = voices;
    voicesChangedHandler();
    await speaking;

    expect(speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(speechSynthesis.speak.mock.calls[0][0].voice).toBe(voices[1]);
  });

  test('uses onvoiceschanged when addEventListener is unavailable', async () => {
    const voices = [
      { name: 'Google US English', lang: 'en-US', default: false },
    ];
    let currentVoices = [];

    const speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => currentVoices),
      removeEventListener: vi.fn(),
      onvoiceschanged: null,
    };
    setWindowSpeechSynthesis(speechSynthesis);

    const speaking = speakEnglishWord('solution');
    await Promise.resolve();
    expect(speechSynthesis.speak).not.toHaveBeenCalled();

    currentVoices = voices;
    speechSynthesis.onvoiceschanged();
    await speaking;

    expect(speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(speechSynthesis.speak.mock.calls[0][0].voice).toBe(voices[0]);
  });

  test('does not speak through a Korean voice when no English voice is available', async () => {
    vi.useFakeTimers();
    const voices = [
      { name: 'Yuna', lang: 'ko-KR', default: true },
    ];

    const speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => voices),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    setWindowSpeechSynthesis(speechSynthesis);

    const speaking = speakEnglishWord('solution');
    await vi.advanceTimersByTimeAsync(1500);
    await speaking;

    expect(speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('plays a server pronunciation audio file before browser speech synthesis', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const audioInstances = [];
    globalThis.Audio = vi.fn(function Audio(url) {
      const instance = { play, preload: '', src: url };
      audioInstances.push(instance);
      return instance;
    });
    const speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
    };
    setWindowSpeechSynthesis(speechSynthesis);

    await speakEnglishWord('solution', '/uploads/tts/words/solution.wav');

    expect(globalThis.Audio).toHaveBeenCalledWith('/uploads/tts/words/solution.wav');
    expect(audioInstances[0].preload).toBe('auto');
    expect(play).toHaveBeenCalledTimes(1);
    expect(speechSynthesis.speak).not.toHaveBeenCalled();
  });
});
