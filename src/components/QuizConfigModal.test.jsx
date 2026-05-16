// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import QuizConfigModal from './QuizConfigModal';
import { VOCABULARY_MODES } from './quizModeRegistry';

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
});
