import { describe, expect, test } from 'vitest';
import {
  buildAdaptiveQueue,
  createAdaptiveSession,
  getAdaptiveProgress,
  startNextAdaptiveSet,
  resolveAdaptiveAnswer,
} from './adaptiveQuizService';

const words = [
  { id: 'w1', word: 'abate', meaning_ko: '누그러지다' },
  { id: 'w2', word: 'candid', meaning_ko: '솔직한' },
];

describe('adaptiveQuizService', () => {
  test('builds one first-stage task for each selected word', () => {
    const queue = buildAdaptiveQueue(words, ['multiple', 'short']);

    expect(queue).toEqual([
      { word: words[0], stageIndex: 0, wrongStreak: 0 },
      { word: words[1], stageIndex: 0, wrongStreak: 0 },
    ]);
  });

  test('advances a word through selected stages before marking it complete', () => {
    const initial = createAdaptiveSession(words.slice(0, 1), ['multiple', 'short', 'complete-word']);

    const afterMultiple = resolveAdaptiveAnswer(initial, true);
    expect(afterMultiple.completedStages).toBe(1);
    expect(afterMultiple.queue[0]).toMatchObject({ stageIndex: 1, wrongStreak: 0 });

    const afterShort = resolveAdaptiveAnswer(afterMultiple, true);
    expect(afterShort.completedStages).toBe(2);
    expect(afterShort.queue[0]).toMatchObject({ stageIndex: 2, wrongStreak: 0 });

    const afterComplete = resolveAdaptiveAnswer(afterShort, true);
    expect(afterComplete.completedStages).toBe(3);
    expect(afterComplete.queue).toEqual([]);
    expect(afterComplete.isComplete).toBe(true);
  });

  test('requeues a missed task and steps down after consecutive misses', () => {
    const initial = createAdaptiveSession(words.slice(0, 1), ['multiple', 'short', 'complete-word']);
    const atShort = resolveAdaptiveAnswer(initial, true);

    const firstMiss = resolveAdaptiveAnswer(atShort, false);
    expect(firstMiss.queue[0]).toMatchObject({ stageIndex: 1, wrongStreak: 1 });
    expect(firstMiss.completedStages).toBe(1);

    const secondMiss = resolveAdaptiveAnswer(firstMiss, false);
    expect(secondMiss.queue[0]).toMatchObject({ stageIndex: 0, wrongStreak: 0 });
    expect(secondMiss.completedStages).toBe(0);
  });

  test('reports progress against word-stage completions', () => {
    const initial = createAdaptiveSession(words, ['multiple', 'short']);
    const afterOne = resolveAdaptiveAnswer(initial, true);

    expect(getAdaptiveProgress(afterOne)).toEqual({
      current: 2,
      total: 4,
      completed: 1,
    });
  });

  test('groups words into adjustable study sets and cycles modes inside the active set', () => {
    const sixWords = Array.from({ length: 6 }, (_, index) => ({
      id: `w${index + 1}`,
      word: `word-${index + 1}`,
      meaning_ko: `뜻 ${index + 1}`,
    }));

    const session = createAdaptiveSession(
      sixWords,
      ['multiple', 'short', 'complete-word'],
      { setSize: 5, randomize: false }
    );

    expect(session.totalSets).toBe(2);
    expect(session.currentSetIndex).toBe(0);
    expect(session.currentSetWords).toHaveLength(5);
    expect(session.queue).toHaveLength(15);
    expect(session.queue.slice(0, 6).map((task) => task.mode)).toEqual([
      'multiple',
      'short',
      'complete-word',
      'multiple',
      'short',
      'complete-word',
    ]);
    expect(new Set(session.queue.map((task) => `${task.word.id}:${task.mode}`)).size).toBe(15);
  });

  test('pauses at each study set boundary and starts the next set on request', () => {
    const sixWords = Array.from({ length: 6 }, (_, index) => ({
      id: `w${index + 1}`,
      word: `word-${index + 1}`,
      meaning_ko: `뜻 ${index + 1}`,
    }));

    let session = createAdaptiveSession(
      sixWords,
      ['multiple', 'short', 'complete-word'],
      { setSize: 5, randomize: false }
    );

    for (let i = 0; i < 15; i += 1) {
      session = resolveAdaptiveAnswer(session, true);
    }

    expect(session.isSetComplete).toBe(true);
    expect(session.isComplete).toBe(false);
    expect(session.queue).toEqual([]);

    const nextSet = startNextAdaptiveSet(session);
    expect(nextSet.currentSetIndex).toBe(1);
    expect(nextSet.currentSetWords).toHaveLength(1);
    expect(nextSet.queue).toHaveLength(3);
    expect(nextSet.isSetComplete).toBe(false);
  });
});
