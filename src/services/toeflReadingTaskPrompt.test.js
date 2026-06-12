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

  test('uses an ETS-style Academic Passage question blueprint', async () => {
    const { generateReadingTaskSet } = await import('./toeflService');

    await generateReadingTaskSet({
      aiConfig: { provider: 'gemini', apiKey: 'test-key' },
      taskType: 'academic-passage',
      questionCount: 5,
      targetScore: 100,
    });

    const [prompt] = promptUtils.requestAiJson.mock.calls[0];
    expect(prompt).toContain('Academic Passage question blueprint');
    expect(prompt).toContain('1. vocabulary-context');
    expect(prompt).toContain('2. detail');
    expect(prompt).toContain('3. inference');
    expect(prompt).toContain('4. rhetorical-purpose');
    expect(prompt).toContain('5. idea-relationship');
    expect(prompt).toContain('Do not use Daily Life-only skill tags such as scanning or practical-interpretation');
    expect(prompt).toContain('Every incorrect option must be plausible but contradicted, unsupported, too broad, too narrow, or based on a minor detail');
  });

  test('describes the selected three-step difficulty instead of a TOEFL score target', async () => {
    const { generateReadingTaskSet } = await import('./toeflService');

    await generateReadingTaskSet({
      aiConfig: { provider: 'gemini', apiKey: 'test-key' },
      taskType: 'daily-life',
      questionCount: 3,
      targetScore: 'beginner',
    });

    const [prompt] = promptUtils.requestAiJson.mock.calls[0];
    expect(prompt).toContain('Difficulty level: beginner');
    expect(prompt).toContain('clear, short contexts');
    expect(prompt).not.toContain('TOEFL beginner+');
  });
});
