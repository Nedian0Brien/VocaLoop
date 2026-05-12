import { describe, expect, test } from 'vitest';
import { estimateReadingBand, estimateWritingBand, routeReadingMockDifficulty } from './toeflService';

describe('TOEFL Reading mock section scoring helpers', () => {
  test('routes stage 2 difficulty from stage 1 accuracy', () => {
    expect(routeReadingMockDifficulty({ correct: 3, total: 4 })).toBe('upper');
    expect(routeReadingMockDifficulty({ correct: 2, total: 4 })).toBe('lower');
  });

  test('estimates 1-6 Reading band and caps lower adaptive route', () => {
    expect(estimateReadingBand({ correct: 9, total: 10, difficulty: 'upper' })).toBe(6);
    expect(estimateReadingBand({ correct: 8, total: 10, difficulty: 'upper' })).toBe(5);
    expect(estimateReadingBand({ correct: 9, total: 10, difficulty: 'lower' })).toBe(4);
    expect(estimateReadingBand({ correct: 1, total: 10, difficulty: 'lower' })).toBe(1);
  });
});

describe('TOEFL Writing mock section scoring helpers', () => {
  test('estimates 1-6 Writing band from sentence accuracy and constructed response scores', () => {
    expect(estimateWritingBand({
      sentenceCorrect: 10,
      sentenceTotal: 10,
      emailScore: 5,
      discussionScore: 5,
    })).toBe(6);

    expect(estimateWritingBand({
      sentenceCorrect: 6,
      sentenceTotal: 10,
      emailScore: 3,
      discussionScore: 4,
    })).toBe(4);

    expect(estimateWritingBand({
      sentenceCorrect: 0,
      sentenceTotal: 0,
      emailScore: 0,
      discussionScore: 0,
    })).toBe(1);
  });
});
