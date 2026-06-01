import { beforeEach, describe, expect, test, vi } from 'vitest';

const aiModelService = vi.hoisted(() => ({
  callAiModel: vi.fn(() => Promise.resolve('{"word":"preliminaries","meaning_ko":"예비 절차"}')),
  parseJsonOutput: vi.fn((text) => JSON.parse(text)),
}));

vi.mock('./aiModelService', () => aiModelService);

describe('generateWordData prompt contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('requires meaning_ko to be a short dictionary gloss instead of an explanatory sentence', async () => {
    const { generateWordData } = await import('./geminiService');

    await generateWordData('preliminaries', { provider: 'codex', model: 'gpt-5.3-codex-spark' });

    const prompt = aiModelService.callAiModel.mock.calls[0][0].prompt;
    expect(prompt).toContain('"meaning_ko": "Short Korean dictionary gloss');
    expect(prompt).toContain('1-3 Korean terms');
    expect(prompt).toContain('Do not write a full sentence, definition, or explanatory phrase');
    expect(prompt).toContain('preliminaries');
    expect(prompt).toContain('예비 절차');
    expect(prompt).not.toContain('"meaning_ko": "Core Korean meaning (string)"');
  });
});
