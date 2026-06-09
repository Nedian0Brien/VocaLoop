// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ShortAnswerQuiz from './ShortAnswerQuiz';

const callAiModelMock = vi.fn();

vi.mock('../utils/soundEffects', () => ({
  playSound: vi.fn(),
}));

vi.mock('../services/aiModelService', async () => {
  const actual = await vi.importActual('../services/aiModelService');
  return {
    ...actual,
    callAiModel: (...args) => callAiModelMock(...args),
  };
});

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

  test('checks the answer instead of advancing when Enter is pressed in the answer input', () => {
    const onAnswer = vi.fn();
    render(<ShortAnswerQuiz {...baseProps} onAnswer={onAnswer} />);

    fireEvent.change(screen.getByLabelText('한국어 뜻 입력'), {
      target: { value: '헛간' },
    });
    fireEvent.keyDown(screen.getByLabelText('한국어 뜻 입력'), { key: 'Enter' });

    expect(screen.getByText('Great Job! 🎉')).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  test('does not let answer input Enter bubble to a parent keyboard handler', () => {
    const parentKeyDown = vi.fn();
    render(
      <div onKeyDown={parentKeyDown}>
        <ShortAnswerQuiz {...baseProps} />
      </div>
    );

    fireEvent.change(screen.getByLabelText('한국어 뜻 입력'), {
      target: { value: '헛간' },
    });
    fireEvent.keyDown(screen.getByLabelText('한국어 뜻 입력'), { key: 'Enter' });

    expect(screen.getByText('Great Job! 🎉')).toBeTruthy();
    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  test('supports Korean-to-English short answer direction', () => {
    const onAnswer = vi.fn();
    render(<ShortAnswerQuiz {...baseProps} direction="ko-en" onAnswer={onAnswer} />);

    expect(screen.getByText('떨구다, 흘리다, 헛간')).toBeTruthy();
    expect(screen.getByLabelText('영어 단어 입력')).toBeTruthy();
    expect(screen.queryByLabelText('발음 듣기')).toBeNull();

    fireEvent.change(screen.getByLabelText('영어 단어 입력'), {
      target: { value: 'shed' },
    });
    fireEvent.keyDown(screen.getByLabelText('영어 단어 입력'), { key: 'Enter' });

    expect(screen.getByText('Great Job! 🎉')).toBeTruthy();
    expect(screen.getByText(/정답:/)).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  test('hints the answer input language for each short-answer direction', () => {
    const { rerender } = render(<ShortAnswerQuiz {...baseProps} />);
    const koreanAnswerInput = screen.getByLabelText('한국어 뜻 입력');

    expect(koreanAnswerInput.getAttribute('lang')).toBe('ko');
    expect(koreanAnswerInput.getAttribute('inputmode')).toBe('text');

    rerender(<ShortAnswerQuiz {...baseProps} direction="ko-en" />);
    const englishAnswerInput = screen.getByLabelText('영어 단어 입력');

    expect(englishAnswerInput.getAttribute('lang')).toBe('en');
    expect(englishAnswerInput.getAttribute('inputmode')).toBe('text');
    expect(englishAnswerInput.getAttribute('autocapitalize')).toBe('none');
    expect(englishAnswerInput.getAttribute('spellcheck')).toBe('false');
  });

  test('lets an incorrect answer request AI review and saves an approved answer', async () => {
    callAiModelMock.mockResolvedValue(JSON.stringify({
      isCorrect: true,
      feedback: '의미상 같은 답입니다.',
    }));
    const onAcceptedAnswer = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ShortAnswerQuiz
        {...baseProps}
        word={{ ...baseProps.word, id: 7, meaning_ko: '어디에나 있는' }}
        aiConfig={{ provider: 'codex', model: 'gpt-5.3-codex-spark' }}
        onAcceptedAnswer={onAcceptedAnswer}
      />
    );

    fireEvent.change(screen.getByLabelText('한국어 뜻 입력'), {
      target: { value: '곳곳에 있는' },
    });
    fireEvent.click(screen.getByRole('button', { name: /정답 확인/i }));

    expect(screen.getByText('Incorrect 📚')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /AI 재검토/i }));
    expect(await screen.findByText('Great Job! 🎉')).toBeTruthy();
    expect(screen.getByText('AI 판단 이유')).toBeTruthy();
    expect(screen.getByText('의미상 같은 답입니다.')).toBeTruthy();
    expect(onAcceptedAnswer).toHaveBeenCalledWith(7, {
      mode: 'short-en-ko',
      answer: '곳곳에 있는',
      source: 'ai-review',
      feedback: '의미상 같은 답입니다.',
    });

    rerender(
      <ShortAnswerQuiz
        {...baseProps}
        word={{
          ...baseProps.word,
          id: 7,
          meaning_ko: '어디에나 있는',
          accepted_answers: [{ mode: 'short-en-ko', answer: '곳곳에 있는', source: 'ai-review' }],
        }}
        aiConfig={{ provider: 'codex', model: 'gpt-5.3-codex-spark' }}
        onAcceptedAnswer={onAcceptedAnswer}
      />
    );

    expect(screen.getByText('Great Job! 🎉')).toBeTruthy();
    expect(screen.getByLabelText('한국어 뜻 입력').disabled).toBe(true);
    expect(screen.getByLabelText('한국어 뜻 입력').value).toBe('곳곳에 있는');
  });
});
