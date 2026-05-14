import { beforeEach, describe, expect, test, vi } from 'vitest';

const promptUtils = vi.hoisted(() => ({
  buildRandomNonce: vi.fn(() => 'fixed-nonce'),
  formatTopicsBlock: vi.fn(() => ''),
  formatVocabularyWordsBlock: vi.fn(() => ''),
  requestAiJson: vi.fn(() => Promise.resolve({ questions: [] })),
}));

vi.mock('./toefl/promptUtils', () => promptUtils);

describe('generateReadingTaskSet prompt contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    promptUtils.buildRandomNonce.mockReturnValue('fixed-nonce');
    promptUtils.formatTopicsBlock.mockReturnValue('');
    promptUtils.formatVocabularyWordsBlock.mockReturnValue('');
    promptUtils.requestAiJson.mockResolvedValue({ questions: [] });
  });

  test('asks Academic Passage to create one passage with exactly five questions', async () => {
    const { generateReadingTaskSet } = await import('./toeflService');

    await generateReadingTaskSet({
      aiConfig: { provider: 'gemini', apiKey: 'test-key' },
      taskType: 'academic-passage',
      questionCount: 2,
      targetScore: 100,
    });

    const [prompt] = promptUtils.requestAiJson.mock.calls[0];
    expect(prompt).toContain('Create one TOEFL-style academic passage');
    expect(prompt).toContain('and 5 multiple-choice questions');
    expect(prompt).toContain('The "questions" array must contain exactly 5 items');
    expect(prompt).not.toContain('and 2 multiple-choice questions');
  });
});
