export const getPrefixRevealCount = (letterCount) => {
  if (letterCount <= 3) return 1;
  if (letterCount <= 6) return 2;
  return 3;
};

const getLetterCount = (answer = '') =>
  String(answer).split('').filter((char) => /^[a-zA-Z]$/.test(char)).length;

const COMPLETE_WORD_FUNCTION_WORDS = new Set([
  'as', 'at', 'by', 'if', 'in', 'of', 'on', 'or', 'so', 'to',
  'up', 'yet', 'and', 'but', 'for', 'nor', 'the', 'with', 'from',
]);

const PLACEHOLDER_PATTERN = /{{(\d+)}}/g;

const countWords = (value) =>
  String(value).trim().split(/\s+/).filter(Boolean).length;

const splitSentences = (value) =>
  (String(value).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const failGeneratedQuestion = (questionIndex, message) => {
  throw new Error(`Complete the Words 문항 ${questionIndex + 1}: ${message}`);
};

export const resolveBlankRevealCount = (answer, revealCount) => {
  const letterCount = getLetterCount(answer);
  if (
    Number.isInteger(revealCount) &&
    revealCount >= 1 &&
    revealCount < letterCount
  ) {
    return revealCount;
  }
  return getPrefixRevealCount(letterCount);
};

export const getBlankSegments = (answer = '', options = {}) => {
  const safeAnswer = String(answer);
  if (!safeAnswer) return [{ type: 'editable', value: '' }];

  const chars = safeAnswer.split('');
  const editableIndexes = chars
    .map((char, index) => (/^[a-zA-Z]$/.test(char) ? index : null))
    .filter((index) => index !== null);

  if (editableIndexes.length === 0) {
    return chars.map((char) => ({ type: 'fixed', value: char, inputIndex: null }));
  }

  const hiddenSet = new Set(editableIndexes);
  const revealedIndexes = new Set();
  const requestedPrefixRevealCount = options.prefixRevealCount ?? getPrefixRevealCount(editableIndexes.length);
  const prefixRevealCount = Math.min(requestedPrefixRevealCount, editableIndexes.length - 1);

  editableIndexes.slice(0, prefixRevealCount).forEach((index) => {
    hiddenSet.delete(index);
    revealedIndexes.add(index);
  });

  if (hiddenSet.size === 0) {
    const middleOrder = Math.floor(editableIndexes.length / 2);
    hiddenSet.add(editableIndexes[middleOrder]);
    revealedIndexes.delete(editableIndexes[middleOrder]);
  }

  return chars.map((char, index) => {
    const isAlphabet = /^[a-zA-Z]$/.test(char);
    if (!isAlphabet) return { type: 'fixed', value: char, inputIndex: null };
    if (revealedIndexes.has(index)) return { type: 'fixed', value: char, inputIndex: null };
    return { type: 'editable', value: '', inputIndex: index };
  });
};

export const prepareCompleteQuestions = (questions, blanksPerQuestion) =>
  (questions || []).map((question) => ({
    ...question,
    blanks:
      question.blanks?.slice(0, blanksPerQuestion).map((blank) => ({
        ...blank,
        segments: getBlankSegments(blank.answer || '', {
          prefixRevealCount: resolveBlankRevealCount(blank.answer, blank.revealCount),
        }),
      })) || [],
  }));

export const validateGeneratedCompleteQuestionSet = (
  questions,
  { questionCount, blanksPerQuestion }
) => {
  if (!Array.isArray(questions) || questions.length !== questionCount) {
    throw new Error(`Complete the Words 문항 수가 ${questionCount}개가 아닙니다.`);
  }

  questions.forEach((question, questionIndex) => {
    const paragraph = String(question?.paragraph || '');
    const fullParagraph = String(question?.fullParagraph || '');
    const fullSentences = splitSentences(fullParagraph);
    const maskedSentences = splitSentences(paragraph);
    const blanks = Array.isArray(question?.blanks) ? question.blanks : [];
    const wordCount = countWords(fullParagraph);

    if (wordCount < 70 || wordCount > 100) {
      failGeneratedQuestion(questionIndex, '완성 지문은 70~100단어여야 합니다.');
    }
    if (fullSentences.length < 4 || maskedSentences.length < 4) {
      failGeneratedQuestion(questionIndex, '지문은 최소 4문장이어야 합니다.');
    }
    if (PLACEHOLDER_PATTERN.test(fullParagraph)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      failGeneratedQuestion(questionIndex, '완성 지문에는 placeholder가 없어야 합니다.');
    }
    PLACEHOLDER_PATTERN.lastIndex = 0;
    if (PLACEHOLDER_PATTERN.test(maskedSentences[0])) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      failGeneratedQuestion(questionIndex, '첫 문장에는 placeholder를 둘 수 없습니다.');
    }
    PLACEHOLDER_PATTERN.lastIndex = 0;
    if (PLACEHOLDER_PATTERN.test(maskedSentences[maskedSentences.length - 1])) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      failGeneratedQuestion(questionIndex, '마지막 문장에는 placeholder를 둘 수 없습니다.');
    }
    PLACEHOLDER_PATTERN.lastIndex = 0;

    if (blanks.length !== blanksPerQuestion) {
      failGeneratedQuestion(questionIndex, `빈칸은 ${blanksPerQuestion}개여야 합니다.`);
    }

    const blankIds = blanks.map((blank) => blank?.id);
    if (
      blankIds.some((id) => !Number.isInteger(id)) ||
      new Set(blankIds).size !== blankIds.length
    ) {
      failGeneratedQuestion(questionIndex, '빈칸 ID는 중복되지 않은 정수여야 합니다.');
    }

    const placeholderIds = Array.from(paragraph.matchAll(PLACEHOLDER_PATTERN), (match) => Number(match[1]));
    const sortedBlankIds = [...blankIds].sort((a, b) => a - b);
    const sortedPlaceholderIds = [...placeholderIds].sort((a, b) => a - b);
    if (
      placeholderIds.length !== blanksPerQuestion ||
      new Set(placeholderIds).size !== placeholderIds.length ||
      JSON.stringify(sortedPlaceholderIds) !== JSON.stringify(sortedBlankIds)
    ) {
      failGeneratedQuestion(questionIndex, 'placeholder와 빈칸 ID가 일치해야 합니다.');
    }

    const answers = blanks.map((blank) => String(blank?.answer || '').toLowerCase());
    if (answers.some((answer) => !/^[a-z]{2,10}$/.test(answer))) {
      failGeneratedQuestion(questionIndex, '정답은 2~10자의 영단어여야 합니다.');
    }
    if (new Set(answers).size !== answers.length) {
      failGeneratedQuestion(questionIndex, '정답 단어가 중복되어서는 안 됩니다.');
    }

    const functionWordCount = answers.filter(
      (answer) => answer.length <= 4 && COMPLETE_WORD_FUNCTION_WORDS.has(answer)
    ).length;
    if (functionWordCount < 2 || functionWordCount > 4) {
      failGeneratedQuestion(questionIndex, '짧은 기능어는 2~4개여야 합니다.');
    }
  });

  return questions;
};

