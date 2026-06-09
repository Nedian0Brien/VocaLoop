// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import CompleteWordQuiz from './CompleteWordQuiz';

vi.mock('../utils/soundEffects', () => ({
  playSound: vi.fn(),
}));

const baseProps = {
  word: {
    word: 'mitigate',
    meaning_ko: '완화하다',
    pos: 'verb',
    examples: [
      { en: 'Careful planning can mitigate the risk.', ko: '신중한 계획은 위험을 완화할 수 있다.' },
    ],
  },
  onAnswer: vi.fn(),
  progress: { current: 1, total: 3 },
  stats: { correct: 0, wrong: 0 },
  aiMode: false,
  soundEnabled: false,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CompleteWordQuiz', () => {
  test('puts the answer input directly inside a blanked example sentence', () => {
    render(<CompleteWordQuiz {...baseProps} />);

    expect(screen.getByText(/Careful planning can/i)).toBeTruthy();
    expect(screen.getByText(/the risk\./i)).toBeTruthy();
    expect(screen.getByLabelText('문장 빈칸에 들어갈 영어 단어')).toBeTruthy();
    expect(screen.queryByLabelText('완성할 영어 단어')).toBeNull();
  });

  test('checks the inline blank answer before advancing', () => {
    const onAnswer = vi.fn();
    render(<CompleteWordQuiz {...baseProps} onAnswer={onAnswer} />);

    fireEvent.change(screen.getByLabelText('문장 빈칸에 들어갈 영어 단어'), {
      target: { value: 'mitigate' },
    });
    fireEvent.keyDown(screen.getByLabelText('문장 빈칸에 들어갈 영어 단어'), { key: 'Enter' });

    expect(screen.getByText('Correct!')).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});
