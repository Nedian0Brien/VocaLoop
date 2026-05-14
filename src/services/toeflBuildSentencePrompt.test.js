import { beforeEach, describe, expect, test, vi } from 'vitest';

const promptUtils = vi.hoisted(() => ({
  buildRandomNonce: vi.fn(() => 'fixed-nonce'),
  formatTopicsBlock: vi.fn(() => ''),
  formatVocabularyWordsBlock: vi.fn(() => ''),
  requestAiJson: vi.fn(() => Promise.resolve({ questions: [] })),
}));

vi.mock('./toefl/promptUtils', () => promptUtils);

describe('generateBuildSentenceSet prompt contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    promptUtils.buildRandomNonce.mockReturnValue('fixed-nonce');
    promptUtils.formatTopicsBlock.mockReturnValue('');
    promptUtils.formatVocabularyWordsBlock.mockReturnValue('');
    promptUtils.requestAiJson.mockResolvedValue({ questions: [] });
  });

  test('asks for an ETS-style context, sentence frame, phrase tokens, and exact answer', async () => {
    const { generateBuildSentenceSet } = await import('./toeflService');

    await generateBuildSentenceSet({
      aiConfig: { provider: 'gemini', apiKey: 'test-key' },
      questionCount: 10,
      targetScore: 100,
    });

    const [prompt] = promptUtils.requestAiJson.mock.calls[0];
    expect(prompt).toContain('ETS-style Build a Sentence');
    expect(prompt).toContain('"context"');
    expect(prompt).toContain('"sentenceFrame"');
    expect(prompt).toContain('"answer"');
    expect(prompt).toContain('"target"');
    expect(prompt).toContain('words or phrases');
    expect(prompt).toContain('Use English context only');
    expect(prompt).toContain('Do not provide Korean translations');
    expect(prompt).toContain('Most items should be everyday campus, work, travel, or social situations');
    expect(prompt).toContain('Include questions and short responses');
    expect(prompt).not.toContain('complete academic sentence (10-20 words)');
  });

  test('grades Build a Sentence attempts by exact token order instead of semantic paraphrase', async () => {
    const { generateBuildSentenceFeedback } = await import('./toeflService');

    await generateBuildSentenceFeedback({
      aiConfig: { provider: 'gemini', apiKey: 'test-key' },
      target: 'Did you book your flight yet?',
      userAttempt: 'Have you already reserved your flight?',
    });

    const [prompt] = promptUtils.requestAiJson.mock.calls[0];
    expect(prompt).toContain('Do not accept semantic paraphrases');
    expect(prompt).toContain('same required tokens in the same order');
    expect(prompt).toContain('Ignore only capitalization, extra spaces, and spacing before punctuation');
    expect(prompt).not.toContain('semantically equivalent to the target');
  });
});
