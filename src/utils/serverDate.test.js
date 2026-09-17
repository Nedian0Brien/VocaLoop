import { describe, expect, test } from 'vitest';
import { parseServerDate } from './serverDate';

describe('parseServerDate', () => {
  test('treats a naive timestamp as UTC', () => {
    expect(parseServerDate('2026-09-17T05:44:02').toISOString()).toBe('2026-09-17T05:44:02.000Z');
    expect(parseServerDate('2026-09-17T05:44:02.485169').toISOString()).toBe('2026-09-17T05:44:02.485Z');
  });

  test('keeps an explicit zone', () => {
    expect(parseServerDate('2026-09-17T05:44:02Z').toISOString()).toBe('2026-09-17T05:44:02.000Z');
    expect(parseServerDate('2026-09-17T14:44:02+09:00').toISOString()).toBe('2026-09-17T05:44:02.000Z');
  });

  test('returns an invalid date for junk', () => {
    expect(Number.isNaN(parseServerDate('').getTime())).toBe(true);
    expect(Number.isNaN(parseServerDate(null).getTime())).toBe(true);
  });
});
