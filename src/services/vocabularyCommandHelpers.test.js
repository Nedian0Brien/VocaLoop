import { describe, expect, test } from 'vitest';

import {
  buildAcceptedAnswerPatch,
  buildFolderIds,
  buildLearningRatePatch,
  buildRegeneratedWordPatch,
  getNullableFolderId,
} from './vocabularyCommandHelpers';

describe('vocabularyCommandHelpers', () => {
  test('normalizes optional folder ids for word creation', () => {
    expect(getNullableFolderId('3')).toBe(3);
    expect(getNullableFolderId('')).toBeNull();
    expect(getNullableFolderId('not-a-number')).toBeNull();
    expect(buildFolderIds(3)).toEqual([3]);
    expect(buildFolderIds(null)).toEqual([]);
  });

  test('builds bounded learning-rate patches with stats defaults', () => {
    expect(buildLearningRatePatch(122.4, { review_count: 5 }, {
      stats: { wrong_count: 2, review_count: 1 },
    })).toEqual({
      learning_rate: 100,
      stats: { wrong_count: 2, review_count: 5 },
    });
  });

  test('builds regenerated word patches without transport fields', () => {
    expect(buildRegeneratedWordPatch({
      word: 'candid',
      meaning_ko: '솔직한',
      pronunciation: '/ˈkændɪd/',
      pos: 'adjective',
      definitions: ['truthful'],
      definitions_ko: ['솔직한'],
      examples: [],
      synonyms: ['frank'],
      nuance: 'direct',
    })).toEqual({
      meaning_ko: '솔직한',
      pronunciation: '/ˈkændɪd/',
      pos: 'adjective',
      definitions: ['truthful'],
      definitions_ko: ['솔직한'],
      examples: [],
      synonyms: ['frank'],
      nuance: 'direct',
    });
  });

  test('builds accepted-answer patches and returns null for no-op duplicates', () => {
    const currentWord = {
      meaning_ko: '어디에나 있는',
      accepted_answers: [],
    };

    expect(buildAcceptedAnswerPatch(currentWord, {
      mode: 'short-en-ko',
      answer: ' 곳곳에 있는 ',
    })).toEqual({
      meaning_ko: '어디에나 있는, 곳곳에 있는',
      accepted_answers: [{
        mode: 'short-en-ko',
        answer: '곳곳에 있는',
        source: 'ai-review',
        feedback: null,
      }],
    });

    expect(buildAcceptedAnswerPatch({
      meaning_ko: '어디에나 있는, 곳곳에 있는',
      accepted_answers: [{ mode: 'short-en-ko', answer: '곳곳에 있는' }],
    }, {
      mode: 'short-en-ko',
      answer: '곳곳에 있는',
    })).toBeNull();
  });
});