export const initializeCompleteAnswers = (questionList) =>
  questionList.map((question) =>
    question.blanks.map((blank) => new Array((blank.answer || '').length).fill(''))
  );

export const getEditableIndices = (blank) =>
  (blank?.segments || [])
    .filter((segment) => segment.type === 'editable')
    .map((segment) => segment.inputIndex);

export const isBlankCorrect = (blank, blankAnswers = []) =>
  getEditableIndices(blank).every((inputIndex) => {
    const userAnswer = (blankAnswers[inputIndex] || '').toLowerCase();
    const targetAnswer = (blank.answer[inputIndex] || '').toLowerCase();
    return userAnswer === targetAnswer;
  });

export const getFilledBlankCount = (question, questionAnswers = []) => {
  if (!question) return 0;
  return question.blanks.reduce((count, blank, index) => {
    const blankAnswers = questionAnswers[index] || [];
    const editableIndices = getEditableIndices(blank);
    const isFilled =
      editableIndices.length > 0 &&
      editableIndices.every((inputIndex) => (blankAnswers[inputIndex] || '').trim().length > 0);
    return count + (isFilled ? 1 : 0);
  }, 0);
};

export const getQuestionCorrectness = (question, questionAnswers = []) => {
  if (!question) return null;
  const correctCount = question.blanks.reduce((count, blank, index) => {
    const blankAnswers = questionAnswers[index] || [];
    return count + (isBlankCorrect(blank, blankAnswers) ? 1 : 0);
  }, 0);
  return {
    correctCount,
    total: question.blanks.length,
    isPerfect: correctCount === question.blanks.length,
  };
};

export const getBlankResults = (question, questionAnswers = []) => {
  if (!question) return [];
  return question.blanks.map((blank, index) => ({
    isCorrect: isBlankCorrect(blank, questionAnswers[index] || []),
  }));
};

export const buildCompleteUserAnswers = (question, questionAnswers = []) =>
  (question?.blanks || []).map((blank, blankIndex) => {
    const blankAnswers = questionAnswers[blankIndex] || [];
    const segments = blank.segments?.length
      ? blank.segments
      : getBlankSegments(blank.answer, {
          prefixRevealCount: resolveBlankRevealCount(blank.answer, blank.revealCount),
        });
    return segments.map((segment) => {
      if (segment.type === 'fixed') return segment.value;
      return blankAnswers[segment.inputIndex] || '';
    }).join('');
  });

export const buildCompleteQuestionResults = (questions, answers) => {
  let totalCorrect = 0;
  let totalBlanks = 0;
  const questionResults = questions.map((question, index) => {
    const correctness = getQuestionCorrectness(question, answers[index] || []);
    totalCorrect += correctness.correctCount;
    totalBlanks += correctness.total;
    return {
      questionIndex: index,
      correctCount: correctness.correctCount,
      total: correctness.total,
    };
  });

  return { questionResults, totalBlanks, totalCorrect };
};

export const formatCompleteResultsPayload = (questionResults) =>
  questionResults
    .map((result, index) => `Q${index + 1}: ${result.correctCount}/${result.total}`)
    .join(' | ');
