import { beforeEach, describe, expect, test } from 'vitest';
import { createEnglishWordUtterance } from './speechSynthesis';

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
});
