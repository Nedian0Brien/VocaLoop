// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../services/quizService', () => ({
  generateMultipleChoiceOptions: vi.fn(),
}));

vi.mock('../utils/soundEffects', () => ({
  playSound: vi.fn(),
}));

import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import { generateMultipleChoiceOptions } from '../services/quizService';

const baseWord = {
  id: 1,
  word: 'serendipity',
  meaning_ko: '뜻밖의 발견',
  pronunciation: 'seh-ren-DIP-i-tee',
  definitions: ['The occurrence of happy or beneficial discoveries by chance.'],
  examples: [{ en: 'The discovery was pure serendipity.', ko: '그 발견은 순전히 뜻밖의 행운이었다.' }],
  synonyms: ['chance', 'fortune'],
};

beforeEach(() => {
  generateMultipleChoiceOptions.mockResolvedValue([
    baseWord.meaning_ko,
    '엄격한 절차',
    '빠른 이동',
    '오래된 기록',
  ]);
  window.speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
  };
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MultipleChoiceQuiz', () => {
  test('places the next question action directly after the answer feedback', async () => {
    render(
      <MultipleChoiceQuiz
        word={baseWord}
        allWords={[baseWord]}
        onAnswer={vi.fn()}
        progress={{ current: 1, total: 3 }}
        stats={{ correct: 0, wrong: 0 }}
        aiMode={false}
        aiConfig={null}
        soundEnabled={false}
      />
    );

    const correctOption = await screen.findByRole('button', { name: /뜻밖의 발견/ });
    expect(generateMultipleChoiceOptions).toHaveBeenCalled();
    expect(screen.getByTestId('multiple-choice-card-body').className).toContain('p-5');
    fireEvent.click(correctOption);
    fireEvent.click(screen.getByRole('button', { name: /정답 확인/ }));

    const feedback = screen.getByText('잘 맞췄어요!');
    const nextButton = screen.getByRole('button', { name: /Next Question/ });
    const definitionLabel = screen.getByText('Definition');

    expect(feedback.compareDocumentPosition(nextButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nextButton.compareDocumentPosition(definitionLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
