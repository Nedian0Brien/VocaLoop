// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import QuizConfigModal from './QuizConfigModal';
import { TOEFL_READING_MODES, VOCABULARY_MODES } from './quizModeRegistry';

afterEach(() => {
  cleanup();
});

describe('QuizConfigModal', () => {
  test('keeps the mixed quiz setup usable in compact mobile viewports', () => {
    const words = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      word: `word-${index + 1}`,
      meaning_ko: `뜻 ${index + 1}`,
      folderId: 'toefl',
      learningRate: 0,
    }));

    render(
      <QuizConfigModal
        isOpen
        mode={VOCABULARY_MODES[0]}
        folders={[{ id: 'toefl', name: 'TOEFL', color: 'teal', icon: 'book' }]}
        words={words}
        onClose={vi.fn()}
        onStart={vi.fn()}
        initialAiMode
      />
    );

    const modal = screen.getByRole('dialog').querySelector('[data-testid="quiz-config-panel"]');
    const body = screen.getByTestId('quiz-config-body');
    const footer = screen.getByTestId('quiz-config-footer');
    const scopeActions = screen.getByTestId('quiz-config-scope-actions');

    expect(modal.className).toContain('max-h-[calc(100dvh-1rem)]');
    expect(modal.className).toContain('min-h-0');
    expect(body.className).toContain('min-h-0');
    expect(body.className).toContain('px-5');
    expect(footer.className).toContain('py-4');
    expect(scopeActions.className).toContain('self-start');
  });

  test('lets mixed quiz choose each short-answer direction', () => {
    const onStart = vi.fn();
    const words = Array.from({ length: 3 }, (_, index) => ({
      id: index + 1,
      word: `word-${index + 1}`,
      meaning_ko: `뜻 ${index + 1}`,
      learningRate: 0,
    }));

    render(
      <QuizConfigModal
        isOpen
        mode={VOCABULARY_MODES[0]}
        folders={[]}
        words={words}
        onClose={vi.fn()}
        onStart={onStart}
        initialAiMode={false}
      />
    );

    expect(screen.getByRole('button', { name: /주관식 영→한/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /주관식 한→영/ }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /주관식 한→영/ }));
    fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      adaptiveModes: ['flashcard', 'multiple', 'short-en-ko', 'complete-word'],
    }));
  });

  test('uses a desktop-friendly scope grid with a flagged-words option', () => {
    render(
      <QuizConfigModal
        isOpen
        mode={VOCABULARY_MODES[0]}
        folders={[{ id: 1, name: 'Very Long TOEFL Vocabulary Folder Name', color: 'teal', icon: 'book' }]}
        words={[
          { id: 1, word: 'abate', meaning_ko: '줄다', folderId: 1, folderIds: [1], isFlagged: true, learningRate: 0 },
          { id: 2, word: 'candid', meaning_ko: '솔직한', folderId: 1, folderIds: [1], isFlagged: false, learningRate: 0 },
        ]}
        onClose={vi.fn()}
        onStart={vi.fn()}
        initialAiMode={false}
      />
    );

    expect(screen.queryByText(/가로로 스크롤/)).toBeNull();
    expect(screen.getByRole('button', { name: /플래그한 단어만/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Very Long TOEFL Vocabulary Folder Name/ })).toBeTruthy();
  });

  test('starts TOEFL quizzes with a three-step difficulty level instead of a target score', () => {
    const onStart = vi.fn();

    render(
      <QuizConfigModal
        isOpen
        mode={TOEFL_READING_MODES[1]}
        folders={[]}
        words={[]}
        onClose={vi.fn()}
        onStart={onStart}
        initialAiMode={false}
      />
    );

    expect(screen.queryByText('목표 점수')).toBeNull();
    expect(screen.queryByLabelText('목표 점수')).toBeNull();
    expect(screen.getByRole('button', { name: /Beginner/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Intermediate/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Advanced/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Beginner/ }));
    fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      targetScore: 'beginner',
    }));
  });
});
