export const getPrefixRevealCount = (letterCount) => {
  if (letterCount <= 3) return 1;
  if (letterCount <= 6) return 2;
  return 3;
};

export const getBlankSegments = (answer = '') => {
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
  const prefixRevealCount = Math.min(getPrefixRevealCount(editableIndexes.length), editableIndexes.length - 1);

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
        segments: getBlankSegments(blank.answer || ''),
      })) || [],
  }));

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
    return getBlankSegments(blank.answer).map((segment) => {
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
