import { beforeEach, describe, expect, test, vi } from 'vitest';
import { makeValidGeneratedQuestion } from './toefl/completeWordTestFixtures';

const promptUtils = vi.hoisted(() => ({
  buildRandomNonce: vi.fn(() => 'fixed-nonce'),
  formatTopicsBlock: vi.fn(() => ''),
  formatVocabularyWordsBlock: vi.fn(() => ''),
  requestAiJson: vi.fn(),
}));

vi.mock('./toefl/promptUtils', () => promptUtils);

describe('generateCompleteTheWordSet prompt contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    promptUtils.buildRandomNonce.mockReturnValue('fixed-nonce');
    promptUtils.formatTopicsBlock.mockReturnValue('');
    promptUtils.formatVocabularyWordsBlock.mockReturnValue('');
    promptUtils.requestAiJson.mockResolvedValue({
      questions: [makeValidGeneratedQuestion()],
    });
  });

  test('asks for the Santa-style paragraph and blank composition', async () => {
    const { generateCompleteTheWordSet } = await import('./toeflService');

    await generateCompleteTheWordSet({
      aiConfig: { provider: 'gemini', apiKey: 'test-key' },
      questionCount: 1,
      blanksPerQuestion: 10,
      targetScore: 100,
    });

    const [prompt] = promptUtils.requestAiJson.mock.calls[0];
    expect(prompt).toContain('70-100 words');
    expect(prompt).toContain('at least 4 sentences');
    expect(prompt).toContain('Do not place placeholders in the first or last sentence');
    expect(prompt).toContain('2-10 letters long');
    expect(prompt).toContain('2-4 short function words');
    expect(prompt).toContain('as, at, by, if, in, of, on, or, so, to, up, yet, and, but, for, nor, the, with, from');
    expect(prompt).toContain('"revealCount"');
  });

  test('rejects an AI response that does not match the requested structure', async () => {
    const { generateCompleteTheWordSet } = await import('./toeflService');
    promptUtils.requestAiJson.mockResolvedValue({ questions: [] });

    await expect(generateCompleteTheWordSet({
      aiConfig: { provider: 'gemini', apiKey: 'test-key' },
      questionCount: 1,
      blanksPerQuestion: 10,
      targetScore: 100,
    })).rejects.toThrow(/문항 수/);
  });
});
