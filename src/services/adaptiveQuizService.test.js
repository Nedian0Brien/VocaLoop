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
    const initial = createAdaptiveSession(words.slice(0, 1), ['multiple', 'short-en-ko', 'short-ko-en', 'complete-word']);

    const afterMultiple = resolveAdaptiveAnswer(initial, true);
    expect(afterMultiple.completedStages).toBe(1);
    expect(afterMultiple.queue[0]).toMatchObject({ stageIndex: 1, wrongStreak: 0 });

    const afterEnglishToKorean = resolveAdaptiveAnswer(afterMultiple, true);
    expect(afterEnglishToKorean.completedStages).toBe(2);
    expect(afterEnglishToKorean.queue[0]).toMatchObject({ mode: 'short-ko-en', stageIndex: 2, wrongStreak: 0 });

    const afterKoreanToEnglish = resolveAdaptiveAnswer(afterEnglishToKorean, true);
    expect(afterKoreanToEnglish.completedStages).toBe(3);
    expect(afterKoreanToEnglish.queue[0]).toMatchObject({ mode: 'complete-word', stageIndex: 3, wrongStreak: 0 });

    const afterComplete = resolveAdaptiveAnswer(afterKoreanToEnglish, true);
    expect(afterComplete.completedStages).toBe(4);
    expect(afterComplete.queue).toEqual([]);
    expect(afterComplete.isComplete).toBe(true);
  });

  test('expands legacy short mode into both short-answer directions', () => {
    const session = createAdaptiveSession(words.slice(0, 1), ['multiple', 'short', 'complete-word']);

    expect(session.modes).toEqual(['multiple', 'short-en-ko', 'short-ko-en', 'complete-word']);
    expect(session.totalStages).toBe(4);
  });

  test('avoids immediately repeating the same word when random progression picks the first slot', () => {
    const session = {
      modes: ['multiple', 'short-en-ko'],
      queue: [
        { word: words[0], mode: 'multiple', stageIndex: 0, wrongStreak: 0 },
        { word: words[1], mode: 'multiple', stageIndex: 0, wrongStreak: 0 },
      ],
      totalStages: 4,
      completedStages: 0,
      currentSetIndex: 0,
      totalSets: 1,
      randomize: true,
      rng: () => 0,
    };

    const nextSession = resolveAdaptiveAnswer(session, true);

    expect(nextSession.queue[0].word.id).toBe('w2');
    expect(nextSession.queue[1]).toMatchObject({ word: words[0], mode: 'short-en-ko' });
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

  test('delays a missed task behind other active tasks before retrying it', () => {
    const setWords = Array.from({ length: 4 }, (_, index) => ({
      id: `w${index + 1}`,
      word: `word-${index + 1}`,
      meaning_ko: `뜻 ${index + 1}`,
    }));
    const session = createAdaptiveSession(setWords, ['multiple', 'short'], {
      setSize: 4,
      randomize: false,
    });

    const firstMiss = resolveAdaptiveAnswer(session, false);

    expect(firstMiss.queue[0].word.id).toBe('w2');
    expect(firstMiss.queue[firstMiss.queue.length - 1]).toMatchObject({
      word: setWords[0],
      stageIndex: 0,
      wrongStreak: 1,
    });
  });

  test('reports progress against word-stage completions', () => {
    const initial = createAdaptiveSession(words, ['multiple', 'short']);
    const afterOne = resolveAdaptiveAnswer(initial, true);

    expect(getAdaptiveProgress(afterOne)).toEqual({
      current: 2,
      total: 6,
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
    expect(session.totalStages).toBe(20);
    expect(session.queue).toHaveLength(5);
    expect(session.queue.every((task) => task.mode === 'multiple')).toBe(true);

    let activeSession = session;
    const answeredTasks = [];
    for (let i = 0; i < 20; i += 1) {
      answeredTasks.push(activeSession.queue[0]);
      activeSession = resolveAdaptiveAnswer(activeSession, true);
    }

    expect(activeSession.isSetComplete).toBe(true);
    expect(new Set(answeredTasks.map((task) => `${task.word.id}:${task.mode}`)).size).toBe(20);
  });

  test('shuffles words before splitting them into study sets', () => {
    const sixWords = Array.from({ length: 6 }, (_, index) => ({
      id: `w${index + 1}`,
      word: `word-${index + 1}`,
      meaning_ko: `뜻 ${index + 1}`,
    }));

    const session = createAdaptiveSession(
      sixWords,
      ['multiple', 'short'],
      { setSize: 3, randomize: true, rng: () => 0 }
    );

    expect(session.studySets.map((set) => set.map((word) => word.id))).toEqual([
      ['w2', 'w3', 'w4'],
      ['w5', 'w6', 'w1'],
    ]);
    expect(session.queue.map((task) => task.word.id)).toEqual(['w2', 'w3', 'w4']);
  });

  test('preserves each word mode order when randomizing a study set', () => {
    const setWords = Array.from({ length: 5 }, (_, index) => ({
      id: `w${index + 1}`,
      word: `word-${index + 1}`,
      meaning_ko: `뜻 ${index + 1}`,
    }));

    const session = createAdaptiveSession(
      setWords,
      ['multiple', 'short', 'complete-word'],
      { setSize: 5, randomize: true, rng: () => 0 }
    );

    const nextStageByWord = new Map();
    let activeSession = session;
    let guard = 0;

    while (!activeSession.isComplete && !activeSession.isSetComplete && guard < 30) {
      const task = activeSession.queue[0];
      const expectedStage = nextStageByWord.get(task.word.id) || 0;
      expect(task.stageIndex).toBe(expectedStage);
      expect(task.mode).toBe(activeSession.modes[expectedStage]);
      nextStageByWord.set(task.word.id, expectedStage + 1);
      activeSession = resolveAdaptiveAnswer(activeSession, true);
      guard += 1;
    }

    expect([...nextStageByWord.values()]).toEqual([4, 4, 4, 4, 4]);
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

    for (let i = 0; i < 20; i += 1) {
      session = resolveAdaptiveAnswer(session, true);
    }

    expect(session.isSetComplete).toBe(true);
    expect(session.isComplete).toBe(false);
    expect(session.queue).toEqual([]);

    const nextSet = startNextAdaptiveSet(session);
    expect(nextSet.currentSetIndex).toBe(1);
    expect(nextSet.currentSetWords).toHaveLength(1);
    expect(nextSet.totalStages).toBe(4);
    expect(nextSet.queue).toHaveLength(1);
    expect(nextSet.isSetComplete).toBe(false);
  });
});
