import { describe, expect, test } from 'vitest';
import {
  buildCompleteUserAnswers,
  getBlankSegments,
  prepareCompleteQuestions,
} from './completeWordEngine';

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

  test('uses revealCount when preparing a generated blank', () => {
    const [question] = prepareCompleteQuestions([{
      paragraph: 'Artists were {{1}} new forms.',
      blanks: [{ id: 1, answer: 'creating', revealCount: 4 }],
    }], 10);

    expect(fixedValues(question.blanks[0].segments).join('')).toBe('crea');
  });

  test('reconstructs the answer from the prepared blank segments', () => {
    const [question] = prepareCompleteQuestions([{
      paragraph: 'Artists were {{1}} new forms.',
      blanks: [{ id: 1, answer: 'creating', revealCount: 4 }],
    }], 10);
    const answers = [[
      '', '', '', '', 't', 'i', 'n', 'g',
    ]];

    expect(buildCompleteUserAnswers(question, answers)).toEqual(['creating']);
  });

  test.each([undefined, null, 0, 8, 2.5, '4'])(
    'falls back to the legacy reveal rule for %p',
    (revealCount) => {
      const [question] = prepareCompleteQuestions([{
        paragraph: 'Artists were {{1}} new forms.',
        blanks: [{ id: 1, answer: 'creating', revealCount }],
      }], 10);

      expect(fixedValues(question.blanks[0].segments).join('')).toBe('cre');
    }
  );
});
