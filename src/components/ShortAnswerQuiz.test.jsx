// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ShortAnswerQuiz from './ShortAnswerQuiz';

vi.mock('../utils/soundEffects', () => ({
  playSound: vi.fn(),
}));

const baseProps = {
  word: {
    word: 'shed',
    meaning_ko: '떨구다, 흘리다, 헛간',
    pronunciation: '/ʃed/',
    pos: 'verb, noun',
  },
  onAnswer: vi.fn(),
  progress: { current: 1, total: 1 },
  stats: { correct: 0, wrong: 0 },
  aiMode: false,
  aiConfig: null,
  soundEnabled: false,
};

describe('ShortAnswerQuiz', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('shows unmatched comma-separated answers as a warning while accepting a correct item', () => {
    render(<ShortAnswerQuiz {...baseProps} />);

    fireEvent.change(screen.getByLabelText('한국어 뜻 입력'), {
      target: { value: '떨구다, 틀린뜻' },
    });
    fireEvent.click(screen.getByRole('button', { name: /정답 확인/i }));

    expect(screen.getByText('Great Job! 🎉')).toBeTruthy();
    expect(screen.getByText('정답으로 인정되지 않은 입력')).toBeTruthy();
    expect(screen.getByText('틀린뜻')).toBeTruthy();
  });
});
