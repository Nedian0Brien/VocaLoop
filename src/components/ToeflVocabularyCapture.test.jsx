// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
      buildMetadata={() => ({ source: 'test' })}
    />
  );
}

describe('VocabularyCaptureText', () => {
  afterEach(() => {
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

  test('expands the save action wide enough to show its full Korean label', () => {
    render(<CaptureHarness text="Innovation requires access." />);

    fireEvent.click(screen.getByRole('button', { name: 'innovation 단어 액션 열기' }));

    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('hover:w-36');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('focus-visible:w-36');
  });
});
