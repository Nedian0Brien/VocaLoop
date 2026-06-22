// @vitest-environment jsdom

import React, { useRef, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { QUIZ_SESSION_STORAGE_KEY } from '../services/quizSessionStorage';
import { useQuizPersistedSession } from './useQuizPersistedSession';

const quizModeById = {
  multiple: { id: 'multiple', title: '객관식 퀴즈' },
};

function PersistedSessionHarness({ aiMode = false, initialQuizState, setAiMode = vi.fn() }) {
  const restoredSession = useQuizPersistedSession.load({ quizModeById });
  const [quizState, setQuizState] = useState(initialQuizState || (restoredSession ? 'quiz' : 'select'));
  const [selectedMode] = useState(restoredSession ? quizModeById[restoredSession.modeId] : quizModeById.multiple);
  const wordQuizTracker = useRef(restoredSession?.wordQuizTracker ?? {});

  useQuizPersistedSession.syncAiMode({
    aiMode,
    restoredSession,
    setAiMode,
  });
  useQuizPersistedSession.persist({
    adaptiveSession: null,
    aiMode,
    currentIndex: restoredSession?.currentIndex ?? 0,
    queue: restoredSession?.queue ?? [{ id: 1, word: 'serendipity' }],
    quizState,
    selectedMode,
    soundEnabled: restoredSession?.soundEnabled ?? true,
    stats: restoredSession?.stats ?? { correct: 0, wrong: 0, total: 0 },
    studySetSummaries: restoredSession?.studySetSummaries ?? {},
    wordQuizTracker,
  });

  return (
    <button type="button" onClick={() => setQuizState('select')}>
      clear-session
    </button>
  );
}

describe('useQuizPersistedSession', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('reapplies restored AI mode to parent state', () => {
    localStorage.setItem(QUIZ_SESSION_STORAGE_KEY, JSON.stringify({
      version: 1,
      quizState: 'quiz',
      modeId: 'multiple',
      queue: [{ id: 1, word: 'serendipity' }],
      currentIndex: 0,
      stats: { correct: 0, wrong: 0, total: 0 },
      soundEnabled: true,
      aiMode: true,
    }));

    const setAiMode = vi.fn();
    render(<PersistedSessionHarness aiMode={false} setAiMode={setAiMode} />);

    expect(setAiMode).toHaveBeenCalledWith(true);
  });

  test('persists active restorable quiz state and clears it outside quiz mode', () => {
    const { getByRole } = render(<PersistedSessionHarness aiMode={true} initialQuizState="quiz" />);

    expect(JSON.parse(localStorage.getItem(QUIZ_SESSION_STORAGE_KEY))).toMatchObject({
      modeId: 'multiple',
      quizState: 'quiz',
      aiMode: true,
    });

    fireEvent.click(getByRole('button', { name: 'clear-session' }));

    expect(localStorage.getItem(QUIZ_SESSION_STORAGE_KEY)).toBeNull();
  });
});
