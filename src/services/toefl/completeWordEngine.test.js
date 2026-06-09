import { describe, expect, test } from 'vitest';
import { getBlankSegments } from './completeWordEngine';

const fixedValues = (segments) =>
  segments.filter((segment) => segment.type === 'fixed').map((segment) => segment.value);

const editableIndices = (segments) =>
  segments.filter((segment) => segment.type === 'editable').map((segment) => segment.inputIndex);

describe('completeWordEngine', () => {
  test('keeps TOEFL default prefix reveal behavior', () => {
    const segments = getBlankSegments('mitigate');

    expect(fixedValues(segments).join('')).toBe('mit');
    expect(editableIndices(segments)).toEqual([3, 4, 5, 6, 7]);
  });

  test('allows regular word quizzes to hide every letter', () => {
    const segments = getBlankSegments('mitigate', { prefixRevealCount: 0 });

    expect(fixedValues(segments)).toEqual([]);
    expect(editableIndices(segments)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
