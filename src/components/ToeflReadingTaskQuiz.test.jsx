// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ToeflReadingTaskQuiz from './ToeflReadingTaskQuiz';

const toeflService = vi.hoisted(() => ({
  generateReadingTaskSet: vi.fn(),
}));

const statsService = vi.hoisted(() => ({
  recordToeflReadingAttempt: vi.fn(),
}));

const soundEffects = vi.hoisted(() => ({
  playSound: vi.fn(),
}));

vi.mock('../services/toeflService', () => toeflService);
vi.mock('../services/toeflReadingStats', () => statsService);
vi.mock('../utils/soundEffects', () => soundEffects);

describe('ToeflReadingTaskQuiz vocabulary capture', () => {
  beforeEach(() => {
    toeflService.generateReadingTaskSet.mockResolvedValue({
      taskType: 'academic-passage',
      title: 'Migration Study',
      stimulusLabel: 'Academic passage',
      stimulus: 'Researchers observed migration patterns in coastal birds.',
      topicTags: ['biology'],
      questions: [
        {
          id: 1,
          prompt: 'What did researchers observe?',
          options: ['Migration patterns', 'Weather changes', 'New nests', 'Food supplies'],
          answerIndex: 0,
          skillTag: 'detail',
          explanationKo: '지문에서 migration patterns를 관찰했다고 말합니다.',
          saveableWords: ['migration'],
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('opens word actions from hoverable word click and hides meaning before answer check', async () => {
    const onSaveVocabularyWord = vi.fn().mockResolvedValue({
      word: 'migration',
      meaning_ko: '이주',
    });
    const onExplainVocabularyWord = vi.fn().mockResolvedValue({
      word: 'migration',
      meaning_ko: '이주',
      definitions: ['movement from one place to another'],
      examples: [],
    });

    render(
      <ToeflReadingTaskQuiz
        aiConfig={{ provider: 'gemini', apiKey: 'test-key' }}
        taskType="academic-passage"
        questionCount={1}
        targetScore={100}
        vocabSource={{ mode: 'off', pool: [] }}
        topicSelection={{ enabled: false }}
        onExit={vi.fn()}
        existingWords={[]}
        onSaveVocabularyWord={onSaveVocabularyWord}
        onExplainVocabularyWord={onExplainVocabularyWord}
      />
    );

    const wordButton = await screen.findByRole('button', { name: 'migration 단어 액션 열기' });
    expect(wordButton.className).toContain('hover:bg-brand-100');

    fireEvent.click(wordButton);

    const actionBubble = screen.getByRole('menu', { name: 'migration 단어 액션' });
    expect(actionBubble.className).toContain('absolute');
    expect(actionBubble.className).toContain('radial-word-actions');
    expect(actionBubble.className).toContain('right-half-word-actions');
    expect(actionBubble.className).toContain('left-full');
    expect(actionBubble.className).toContain('top-1/2');
    expect(actionBubble.querySelector('[data-testid="right-arc-guide"]')).toBeNull();
    expect(wordButton.parentElement.className).toContain('relative');
    expect(screen.queryByText('풀이 중에는 뜻을 숨기고 필요한 액션만 사용할 수 있습니다.')).toBeNull();
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('right-arc-action');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('h-10 w-10');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('hover:w-36');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('origin-left');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).dataset.arcPosition).toBe('upper');
    expect(screen.getByRole('button', { name: '밑줄' }).className).toContain('right-arc-action');
    expect(screen.getByRole('button', { name: '밑줄' }).dataset.arcPosition).toBe('lower');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).style.left)
      .not.toBe(screen.getByRole('button', { name: '밑줄' }).style.left);
    expect(screen.getByRole('button', { name: '밑줄' }).textContent).toContain('밑줄');
    expect(screen.queryByRole('button', { name: '뜻 설명' })).toBeNull();
    expect(screen.queryByText('이주')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '밑줄' }));
    expect(screen.getByRole('button', { name: 'migration 단어 액션 열기' }).className).toContain('underline');

    fireEvent.click(screen.getByRole('button', { name: '단어장에 저장' }));

    await waitFor(() => {
      expect(onSaveVocabularyWord).toHaveBeenCalledWith(
        'migration',
        expect.objectContaining({
          source: 'toefl-reading-task',
          taskType: 'academic-passage',
        })
      );
    });
    await screen.findByText('저장됨');
    expect(screen.queryByText('이주')).toBeNull();
    expect(onExplainVocabularyWord).not.toHaveBeenCalled();
  });

  test('shows meaning explanation action only after the answer is checked', async () => {
    const onExplainVocabularyWord = vi.fn().mockResolvedValue({
      word: 'migration',
      meaning_ko: '이주',
      definitions: ['movement from one place to another'],
      examples: [{ en: 'Migration patterns can change.', ko: '이동 양상은 변할 수 있다.' }],
    });

    render(
      <ToeflReadingTaskQuiz
        aiConfig={{ provider: 'gemini', apiKey: 'test-key' }}
        taskType="academic-passage"
        questionCount={1}
        targetScore={100}
        vocabSource={{ mode: 'off', pool: [] }}
        topicSelection={{ enabled: false }}
        onExit={vi.fn()}
        existingWords={[]}
        onSaveVocabularyWord={vi.fn()}
        onExplainVocabularyWord={onExplainVocabularyWord}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'migration 단어 액션 열기' }));
    expect(screen.queryByRole('button', { name: '뜻 설명' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Migration patterns' }));
    fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));

    expect(screen.getByRole('button', { name: '뜻 설명' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '뜻 설명' }));

    await waitFor(() => {
      expect(onExplainVocabularyWord).toHaveBeenCalledWith(
        'migration',
        expect.objectContaining({
          source: 'toefl-reading-task',
          taskType: 'academic-passage',
        })
      );
    });
    await screen.findByText('이주');
    await screen.findByText('movement from one place to another');
  });
});
