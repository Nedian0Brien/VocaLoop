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

  test('shows a detailed learning report with metrics, missed answers, and AI feedback', async () => {
    toeflService.generateReadingTaskSet.mockResolvedValueOnce({
      taskType: 'academic-passage',
      title: 'Coral Reef Study',
      stimulusLabel: 'Academic passage',
      stimulus: 'Researchers compared coral reef recovery across protected and unprotected waters.',
      topicTags: ['marine-biology'],
      questions: [
        {
          id: 'q1',
          prompt: 'What did the researchers compare?',
          options: ['Reef recovery', 'Boat traffic', 'Tourism income', 'Coastal weather'],
          answerIndex: 0,
          skillTag: 'detail',
          explanationKo: '지문에서 protected와 unprotected waters의 reef recovery를 비교했다고 설명합니다.',
        },
        {
          id: 'q2',
          prompt: 'The passage implies that protected waters are useful because they...',
          options: ['limit damaging activity', 'increase tourism', 'change tides', 'remove all predators'],
          answerIndex: 0,
          skillTag: 'inference',
          explanationKo: 'protected waters는 산호초 회복에 방해되는 활동을 줄인다는 점이 핵심입니다.',
        },
        {
          id: 'q3',
          prompt: 'Why does the author mention unprotected waters?',
          options: ['To introduce a contrast', 'To define coral', 'To list species', 'To question the study method'],
          answerIndex: 0,
          skillTag: 'rhetorical-purpose',
          explanationKo: 'unprotected waters는 protected waters와 대비되어 보호 조치의 효과를 보여줍니다.',
        },
      ],
    });
    const savedAsset = { id: 123, title: 'Coral Reef Study' };
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
        onAssetCreated={vi.fn().mockResolvedValue(savedAsset)}
        onAttemptRecorded={onAttemptRecorded}
      />
    );

    await screen.findByText('Coral Reef Study');

    fireEvent.click(screen.getByRole('button', { name: 'Reef recovery' }));
    fireEvent.click(screen.getAllByRole('button', { name: '다음 문항' }).at(-1));
    fireEvent.click(screen.getByRole('button', { name: 'increase tourism' }));
    fireEvent.click(screen.getAllByRole('button', { name: '다음 문항' }).at(-1));
    fireEvent.click(screen.getByRole('button', { name: 'To define coral' }));
    fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '리포트 보기' }));

    expect(await screen.findByText('정량 지표')).toBeTruthy();
    expect(screen.getByText('33%')).toBeTruthy();
    expect(screen.getByText('Skill별 정답률')).toBeTruthy();
    expect(screen.getByText('오답 리뷰')).toBeTruthy();
    expect(screen.getByText('내 답: increase tourism')).toBeTruthy();
    expect(screen.getByText('정답: limit damaging activity')).toBeTruthy();
    expect(screen.getByText('내 답: To define coral')).toBeTruthy();
    expect(screen.getByText('정답: To introduce a contrast')).toBeTruthy();
    expect(screen.getAllByText('AI 피드백').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/protected waters는 산호초 회복에 방해되는 활동을 줄인다는 점이 핵심입니다/).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(onAttemptRecorded).toHaveBeenCalledWith(
        savedAsset,
        expect.objectContaining({
          results: expect.objectContaining({
            report: expect.objectContaining({
              metrics: expect.objectContaining({
                accuracy: 33,
                wrongCount: 2,
              }),
              wrongItems: expect.arrayContaining([
                expect.objectContaining({
                  prompt: 'The passage implies that protected waters are useful because they...',
                  selectedAnswer: 'increase tourism',
                  correctAnswer: 'limit damaging activity',
                }),
              ]),
            }),
          }),
        })
      );
    });
  });

  test('puts passage before progress, guides with next until the final question, and reveals progress correctness', async () => {
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
    const passage = screen.getByText('Researchers').closest('section');
    const progress = screen.getByLabelText('문항 진행');
    expect(passage.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.queryByRole('button', { name: '정답 확인' })).toBeNull();
    const firstNextButton = screen.getAllByRole('button', { name: '다음 문항' }).at(-1);
    expect(firstNextButton.disabled).toBe(true);
    expect(screen.getByText('풀이 0/3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ocean currents' }));
    expect(screen.getByText('풀이 1/3')).toBeTruthy();
    expect(firstNextButton.disabled).toBe(false);

    fireEvent.click(firstNextButton);
    fireEvent.click(screen.getByRole('button', { name: 'Coastal' }));
    expect(screen.getByText('풀이 2/3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '이전 문항' }));
    expect(screen.getByRole('button', { name: 'Ocean currents' }).dataset.selected).toBe('true');
    expect(screen.queryByText('정답입니다')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '문항 3로 이동' }));
    fireEvent.click(screen.getByRole('button', { name: 'Architecture' }));
    expect(screen.getByText('풀이 3/3')).toBeTruthy();
    const checkButton = screen.getByRole('button', { name: '정답 확인' });
    expect(checkButton.disabled).toBe(false);

    fireEvent.click(checkButton);
    expect(screen.getByText('오답입니다')).toBeTruthy();
    expect(screen.getByText('해류와 생태계 연구는 지구과학과 가깝습니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '문항 1로 이동' }).dataset.result).toBe('correct');
    expect(screen.getByRole('button', { name: '문항 2로 이동' }).dataset.result).toBe('correct');
    expect(screen.getByRole('button', { name: '문항 3로 이동' }).dataset.result).toBe('incorrect');

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
