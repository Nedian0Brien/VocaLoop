import { describe, expect, test } from 'vitest';
import { buildMeaningWithAcceptedAnswer } from './useVocabularyCommands';

describe('buildMeaningWithAcceptedAnswer', () => {
  test('appends AI-approved Korean answers to comma-separated meanings', () => {
    expect(buildMeaningWithAcceptedAnswer('어디에나 있는', {
      mode: 'short-en-ko',
      answer: '곳곳에 있는',
    })).toBe('어디에나 있는, 곳곳에 있는');
  });

  test('does not duplicate an existing meaning', () => {
    expect(buildMeaningWithAcceptedAnswer('어디에나 있는, 곳곳에 있는', {
      mode: 'short-en-ko',
      answer: '곳곳에 있는',
    })).toBe('어디에나 있는, 곳곳에 있는');
  });

  test('does not add English answers from Korean-to-English quiz mode to Korean meanings', () => {
    expect(buildMeaningWithAcceptedAnswer('어디에나 있는', {
      mode: 'short-ko-en',
      answer: 'ubiquitous',
    })).toBe('어디에나 있는');
  });
});
