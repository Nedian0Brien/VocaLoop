// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  useToeflVocabularyCapture,
  VocabularyCaptureText,
} from './ToeflVocabularyCapture';

function CaptureHarness({ text, onSaveVocabularyWord = vi.fn() }) {
  const vocabCapture = useToeflVocabularyCapture({
    existingWords: [],
    onSaveVocabularyWord,
    onExplainVocabularyWord: vi.fn(),
  });

  return (
    <VocabularyCaptureText
      text={text}
      activeWordKey={vocabCapture.activeWord}
      underlinedWordKeys={vocabCapture.underlinedKeys}
      savingKeys={vocabCapture.savingKeys}
      savedKeys={vocabCapture.savedKeys}
      explainingKeys={vocabCapture.explainingKeys}
      existingWordKeys={vocabCapture.existingWordKeys}
      explanations={vocabCapture.explanations}
      errors={vocabCapture.errors}
      canExplain={false}
      onSelectWord={vocabCapture.selectWord}
      onSaveWord={vocabCapture.saveWord}
      onExplainWord={vocabCapture.explainWord}
      onToggleUnderline={vocabCapture.toggleUnderline}
      onClearSelection={vocabCapture.clearActiveWord}
      buildMetadata={() => ({ source: 'test' })}
    />
  );
}

describe('VocabularyCaptureText', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  test('opens the action bubble only on the clicked occurrence of a repeated word', () => {
    render(<CaptureHarness text="Students need to walk to class to study." />);

    const toButtons = screen.getAllByRole('button', { name: 'to 단어 액션 열기' });

    fireEvent.click(toButtons[0]);

    expect(screen.getAllByRole('menu', { name: 'to 단어 액션' })).toHaveLength(1);
    expect(toButtons[0].className).toContain('ring-brand-200');
    expect(toButtons[1].className).not.toContain('ring-brand-200');
    expect(toButtons[2].className).not.toContain('ring-brand-200');

    fireEvent.click(toButtons[2]);

    expect(screen.getAllByRole('menu', { name: 'to 단어 액션' })).toHaveLength(1);
    expect(toButtons[0].className).not.toContain('ring-brand-200');
    expect(toButtons[1].className).not.toContain('ring-brand-200');
    expect(toButtons[2].className).toContain('ring-brand-200');
  });

  test('sizes each action pill from its own label length', () => {
    render(<CaptureHarness text="Innovation requires access." />);

    fireEvent.click(screen.getByRole('button', { name: 'innovation 단어 액션 열기' }));

    const saveAction = screen.getByRole('button', { name: '단어장에 저장' });
    const underlineAction = screen.getByRole('button', { name: '밑줄' });
    const saveWidth = Number.parseFloat(saveAction.style.getPropertyValue('--action-expanded-width'));
    const underlineWidth = Number.parseFloat(underlineAction.style.getPropertyValue('--action-expanded-width'));

    expect(saveAction.className).toContain('hover:w-[var(--action-expanded-width)]');
    expect(saveAction.className).toContain('focus-visible:w-[var(--action-expanded-width)]');
    expect(saveAction.className).not.toContain('hover:w-36');
    expect(saveAction.querySelector('[data-action-label]').className).toContain('group-hover:max-w-[var(--action-label-width)]');
    expect(saveWidth).toBeGreaterThan(underlineWidth);
  });

  test('clears the selected word and plays an exit animation when the learner clicks outside', () => {
    vi.useFakeTimers();
    render(<CaptureHarness text="Innovation requires access." />);

    fireEvent.click(screen.getByRole('button', { name: 'innovation 단어 액션 열기' }));
    expect(screen.getByRole('menu', { name: 'innovation 단어 액션' })).toBeTruthy();

    fireEvent.pointerDown(document.body);

    expect(screen.getByRole('menu', { name: 'innovation 단어 액션' }).className).toContain('animate-word-bubble-out');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('animate-word-action-out');
    expect(screen.getByRole('button', { name: 'innovation 단어 액션 열기' }).className).not.toContain('ring-brand-200');

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(screen.queryByRole('menu', { name: 'innovation 단어 액션' })).toBeNull();
  });

  test('animates the bubble and staggers its action buttons when it opens', () => {
    render(<CaptureHarness text="Innovation requires access." />);

    fireEvent.click(screen.getByRole('button', { name: 'innovation 단어 액션 열기' }));

    const actionBubble = screen.getByRole('menu', { name: 'innovation 단어 액션' });
    const saveAction = screen.getByRole('button', { name: '단어장에 저장' });
    const underlineAction = screen.getByRole('button', { name: '밑줄' });

    expect(actionBubble.className).toContain('animate-word-bubble-in');
    expect(saveAction.className).toContain('animate-word-action-in');
    expect(saveAction.style.getPropertyValue('--action-enter-delay')).toBe('0ms');
    expect(underlineAction.style.getPropertyValue('--action-enter-delay')).toBe('35ms');
  });
});
