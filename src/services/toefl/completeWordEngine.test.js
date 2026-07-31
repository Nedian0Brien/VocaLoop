import { describe, expect, test } from 'vitest';
import * as completeWordEngine from './completeWordEngine';
import {
  buildCompleteUserAnswers,
  getBlankSegments,
  prepareCompleteQuestions,
} from './completeWordEngine';
import { makeValidGeneratedQuestion } from './completeWordTestFixtures';

const fixedValues = (segments) =>
  segments.filter((segment) => segment.type === 'fixed').map((segment) => segment.value);

const editableIndices = (segments) =>
  segments.filter((segment) => segment.type === 'editable').map((segment) => segment.inputIndex);

const makeFullParagraph = (wordCount, sentenceCount = 4) => {
  const baseCount = Math.floor(wordCount / sentenceCount);
  let remainder = wordCount % sentenceCount;
  return Array.from({ length: sentenceCount }, (_, sentenceIndex) => {
    const currentCount = baseCount + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return `${Array.from(
      { length: currentCount },
      (_, wordIndex) => `word${sentenceIndex}_${wordIndex}`
    ).join(' ')}.`;
  }).join(' ');
};

const expectInvalidGeneratedQuestion = (mutate, errorPattern) => {
  const questions = structuredClone([makeValidGeneratedQuestion()]);
  mutate(questions[0]);
  expect(() => completeWordEngine.validateGeneratedCompleteQuestionSet(questions, {
    questionCount: 1,
    blanksPerQuestion: 10,
  })).toThrow(errorPattern);
};

describe('completeWordEngine', () => {
  test('accepts a generated set that matches the Santa-style structure', () => {
    const questions = [makeValidGeneratedQuestion()];

    expect(questions[0].fullParagraph.trim().split(/\s+/)).toHaveLength(83);
    expect(() => completeWordEngine.validateGeneratedCompleteQuestionSet(questions, {
      questionCount: 1,
      blanksPerQuestion: 10,
    })).not.toThrow();
  });

  test('accepts generated paragraphs at the 70 and 100 word boundaries', () => {
    [70, 100].forEach((wordCount) => {
      const question = makeValidGeneratedQuestion();
      question.fullParagraph = makeFullParagraph(wordCount);

      expect(() => completeWordEngine.validateGeneratedCompleteQuestionSet([question], {
        questionCount: 1,
        blanksPerQuestion: 10,
      })).not.toThrow();
    });
  });

  test('rejects the wrong generated question count', () => {
    expect(() => completeWordEngine.validateGeneratedCompleteQuestionSet([], {
      questionCount: 1,
      blanksPerQuestion: 10,
    })).toThrow(/문항 수/);
  });

  test.each([69, 101])('rejects a %i word generated paragraph', (wordCount) => {
    expectInvalidGeneratedQuestion((question) => {
      question.fullParagraph = makeFullParagraph(wordCount);
    }, /70~100단어/);
  });

  test('rejects a generated paragraph with fewer than four sentences', () => {
    expectInvalidGeneratedQuestion((question) => {
      question.fullParagraph = makeFullParagraph(83, 3);
    }, /최소 4문장/);
  });

  test('rejects a placeholder in the first sentence', () => {
    expectInvalidGeneratedQuestion((question) => {
      question.paragraph = question.paragraph
        .replace('Painting techniques', 'Painting {{1}} techniques')
        .replace('Early painters {{1}}', 'Early painters used');
    }, /첫 문장/);
  });

  test('rejects a placeholder in the last sentence', () => {
    expectInvalidGeneratedQuestion((question) => {
      question.paragraph = question.paragraph
        .replace('{{10}} more lifelike portraits', 'and more lifelike portraits')
        .replace('Later movements', 'Later {{10}} movements');
    }, /마지막 문장/);
  });

  test('rejects the wrong blank count', () => {
    expectInvalidGeneratedQuestion((question) => {
      question.blanks.pop();
    }, /빈칸은 10개/);
  });

  test('rejects duplicate blank ids', () => {
    expectInvalidGeneratedQuestion((question) => {
      question.blanks[1].id = question.blanks[0].id;
    }, /빈칸 ID/);
  });

  test('rejects a placeholder that does not map to a blank', () => {
    expectInvalidGeneratedQuestion((question) => {
      question.paragraph = question.paragraph.replace('{{10}}', '{{11}}');
    }, /placeholder/);
  });

  test.each(['a', 'counterpoint'])('rejects the out-of-range answer %s', (answer) => {
    expectInvalidGeneratedQuestion((question) => {
      question.blanks[0].answer = answer;
    }, /2~10자/);
  });

  test('rejects duplicate answers', () => {
    expectInvalidGeneratedQuestion((question) => {
      question.blanks[1].answer = question.blanks[0].answer;
    }, /정답 단어가 중복/);
  });

  test('rejects fewer than two short function words', () => {
    expectInvalidGeneratedQuestion((question) => {
      const replacements = {
        on: 'beyond',
        as: 'during',
        with: 'through',
        and: 'while',
      };
      question.blanks = question.blanks.map((blank) => (
        replacements[blank.answer]
          ? { ...blank, answer: replacements[blank.answer] }
          : blank
      ));
    }, /기능어는 2~4개/);
  });

  test('rejects more than four short function words', () => {
    expectInvalidGeneratedQuestion((question) => {
      question.blanks[0].answer = 'for';
    }, /기능어는 2~4개/);
  });

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
