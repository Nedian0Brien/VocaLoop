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

  test('opens mock-test word actions by tapping a word and keeps meaning gated until checked', async () => {
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
        onExplainVocabularyWord={vi.fn()}
      />
    );

    const wordButton = await screen.findByRole('button', { name: 'stimulus 단어 액션 열기' });
    expect(wordButton.className).toContain('hover:bg-brand-100');

    fireEvent.click(wordButton);

    const actionBubble = screen.getByRole('menu', { name: 'stimulus 단어 액션' });
    expect(actionBubble.className).toContain('absolute');
    expect(actionBubble.className).toContain('radial-word-actions');
    expect(actionBubble.className).toContain('right-half-word-actions');
    expect(actionBubble.className).toContain('left-full');
    expect(actionBubble.className).toContain('top-1/2');
    expect(wordButton.parentElement.className).toContain('relative');
    expect(screen.queryByText('풀이 중에는 뜻을 숨기고 필요한 액션만 사용할 수 있습니다.')).toBeNull();
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('right-arc-action');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('h-11 w-11');
    expect(screen.getByRole('button', { name: '단어장에 저장' }).className).toContain('hover:w-28');
    expect(screen.getByRole('button', { name: '밑줄' }).className).toContain('right-arc-action');
    expect(screen.getByRole('button', { name: '밑줄' }).textContent).toContain('밑줄');
    expect(screen.queryByRole('button', { name: '뜻 설명' })).toBeNull();
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
