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
  let getSelectionSpy;

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
    getSelectionSpy?.mockRestore?.();
    vi.clearAllMocks();
  });

  test('allows saving a selected reading word before answer check without revealing its meaning', async () => {
    const onSaveVocabularyWord = vi.fn().mockResolvedValue({
      word: 'migration',
      meaning_ko: '이주',
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
      />
    );

    const stimulus = await screen.findByText(/Researchers observed migration patterns/);
    getSelectionSpy = vi.spyOn(window, 'getSelection').mockReturnValue({
      anchorNode: stimulus.firstChild,
      toString: () => 'migration',
      removeAllRanges: vi.fn(),
    });

    fireEvent.mouseUp(stimulus);

    await screen.findByText('migration');
    expect(screen.getByRole('button', { name: '단어장에 저장' })).toBeTruthy();
    expect(screen.queryByText('이주')).toBeNull();

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
  });
});
