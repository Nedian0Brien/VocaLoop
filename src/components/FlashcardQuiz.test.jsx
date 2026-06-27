// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import FlashcardQuiz from './FlashcardQuiz';

vi.mock('../utils/speechSynthesis', () => ({
  speakEnglishWord: vi.fn(),
  preloadSpeechSynthesisVoices: vi.fn(() => undefined),
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

const flipCard = (word = 'serendipity') => {
  fireEvent.click(screen.getAllByText(word)[0]);
};

afterEach(() => {
  cleanup();
});

describe('FlashcardQuiz', () => {
  test('renders the existing word card inside the shared quiz shell until it is flipped', () => {
    renderFlashcard();

    const quizShell = screen.getByTestId('flashcard-quiz-shell');
    const quizHeader = screen.getByTestId('flashcard-quiz-header');
    const cardBody = screen.getByTestId('flashcard-card-body');
    const wordCard = screen.getByTestId('flashcard-word-card');

    expect(quizShell.className).toContain('bg-white');
    expect(quizShell.className).toContain('rounded-card');
    expect(quizHeader.className).toContain('from-surface-800');
    expect(cardBody.contains(wordCard)).toBe(true);
    expect(quizShell.contains(wordCard)).toBe(true);
    expect(screen.getByTestId('flashcard-word-card')).toBeTruthy();
    expect(screen.getByTestId('word-card-shell').dataset.variant).toBeUndefined();
    expect(screen.getAllByText('serendipity').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('noun')).toBeTruthy();
    expect(screen.getByText('/ser-en-DIP-i-tee/')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '다시 볼래요' })).toBeNull();
    expect(screen.queryByRole('button', { name: '알고 있어요' })).toBeNull();
    expect(screen.getByTestId('word-card-shell').parentElement.className).not.toContain('flipped');

    flipCard();

    expect(screen.getByTestId('word-card-shell').parentElement.className).toContain('flipped');
    expect(screen.getByText('뜻밖의 발견')).toBeTruthy();
    expect(screen.getByText('The occurrence of happy discoveries by chance.')).toBeTruthy();
    expect(screen.getByText('우연히 가치 있는 것을 발견했을 때 쓰는 긍정적인 표현입니다.')).toBeTruthy();
    expect(screen.getByText('"The discovery was pure serendipity."')).toBeTruthy();
  });

  test('uses the WordCard flip surface without a flashcard-specific flip card', () => {
    renderFlashcard();

    const flipShell = screen.getByTestId('word-card-shell');
    const flipSurface = flipShell.parentElement;

    expect(flipSurface.className).toContain('card-flip');
    expect(flipSurface.className).not.toContain('flipped');
    expect(flipShell.className).toContain('card-inner');
    expect(screen.queryByTestId('flashcard-shell')).toBeNull();
    expect(screen.queryByTestId('flashcard-front-face')).toBeNull();

    flipCard();

    expect(flipSurface.className).toContain('flipped');
    const actionRow = screen.getByTestId('flashcard-review-actions');
    expect(screen.getByTestId('flashcard-card-body').contains(actionRow)).toBe(true);
    expect(actionRow.contains(screen.getByRole('button', { name: '다시 볼래요' }))).toBe(true);
    expect(actionRow.contains(screen.getByRole('button', { name: '알고 있어요' }))).toBe(true);
  });

  test('keeps review actions side by side on compact screens', () => {
    renderFlashcard();
    flipCard();

    const reviewButton = screen.getByRole('button', { name: '다시 볼래요' });
    const actionRow = screen.getByTestId('flashcard-review-actions');

    expect(actionRow.contains(reviewButton)).toBe(true);
    expect(actionRow.className).toContain('grid-cols-2');
    expect(actionRow.className).not.toContain('grid-cols-1');
  });

  test('returns to the unflipped dashboard card when the next word appears', () => {
    const { rerender } = renderFlashcard();
    flipCard();
    expect(screen.getByTestId('word-card-shell').parentElement.className).toContain('flipped');

    rerender(
      <FlashcardQuiz
        word={{ ...baseWord, id: 2, word: 'ephemeral', meaning_ko: '덧없는' }}
        onAnswer={vi.fn()}
        progress={{ current: 2, total: 3 }}
        stats={{ correct: 1, wrong: 0 }}
        soundEnabled={false}
      />
    );

    expect(screen.getAllByText('ephemeral').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('word-card-shell').parentElement.className).not.toContain('flipped');
    expect(screen.queryByRole('button', { name: '다시 볼래요' })).toBeNull();
    expect(screen.queryByRole('button', { name: '알고 있어요' })).toBeNull();
  });
});
