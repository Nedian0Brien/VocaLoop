import { describe, expect, test, vi } from 'vitest';
import { normalizeBulkWordEntries, normalizeBulkWordQueue, runBulkWordAdd } from './bulkWordAddService';

const analysisFor = (word) => ({
  word,
  meaning_ko: `${word} 뜻`,
  pronunciation: null,
  pos: 'noun',
  definitions: [`${word} definition`],
  definitions_ko: [`${word} 정의`],
  examples: [{ en: `${word} example`, ko: `${word} 예문` }],
  synonyms: [],
  nuance: null,
});

describe('normalizeBulkWordQueue', () => {
  test('trims empty values and removes case-insensitive duplicates', () => {
    expect(normalizeBulkWordQueue([' apple ', '', 'Apple', 'banana'])).toEqual(['apple', 'banana']);
  });
});

describe('runBulkWordAdd', () => {
  test('assigns existing words to a new folder and skips existing folder matches', async () => {
    const savedWords = [];
    const result = await runBulkWordAdd({
      activeAiConfig: {},
      createWord: vi.fn(),
      existingWords: [
        { id: 1, word: 'apple', folder_ids: [1] },
        { id: 2, word: 'banana', folder_ids: [3] },
      ],
      folderId: 3,
      generateBulkWordData: vi.fn(),
      generateWordData: vi.fn(),
      onWordSaved: (word) => {
        savedWords.push(word);
        return word;
      },
      updateWord: vi.fn(async (id, payload) => ({ id, word: 'apple', ...payload })),
      words: ['apple', 'banana'],
    });

    expect(result.assignedWords).toEqual([{ id: 1, word: 'apple', folder_ids: [1, 3] }]);
    expect(result.skippedWords).toEqual([{ id: 2, word: 'banana', folder_ids: [3] }]);
    expect(savedWords).toEqual([{ id: 1, word: 'apple', folder_ids: [1, 3] }]);
  });

  test('falls back to single word generation when bulk generation fails', async () => {
    const createWord = vi.fn(async (payload) => ({ id: payload.word, ...payload }));
    const result = await runBulkWordAdd({
      activeAiConfig: {},
      createWord,
      existingWords: [],
      folderId: null,
      generateBulkWordData: vi.fn(async () => {
        throw new Error('bulk unavailable');
      }),
      generateWordData: vi.fn(async (word) => analysisFor(word)),
      updateWord: vi.fn(),
      words: ['apple', 'banana'],
    });

    expect(result.createdWords.map((word) => word.word)).toEqual(['apple', 'banana']);
    expect(createWord).toHaveBeenCalledTimes(2);
  });

  test('regenerates and retries when save fails with validation error', async () => {
    const createWord = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('validation failed'), { status: 422 }))
      .mockResolvedValueOnce({ id: 1, ...analysisFor('apple') });
    const generateWordData = vi.fn(async (word) => analysisFor(word));

    const result = await runBulkWordAdd({
      activeAiConfig: {},
      createWord,
      existingWords: [],
      folderId: 4,
      generateBulkWordData: vi.fn(async (words) => words.map(analysisFor)),
      generateWordData,
      updateWord: vi.fn(),
      words: ['apple'],
    });

    expect(generateWordData).toHaveBeenCalledWith('apple', {}, { gloss: null });
    expect(createWord).toHaveBeenCalledTimes(2);
    expect(result.createdWords).toHaveLength(1);
    expect(createWord.mock.calls[1][0].folder_ids).toEqual([4]);
  });

  test('returns partial failures without discarding successful words', async () => {
    const createWord = vi.fn(async (payload) => {
      if (payload.word === 'banana') throw new Error('save failed');
      return { id: payload.word, ...payload };
    });

    const result = await runBulkWordAdd({
      activeAiConfig: {},
      createWord,
      existingWords: [],
      folderId: null,
      generateBulkWordData: vi.fn(async (words) => words.map(analysisFor)),
      generateWordData: vi.fn(),
      updateWord: vi.fn(),
      words: ['apple', 'banana'],
    });

    expect(result.createdWords.map((word) => word.word)).toEqual(['apple']);
    expect(result.failedWords).toHaveLength(1);
    expect(result.failedWords[0].word).toBe('banana');
  });
});

describe('normalizeBulkWordEntries', () => {
  test('keeps file glosses and fills a missing gloss from a later duplicate', () => {
    expect(
      normalizeBulkWordEntries([
        { word: ' abate ', meaning_ko: ' 줄이다 ' },
        'candid',
        { word: 'Candid', meaning_ko: '솔직한' },
        { word: 'ABATE', meaning_ko: '다른 뜻' },
        { word: '', meaning_ko: '빈' },
      ])
    ).toEqual([
      { word: 'abate', meaning_ko: '줄이다' },
      { word: 'candid', meaning_ko: '솔직한' },
    ]);
  });
});

describe('runBulkWordAdd with file glosses', () => {
  test('overrides meaning_ko with the file gloss and passes gloss hints to the analyzer', async () => {
    const createWord = vi.fn(async (payload) => ({ id: payload.word, ...payload }));
    const generateBulkWordData = vi.fn(async (words) => words.map(analysisFor));

    const result = await runBulkWordAdd({
      activeAiConfig: {},
      createWord,
      existingWords: [],
      folderId: 2,
      generateBulkWordData,
      generateWordData: vi.fn(),
      updateWord: vi.fn(),
      words: [{ word: 'apple', meaning_ko: '사과' }, { word: 'banana', meaning_ko: null }],
    });

    expect(generateBulkWordData).toHaveBeenCalledWith(['apple', 'banana'], {}, { glosses: { apple: '사과' } });
    expect(createWord.mock.calls[0][0].meaning_ko).toBe('사과');
    expect(createWord.mock.calls[1][0].meaning_ko).toBe('banana 뜻');
    expect(result.createdWords.map((word) => word.meaning_ko)).toEqual(['사과', 'banana 뜻']);
  });

  test('keeps the file gloss when a save is retried after a validation error', async () => {
    const createWord = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('validation failed'), { status: 422 }))
      .mockImplementation(async (payload) => ({ id: 1, ...payload }));
    const generateWordData = vi.fn(async (word) => analysisFor(word));

    await runBulkWordAdd({
      activeAiConfig: {},
      createWord,
      existingWords: [],
      folderId: null,
      generateBulkWordData: vi.fn(async (words) => words.map(analysisFor)),
      generateWordData,
      updateWord: vi.fn(),
      words: [{ word: 'apple', meaning_ko: '사과' }],
    });

    expect(generateWordData).toHaveBeenCalledWith('apple', {}, { gloss: '사과' });
    expect(createWord.mock.calls[1][0].meaning_ko).toBe('사과');
  });
});
