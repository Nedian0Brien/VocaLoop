// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ToeflReadingMockTest from './ToeflReadingMockTest';

const toeflService = vi.hoisted(() => ({
  generateReadingMockModule: vi.fn(),
  routeReadingMockDifficulty: vi.fn(),
  estimateReadingBand: vi.fn(),
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

const makeItem = ({ id, taskType, answerIndex = 0, skillTag = 'scanning' }) => ({
  id,
  taskType,
  title: `${taskType} title`,
  stimulusLabel: 'Reading text',
  stimulus: `${taskType} stimulus`,
  prompt: `${taskType} question ${id}`,
  options: ['Correct answer', 'Wrong answer', 'Almost right', 'Not given'],
  answerIndex,
  skillTag,
  topicTags: [taskType],
  explanationKo: '정답 근거 설명입니다.',
});

describe('ToeflReadingMockTest', () => {
  let getSelectionSpy;

  beforeEach(() => {
    toeflService.generateReadingMockModule.mockImplementation(({ stage }) => Promise.resolve({
      stage,
      difficulty: stage === 1 ? 'router' : 'upper',
      label: stage === 1 ? 'Stage 1 Router' : 'Stage 2 Upper Module',
      items: stage === 1
        ? [
            makeItem({ id: 's1-1', taskType: 'complete-words', skillTag: 'spelling-form' }),
            makeItem({ id: 's1-2', taskType: 'daily-life', skillTag: 'inference' }),
          ]
        : [
            makeItem({ id: 's2-1', taskType: 'academic-passage', skillTag: 'main-idea' }),
          ],
    }));
    toeflService.routeReadingMockDifficulty.mockReturnValue('upper');
    toeflService.estimateReadingBand.mockReturnValue(6);
  });

  afterEach(() => {
    cleanup();
    getSelectionSpy?.mockRestore?.();
    vi.clearAllMocks();
  });

  test('routes from stage 1 into an adaptive stage 2 module and reports estimated band', async () => {
    render(
      <ToeflReadingMockTest
        aiConfig={{ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'test-key' }}
        questionCount={3}
        targetScore={100}
        vocabSource={{ mode: 'off', pool: [] }}
        topicSelection={{ enabled: false }}
        onExit={vi.fn()}
      />
    );

    await screen.findByText('TOEFL Reading Mock Test');
    expect(screen.getByText(/Stage 1 Router/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Correct answer' }));
    fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 문항' }));

    fireEvent.click(screen.getByRole('button', { name: 'Correct answer' }));
    fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stage 2로 이동' }));

    await waitFor(() => {
      expect(toeflService.generateReadingMockModule).toHaveBeenLastCalledWith(
        expect.objectContaining({ stage: 2, difficulty: 'upper' })
      );
    });
    await screen.findByText(/Stage 2 Upper Module/);

    fireEvent.click(screen.getByRole('button', { name: 'Correct answer' }));
    fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '리포트 보기' }));

    expect(screen.getByText('Estimated Reading Band')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(statsService.recordToeflReadingAttempt).toHaveBeenCalled();
  });

  test('allows saving selected mock-test vocabulary before answer check without exposing meaning', async () => {
    const onSaveVocabularyWord = vi.fn().mockResolvedValue({
      word: 'stimulus',
      meaning_ko: '자극',
    });

    render(
      <ToeflReadingMockTest
        aiConfig={{ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'test-key' }}
        questionCount={3}
        targetScore={100}
        vocabSource={{ mode: 'off', pool: [] }}
        topicSelection={{ enabled: false }}
        onExit={vi.fn()}
        existingWords={[]}
        onSaveVocabularyWord={onSaveVocabularyWord}
      />
    );

    const stimulus = await screen.findByText('complete-words stimulus');
    getSelectionSpy = vi.spyOn(window, 'getSelection').mockReturnValue({
      anchorNode: stimulus.firstChild,
      toString: () => 'stimulus',
      removeAllRanges: vi.fn(),
    });

    fireEvent.mouseUp(stimulus);

    await screen.findByText('stimulus');
    expect(screen.getByRole('button', { name: '단어장에 저장' })).toBeTruthy();
    expect(screen.queryByText('자극')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '단어장에 저장' }));

    await waitFor(() => {
      expect(onSaveVocabularyWord).toHaveBeenCalledWith(
        'stimulus',
        expect.objectContaining({
          source: 'toefl-reading-mock',
          taskType: 'complete-words',
        })
      );
    });
    await screen.findByText('저장됨');
    expect(screen.queryByText('자극')).toBeNull();
  });
});
