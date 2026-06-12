import { describe, expect, test, vi } from 'vitest';
import {
  QUIZ_HISTORY_STORAGE_KEY,
  QUIZ_SESSION_STORAGE_KEY,
  loadPersistedQuizSession,
  persistQuizSession,
  recordToeflAssetActivity,
} from './quizSessionStorage';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    removeItem: vi.fn((key) => values.delete(key)),
    setItem: vi.fn((key, value) => values.set(key, value)),
  };
};

describe('quizSessionStorage', () => {
  test('restores only supported active word quiz sessions', () => {
    const storage = createStorage();
    storage.setItem(QUIZ_SESSION_STORAGE_KEY, JSON.stringify({
      quizState: 'quiz',
      modeId: 'multiple',
      queue: [{ id: 1, word: 'apple' }],
    }));

    expect(loadPersistedQuizSession({
      quizModeById: { multiple: { id: 'multiple' } },
      storage,
    })?.modeId).toBe('multiple');
  });

  test('removes persisted session for non-restorable modes', () => {
    const storage = createStorage();

    persistQuizSession({
      aiMode: false,
      modeId: 'toefl-reading-task',
      quizState: 'quiz',
      wordQuizTracker: {},
    }, { storage });

    expect(storage.removeItem).toHaveBeenCalledWith(QUIZ_SESSION_STORAGE_KEY);
  });

  test('records TOEFL asset activity without duplicates', () => {
    const storage = createStorage();
    const asset = {
      id: 10,
      createdAt: '2026-06-12T00:00:00.000Z',
      mode: 'toefl-reading-task',
      title: 'Reading Drill',
    };

    recordToeflAssetActivity(asset, {
      modeTitles: { 'toefl-reading-task': 'Reading Task' },
      storage,
    });
    recordToeflAssetActivity(asset, {
      modeTitles: { 'toefl-reading-task': 'Reading Task' },
      storage,
    });

    const history = JSON.parse(storage.getItem(QUIZ_HISTORY_STORAGE_KEY));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      assetId: 10,
      mode: 'Reading Task',
      title: 'Reading Drill',
    });
  });
});
