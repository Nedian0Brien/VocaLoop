import { describe, expect, test } from 'vitest';

import { AI_PROVIDERS, DEFAULT_AI_SETTINGS, getActiveAiConfig, parseJsonOutput } from './aiModelService';

describe('AI provider contract', () => {
  test('exposes provider defaults from the shared contract', () => {
    expect(DEFAULT_AI_SETTINGS).toMatchObject({
      provider: 'gemini',
      model: 'gemini-3-flash-preview',
    });
    expect(AI_PROVIDERS.openai.models).toContain('gpt-4.1');
  });

  test('normalizes legacy stored models to the current provider default', () => {
    expect(getActiveAiConfig({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      geminiApiKey: 'key',
    })).toMatchObject({
      provider: 'gemini',
      model: 'gemini-3-flash-preview',
      apiKey: 'key',
    });
  });
});

describe('parseJsonOutput', () => {
  test('parses the first complete JSON object when provider appends prose', () => {
    const output = `{
      "questions": [
        { "id": 1, "prompt": "What changed?", "options": ["A", "B"], "answerIndex": 0 }
      ]
    }
    The JSON above follows the requested schema.`;

    expect(parseJsonOutput(output)).toEqual({
      questions: [
        { id: 1, prompt: 'What changed?', options: ['A', 'B'], answerIndex: 0 },
      ],
    });
  });

  test('parses fenced JSON with text before and after it', () => {
    const output = `Here is the practice set:
    \`\`\`json
    {
      "summary": "좋습니다.",
      "nextSteps": ["review", "retry"]
    }
    \`\`\`
    Let me know if you want another one.`;

    expect(parseJsonOutput(output)).toEqual({
      summary: '좋습니다.',
      nextSteps: ['review', 'retry'],
    });
  });

  test('does not stop at braces inside JSON strings', () => {
    const output = `{
      "questions": [
        {
          "paragraph": "The {{1}} of nutrients supports growth.",
          "blanks": [{ "id": 1, "answer": "flow" }]
        }
      ]
    }
    trailing provider note`;

    expect(parseJsonOutput(output)).toEqual({
      questions: [
        {
          paragraph: 'The {{1}} of nutrients supports growth.',
          blanks: [{ id: 1, answer: 'flow' }],
        },
      ],
    });
  });
});
