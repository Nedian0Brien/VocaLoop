import { describe, expect, test } from 'vitest';
import { describeImportSummary, getImportBatches, summarizeBulkAddResult } from './aiImportBatches';

const entries = (count) => Array.from({ length: count }, (_, index) => ({ word: `w${index}`, meaning_ko: null }));

describe('getImportBatches', () => {
  test('splits entries by batch_size and points at the first batch without a result', () => {
    const batches = getImportBatches({
      entries: entries(5),
      batch_size: 2,
      results: [{ batch_index: 0, status: 'saved' }],
    });

    expect(batches.total).toBe(3);
    expect(batches.batches.map((batch) => batch.entries.length)).toEqual([2, 2, 1]);
    expect(batches.completed.map((batch) => batch.index)).toEqual([0]);
    expect(batches.current.index).toBe(1);
    expect(batches.remainingAfterCurrent).toBe(1);
  });

  test('has no current batch once every batch has a result', () => {
    const batches = getImportBatches({
      entries: entries(3),
      batch_size: 2,
      results: [
        { batch_index: 0, status: 'saved' },
        { batch_index: 1, status: 'cancelled' },
      ],
    });

    expect(batches.current).toBeNull();
    expect(batches.remainingAfterCurrent).toBe(0);
  });

  test('falls back to the default batch size and empty entries', () => {
    const batches = getImportBatches({});

    expect(batches.batchSize).toBe(200);
    expect(batches.total).toBe(0);
    expect(batches.current).toBeNull();
  });
});

describe('summaries', () => {
  test('summarizeBulkAddResult counts each bucket and keeps failed word text', () => {
    expect(
      summarizeBulkAddResult({
        createdWords: [{ word: 'a' }],
        assignedWords: [{ word: 'b' }, { word: 'c' }],
        skippedWords: [],
        failedWords: [{ word: 'd', error: new Error('x') }, 'e'],
      })
    ).toEqual({ created: 1, assigned: 2, skipped: 0, failed: 2, failed_words: ['d', 'e'] });
  });

  test('describeImportSummary joins the non-zero buckets', () => {
    expect(describeImportSummary({ created: 3, assigned: 1, skipped: 0, failed: 0 })).toBe('3개 저장 · 1개 폴더 추가');
    expect(describeImportSummary({ created: 0, assigned: 0, skipped: 0, failed: 0 })).toBe('저장할 새 단어가 없었습니다.');
    expect(describeImportSummary(null)).toBe('');
  });
});
