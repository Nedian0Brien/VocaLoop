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
    expect(wordButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(wordButton);

    const actionBubble = screen.getByRole('menu', { name: 'migration 단어 액션' });
    expect(actionBubble.dataset.phase).toBe('enter');
    expect(wordButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('풀이 중에는 뜻을 숨기고 필요한 액션만 사용할 수 있습니다.')).toBeNull();
    expect(screen.getByRole('button', { name: '단어장에 저장' }).dataset.arcPosition).toBe('upper');
    expect(screen.getByRole('button', { name: '밑줄' }).dataset.arcPosition).toBe('lower');
    expect(screen.getByRole('button', { name: '밑줄' }).textContent).toContain('밑줄');
    expect(screen.queryByRole('button', { name: '뜻 설명' })).toBeNull();
    expect(screen.queryByText('이주')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '밑줄' }));
    expect(screen.getByRole('button', { name: 'migration 단어 액션 열기' }).dataset.underlined).toBe('true');

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

  test('saves generated reading sets and records attempts against the saved asset', async () => {
    const savedAsset = {
      id: 77,
      mode: 'toefl-academic-passage',
      taskType: 'academic-passage',
      title: 'Migration Study',
      payload: {},
      metadata: {},
    };
    const onAssetCreated = vi.fn().mockResolvedValue(savedAsset);
    const onAttemptRecorded = vi.fn().mockResolvedValue(null);

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
        onExplainVocabularyWord={vi.fn()}
        onAssetCreated={onAssetCreated}
        onAttemptRecorded={onAttemptRecorded}
      />
    );

    await screen.findByText('Migration Study');

    await waitFor(() => {
      expect(onAssetCreated).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'toefl-academic-passage',
        taskType: 'academic-passage',
        title: 'Migration Study',
        payload: expect.objectContaining({
          stimulus: 'Researchers observed migration patterns in coastal birds.',
        }),
      }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Migration patterns' }));
    fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '리포트 보기' }));

    await waitFor(() => {
      expect(onAttemptRecorded).toHaveBeenCalledWith(
        savedAsset,
        expect.objectContaining({
          correctCount: 1,
          totalCount: 1,
          score: { accuracy: 100 },
        })
      );
    });
  });

  test('lets learners move across passage questions and checks answers only after the full set is solved', async () => {
    toeflService.generateReadingTaskSet.mockResolvedValueOnce({
      taskType: 'academic-passage',
      title: 'Ocean Study',
      stimulusLabel: 'Academic passage',
      stimulus: 'Researchers studied ocean currents and coastal ecosystems.',
      topicTags: ['earth-science'],
      questions: [
        {
          id: 'q1',
          prompt: 'What did researchers study?',
          options: ['Ocean currents', 'Mountain rocks', 'Urban parks', 'Desert winds'],
          answerIndex: 0,
          skillTag: 'detail',
          explanationKo: '지문에서 ocean currents를 연구했다고 말합니다.',
        },
        {
          id: 'q2',
          prompt: 'Which ecosystem is mentioned?',
          options: ['Forest', 'Coastal', 'Tundra', 'Grassland'],
          answerIndex: 1,
          skillTag: 'vocabulary-context',
          explanationKo: 'coastal ecosystems가 언급됩니다.',
        },
        {
          id: 'q3',
          prompt: 'What field is the passage closest to?',
          options: ['Architecture', 'Earth science', 'Music theory', 'Law'],
          answerIndex: 1,
          skillTag: 'inference',
          explanationKo: '해류와 생태계 연구는 지구과학과 가깝습니다.',
        },
      ],
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
        onExplainVocabularyWord={vi.fn()}
      />
    );

    await screen.findByText('Ocean Study');
    const checkButton = screen.getByRole('button', { name: '정답 확인' });
    expect(checkButton.disabled).toBe(true);
    expect(screen.getByText('풀이 0/3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ocean currents' }));
    expect(screen.getByText('풀이 1/3')).toBeTruthy();
    expect(checkButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '다음 문항' }));
    fireEvent.click(screen.getByRole('button', { name: 'Coastal' }));
    expect(screen.getByText('풀이 2/3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '이전 문항' }));
    expect(screen.getByRole('button', { name: 'Ocean currents' }).dataset.selected).toBe('true');
    expect(screen.queryByText('정답입니다')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '문항 3로 이동' }));
    fireEvent.click(screen.getByRole('button', { name: 'Architecture' }));
    expect(screen.getByText('풀이 3/3')).toBeTruthy();
    expect(checkButton.disabled).toBe(false);

    fireEvent.click(checkButton);
    expect(screen.getByText('오답입니다')).toBeTruthy();
    expect(screen.getByText('해류와 생태계 연구는 지구과학과 가깝습니다.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '이전 문항' }));
    expect(screen.getByText('정답입니다')).toBeTruthy();
    expect(screen.getByText('coastal ecosystems가 언급됩니다.')).toBeTruthy();
  });

  test('forces Academic Passage generation to five questions', async () => {
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
        onExplainVocabularyWord={vi.fn()}
      />
    );

    await screen.findByText('Migration Study');

    expect(toeflService.generateReadingTaskSet).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: 'academic-passage',
        questionCount: 5,
      })
    );
  });

  test('loads a saved reading asset for review without generating a new set', async () => {
    toeflService.generateReadingTaskSet.mockClear();

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
        onExplainVocabularyWord={vi.fn()}
        reviewAsset={{
          id: 88,
          mode: 'toefl-academic-passage',
          taskType: 'academic-passage',
          title: 'Saved Passage',
          payload: {
            taskType: 'academic-passage',
            title: 'Saved Passage',
            stimulusLabel: 'Academic passage',
            stimulus: 'Saved stimulus for review.',
            questions: [
              {
                id: 1,
                prompt: 'What is this?',
                options: ['A saved quiz', 'A new quiz'],
                answerIndex: 0,
              },
            ],
          },
          metadata: {},
        }}
      />
    );

    await screen.findByText('Saved Passage');
    expect(screen.getByRole('button', { name: 'stimulus 단어 액션 열기' })).toBeTruthy();
    expect(toeflService.generateReadingTaskSet).not.toHaveBeenCalled();
  });
});
