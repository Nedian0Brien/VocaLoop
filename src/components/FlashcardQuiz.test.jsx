// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import FlashcardQuiz from './FlashcardQuiz';

vi.mock('../utils/speechSynthesis', () => ({
  speakEnglishWord: vi.fn(),
}));

const baseWord = {
  id: 1,
  word: 'serendipity',
  pronunciation: '/ser-en-DIP-i-tee/',
  pos: 'noun',
  meaning_ko: '뜻밖의 발견',
  definitions: ['The occurrence of happy discoveries by chance.'],
  definitions_ko: ['우연히 기쁜 발견이 생기는 일.'],
  examples: [{ en: 'The discovery was pure serendipity.', ko: '그 발견은 순전히 뜻밖의 행운이었다.' }],
  nuance: '우연히 가치 있는 것을 발견했을 때 쓰는 긍정적인 표현입니다.',
};

const renderFlashcard = (props = {}) => render(
  <FlashcardQuiz
    word={baseWord}
    onAnswer={vi.fn()}
    progress={{ current: 1, total: 3 }}
    stats={{ correct: 0, wrong: 0 }}
    soundEnabled={false}
    {...props}
  />
);

afterEach(() => {
  cleanup();
});

describe('FlashcardQuiz', () => {
  test('shows only the English word until the card is flipped', () => {
    renderFlashcard();

    expect(screen.getByText('serendipity')).toBeTruthy();
    expect(screen.queryByText('뜻밖의 발견')).toBeNull();
    expect(screen.queryByText('The occurrence of happy discoveries by chance.')).toBeNull();
    expect(screen.queryByText('우연히 가치 있는 것을 발견했을 때 쓰는 긍정적인 표현입니다.')).toBeNull();
    expect(screen.queryByText('"The discovery was pure serendipity."')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /serendipity/ }));

    expect(screen.getByText('뜻밖의 발견')).toBeTruthy();
    expect(screen.getByText('The occurrence of happy discoveries by chance.')).toBeTruthy();
    expect(screen.getByText('우연히 가치 있는 것을 발견했을 때 쓰는 긍정적인 표현입니다.')).toBeTruthy();
    expect(screen.getByText('"The discovery was pure serendipity."')).toBeTruthy();
  });

  test('keeps review actions side by side on compact screens', () => {
    renderFlashcard();
    fireEvent.click(screen.getByRole('button', { name: /serendipity/ }));

    const reviewButton = screen.getByRole('button', { name: '다시 볼래요' });
    const actionRow = reviewButton.parentElement;

    expect(actionRow.className).toContain('grid-cols-2');
    expect(actionRow.className).not.toContain('grid-cols-1');
  });

  test('returns to the word-only side when the next word appears', () => {
    const { rerender } = renderFlashcard();
    fireEvent.click(screen.getByRole('button', { name: /serendipity/ }));
    expect(screen.getByText('뜻밖의 발견')).toBeTruthy();

    rerender(
      <FlashcardQuiz
        word={{ ...baseWord, id: 2, word: 'ephemeral', meaning_ko: '덧없는' }}
        onAnswer={vi.fn()}
        progress={{ current: 2, total: 3 }}
        stats={{ correct: 1, wrong: 0 }}
        soundEnabled={false}
      />
    );

    expect(screen.getByText('ephemeral')).toBeTruthy();
    expect(screen.queryByText('덧없는')).toBeNull();
  });
});
