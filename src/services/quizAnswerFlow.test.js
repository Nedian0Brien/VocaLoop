import { describe, expect, test } from 'vitest';
import {
  buildLearningRateUpdate,
  getWordSummaryKey,
  replaceWordInAdaptiveSession,
} from './quizAnswerFlow';

describe('quizAnswerFlow', () => {
  test('builds stable word summary keys', () => {
    expect(getWordSummaryKey({ id: 3, word: 'apple' })).toBe('3');
    expect(getWordSummaryKey({ word: 'banana' })).toBe('banana');
  });

  test('updates learning stats for correct answers', () => {
    const update = buildLearningRateUpdate({
      activeQuizType: 'multiple',
      aiMode: false,
      currentWord: { id: 1, word: 'apple', learningRate: 10, stats: { review_count: 2 } },
      isCorrect: true,
      tracker: { wrongCount: 0, lastPenalty: 0, wasReasked: false },
    });

    expect(update.newRate).toBeGreaterThan(10);
    expect(update.updatedStats.review_count).toBe(3);
    expect(update.updatedWord.learningRate).toBe(update.newRate);
  });

  test('tracks penalty state for wrong answers', () => {
    const update = buildLearningRateUpdate({
      activeQuizType: 'multiple',
      aiMode: false,
      currentWord: { id: 1, word: 'apple', learningRate: 40, stats: { wrong_count: 1, review_count: 2 } },
      isCorrect: false,
      tracker: { wrongCount: 1, lastPenalty: 5, wasReasked: true },
    });

    expect(update.newRate).toBeLessThan(40);
    expect(update.tracker).toMatchObject({ wrongCount: 2, wasReasked: true });
    expect(update.updatedStats).toMatchObject({ wrong_count: 2, review_count: 3 });
  });

  test('replaces a word across adaptive session collections', () => {
    const session = {
      currentSetWords: [{ id: 1, word: 'apple', learningRate: 10 }],
      studySets: [[{ id: 1, word: 'apple', learningRate: 10 }]],
      queue: [{ word: { id: 1, word: 'apple', learningRate: 10 } }],
    };

    const updated = replaceWordInAdaptiveSession(session, { id: 1, learningRate: 80 });

    expect(updated.currentSetWords[0].learningRate).toBe(80);
    expect(updated.studySets[0][0].learningRate).toBe(80);
    expect(updated.queue[0].word.learningRate).toBe(80);
  });
});
