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
    definitions: ['To drop something naturally or to get rid of it.'],
    examples: [{ en: 'Trees shed their leaves.', ko: '나무는 잎을 떨어뜨린다.' }],
    synonyms: ['drop', 'cast off'],
    nuance: '문맥에 따라 떨어뜨리다와 헛간이라는 뜻이 모두 가능합니다.',
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

  test('reveals the full word details after checking an answer', () => {
    render(<ShortAnswerQuiz {...baseProps} />);

    fireEvent.change(screen.getByLabelText('한국어 뜻 입력'), {
      target: { value: '헛간' },
    });
    fireEvent.click(screen.getByRole('button', { name: /정답 확인/i }));

    expect(screen.getByText('Great Job! 🎉')).toBeTruthy();
    expect(screen.getByText('전체 뜻:')).toBeTruthy();
    expect(screen.getByText('떨구다, 흘리다, 헛간')).toBeTruthy();
    expect(screen.getByText('Definition')).toBeTruthy();
    expect(screen.getByText('To drop something naturally or to get rid of it.')).toBeTruthy();
    expect(screen.getByText('Examples')).toBeTruthy();
    expect(screen.getByText('"Trees shed their leaves."')).toBeTruthy();
    expect(screen.getByText('Synonyms')).toBeTruthy();
    expect(screen.getByText('drop')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Next Question/i })).toBeTruthy();
  });
});
