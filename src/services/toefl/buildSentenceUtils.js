const BLANK_PATTERN = /_{2,}/g;

export const normalizeBuildSentenceText = (value) =>
  String(value || '')
    .replace(/\s+([?.!,;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

export const countSentenceFrameBlanks = (sentenceFrame) => {
  const matches = String(sentenceFrame || '').match(BLANK_PATTERN);
  return matches ? matches.length : 0;
};

export const getBuildSentenceRequiredTokenCount = (question) => {
  if (Array.isArray(question?.answer) && question.answer.length > 0) {
    return question.answer.length;
  }

  const blankCount = countSentenceFrameBlanks(question?.sentenceFrame);
  return blankCount > 0 ? blankCount : 1;
};

export const hasBuildSentenceFrame = (question) =>
  countSentenceFrameBlanks(question?.sentenceFrame) > 0
  || (Array.isArray(question?.answer) && question.answer.length > 0);

export const fillSentenceFrame = (sentenceFrame, tokens) => {
  let index = 0;
  const filled = String(sentenceFrame || '').replace(BLANK_PATTERN, () => {
    const token = tokens[index];
    index += 1;
    return token || '_____';
  });
  return normalizeBuildSentenceText(filled);
};

export const buildSentenceAttempt = (question, arrangement) => {
  const words = Array.isArray(question?.words) ? question.words : [];
  const tokens = arrangement.map((index) => words[index]).filter((token) => token != null);
  const blankCount = countSentenceFrameBlanks(question?.sentenceFrame);

  if (blankCount > 0) {
    const attempt = fillSentenceFrame(question.sentenceFrame, tokens);
    const extras = tokens.slice(blankCount);
    return normalizeBuildSentenceText([attempt, ...extras].join(' '));
  }

  return normalizeBuildSentenceText(tokens.join(' '));
};

export const canSubmitBuildSentence = (question, arrangement, status) => {
  if (status !== 'ready') return false;
  const placedCount = arrangement.length;
  if (placedCount === 0) return false;

  if (hasBuildSentenceFrame(question)) {
    return placedCount === getBuildSentenceRequiredTokenCount(question);
  }

  return true;
};
