import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createEnglishWordUtterance, speakEnglishWord } from './speechSynthesis';

describe('createEnglishWordUtterance', () => {
  beforeEach(() => {
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

    globalThis.window = globalThis;
    globalThis.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => currentVoices),
      addEventListener: vi.fn((eventName, handler) => {
        if (eventName === 'voiceschanged') voicesChangedHandler = handler;
      }),
      removeEventListener: vi.fn(),
    };

    const speaking = speakEnglishWord('serendipity');
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();

    currentVoices = voices;
    voicesChangedHandler();
    await speaking;

    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak.mock.calls[0][0].voice).toBe(voices[1]);
  });
});
