// @vitest-environment jsdom

import React, { useRef, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useQuizAnswerController } from './useQuizAnswerController';

const soundEffects = vi.hoisted(() => ({
  playSound: vi.fn(),
}));

vi.mock('../utils/soundEffects', () => soundEffects);

const makeWord = (id, word, learningRate = 40) => ({
  id,
  word,
  learningRate,
  stats: { wrong_count: 0, review_count: 0 },
});

function AnswerControllerHarness({
  initialQueue = [makeWord(1, 'alpha'), makeWord(2, 'beta')],
  onAcceptedAnswer,
  onUpdateLearningRate = vi.fn(),
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizState, setQuizState] = useState('quiz');
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [adaptiveSession, setAdaptiveSession] = useState(null);
  const [, setStudySetSummaries] = useState({});
  const wordQuizTracker = useRef({});

  const { handleAcceptedAnswer, handleAnswer } = useQuizAnswerController({
    adaptiveSession,
    aiMode: false,
    currentIndex,
    onAcceptedAnswer,
    onUpdateLearningRate,
    queue,
    selectedMode: { id: 'multiple' },
    setAdaptiveSession,
    setCurrentIndex,
    setQueue,
    setQuizState,
    setStats,
    setStudySetSummaries,
    soundEnabled: true,
    stats,
    wordQuizTracker,
  });

  return (
    <>
      <button type="button" onClick={() => handleAnswer(true)}>answer-correct</button>
      <button type="button" onClick={() => handleAnswer(false)}>answer-wrong</button>
      <button type="button" onClick={() => handleAcceptedAnswer(1, { mode: 'short-en-ko', answer: '알파' })}>
        accept-answer
      </button>
      <output data-testid="current-index">{currentIndex}</output>
      <output data-testid="queue">{JSON.stringify(queue.map((word) => word.word))}</output>
      <output data-testid="stats">{JSON.stringify(stats)}</output>
      <output data-testid="quiz-state">{quizState}</output>
    </>
  );
}

describe('useQuizAnswerController', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('advances regular quiz state after a correct answer', () => {
    const onUpdateLearningRate = vi.fn();
    render(<AnswerControllerHarness onUpdateLearningRate={onUpdateLearningRate} />);

    fireEvent.click(screen.getByRole('button', { name: 'answer-correct' }));

    expect(screen.getByTestId('current-index').textContent).toBe('1');
    expect(screen.getByTestId('stats').textContent).toBe(JSON.stringify({ correct: 1, wrong: 0, total: 1 }));
    expect(onUpdateLearningRate).toHaveBeenCalledWith(1, expect.any(Number), {
      review_count: 1,
      wrong_count: 0,
    });
  });

  test('moves a missed regular quiz word to the back of the queue', () => {
    render(<AnswerControllerHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'answer-wrong' }));

    expect(screen.getByTestId('current-index').textContent).toBe('0');
    expect(screen.getByTestId('queue').textContent).toBe(JSON.stringify(['beta', 'alpha']));
    expect(screen.getByTestId('stats').textContent).toBe(JSON.stringify({ correct: 0, wrong: 1, total: 1 }));
  });

  test('updates queued words when an accepted answer is saved', async () => {
    const onAcceptedAnswer = vi.fn().mockResolvedValue({
      ...makeWord(1, 'alpha'),
      meaning_ko: '알파',
    });
    render(<AnswerControllerHarness onAcceptedAnswer={onAcceptedAnswer} />);

    fireEvent.click(screen.getByRole('button', { name: 'accept-answer' }));

    await waitFor(() => {
      expect(onAcceptedAnswer).toHaveBeenCalledWith(1, { mode: 'short-en-ko', answer: '알파' });
    });
    expect(screen.getByTestId('queue').textContent).toBe(JSON.stringify(['alpha', 'beta']));
  });
});
