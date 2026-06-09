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
    expect(screen.getByLabelText('빈칸 1의 1번째 철자')).toBeTruthy();
    expect(screen.getByLabelText('빈칸 1의 8번째 철자')).toBeTruthy();
    expect(screen.queryByLabelText('문장 빈칸에 들어갈 영어 단어')).toBeNull();
    expect(screen.queryByText('Meaning')).toBeNull();
    expect(screen.queryByText('완화하다')).toBeNull();
  });

  test('reveals only the first two letters after requesting a hint', () => {
    render(<CompleteWordQuiz {...baseProps} />);

    expect(screen.getByLabelText('빈칸 1의 1번째 철자')).toBeTruthy();
    expect(screen.getByLabelText('빈칸 1의 2번째 철자')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /hint/i }));

    expect(screen.queryByLabelText('빈칸 1의 1번째 철자')).toBeNull();
    expect(screen.queryByLabelText('빈칸 1의 2번째 철자')).toBeNull();
    expect(screen.getByLabelText('빈칸 1의 3번째 철자')).toBeTruthy();
    expect(screen.getByText('m')).toBeTruthy();
    expect(screen.getByText('i')).toBeTruthy();
  });

  test('checks the inline blank answer before advancing', () => {
    const onAnswer = vi.fn();
    render(<CompleteWordQuiz {...baseProps} onAnswer={onAnswer} />);

    ['m', 'i', 't', 'i', 'g', 'a', 't', 'e'].forEach((letter, index) => {
      fireEvent.change(screen.getByLabelText(`빈칸 1의 ${index + 1}번째 철자`), {
        target: { value: letter },
      });
    });
    fireEvent.keyDown(screen.getByLabelText('빈칸 1의 8번째 철자'), { key: 'Enter' });

    expect(screen.getByText('Correct!')).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});
