import { beforeEach, describe, expect, test, vi } from 'vitest';

const aiModelService = vi.hoisted(() => ({
  callAiModel: vi.fn(),
  hasAiProviderAccess: vi.fn(() => true),
  parseJsonOutput: vi.fn((text) => JSON.parse(text)),
}));

vi.mock('./aiModelService', () => aiModelService);

import { gradeShortAnswer, gradeWithAI } from './quizService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('gradeShortAnswer', () => {
  test('accepts any comma-separated Korean meaning as correct', () => {
    expect(gradeShortAnswer('늘리다', '늘리다, 증가시키다, 증대하다')).toMatchObject({
      isCorrect: true,
      matchedAnswer: '늘리다',
    });

    expect(gradeShortAnswer('증가시키다', '늘리다, 증가시키다, 증대하다')).toMatchObject({
      isCorrect: true,
      matchedAnswer: '증가시키다',
    });
  });

  test('accepts the full comma-separated Korean meaning as correct', () => {
    expect(gradeShortAnswer('떨구다, 흘리다, 헛간', '떨구다, 흘리다, 헛간')).toMatchObject({
      isCorrect: true,
      matchedAnswer: '떨구다, 흘리다, 헛간',
    });
  });

  test('accepts a comma-separated answer when at least one item is correct and reports unmatched items', () => {
    expect(gradeShortAnswer('떨구다, 틀린뜻', '떨구다, 흘리다, 헛간')).toMatchObject({
      isCorrect: true,
      matchedAnswer: '떨구다',
      matchedAnswers: ['떨구다'],
      unmatchedAnswers: ['틀린뜻'],
    });
  });

  test('accepts meanings without parenthetical notes', () => {
    expect(gradeShortAnswer('개정하다', '개정하다(법률 등을), 수정하다')).toMatchObject({
      isCorrect: true,
      matchedAnswer: '개정하다(법률 등을)',
      unmatchedAnswers: [],
    });
  });

  test('keeps unrelated comma-separated meanings incorrect', () => {
    expect(gradeShortAnswer('줄이다', '늘리다, 증가시키다, 증대하다').isCorrect).toBe(false);
  });

  test('accepts AI-approved alternate answers for the active quiz mode', () => {
    const word = {
      meaning_ko: '어디에나 있는',
      accepted_answers: [
        { mode: 'short-en-ko', answer: '곳곳에 있는', source: 'ai-review' },
        { mode: 'short-ko-en', answer: 'ubiquitous', source: 'ai-review' },
      ],
    };

    expect(gradeShortAnswer('곳곳에 있는', word.meaning_ko, {
      acceptedAnswers: word.accepted_answers,
      mode: 'short-en-ko',
    })).toMatchObject({
      isCorrect: true,
      matchedAnswer: '곳곳에 있는',
      matchedAnswers: ['곳곳에 있는'],
    });
  });

  test('requires exact English answers in Korean-to-English mode', () => {
    expect(gradeShortAnswer('candid', 'candid', { mode: 'short-ko-en' })).toMatchObject({
      isCorrect: true,
      matchedAnswer: 'candid',
    });

    expect(gradeShortAnswer('candit', 'candid', { mode: 'short-ko-en' })).toMatchObject({
      isCorrect: false,
    });
  });
});

describe('gradeWithAI', () => {
  test('maps the required AI judgment reason to feedback', async () => {
    aiModelService.callAiModel.mockResolvedValueOnce(JSON.stringify({
      isCorrect: true,
      reason: '의미상 같은 답입니다.',
    }));

    const result = await gradeWithAI(
      '곳곳에 있는',
      '어디에나 있는',
      { word: 'ubiquitous' },
      { provider: 'codex', model: 'gpt-5.3-codex-spark' }
    );

    expect(result).toMatchObject({
      isCorrect: true,
      feedback: '의미상 같은 답입니다.',
    });
    expect(aiModelService.callAiModel.mock.calls[0][0].prompt).toContain('"reason"');
  });
});
