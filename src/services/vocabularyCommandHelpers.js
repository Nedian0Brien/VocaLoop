const normalizeTextValue = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const splitMeaningItems = (value = '') =>
  String(value)
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const getNullableFolderId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const folderId = Number(value);
  return Number.isNaN(folderId) ? null : folderId;
};

export const buildFolderIds = (folderId) => (folderId === null ? [] : [folderId]);

export const buildMeaningWithAcceptedAnswer = (currentMeaning, acceptedAnswer) => {
  const normalizedAnswer = normalizeTextValue(acceptedAnswer?.answer);
  if (!normalizedAnswer || acceptedAnswer?.mode !== 'short-en-ko') {
    return currentMeaning || '';
  }

  const meaningItems = splitMeaningItems(currentMeaning);
  const alreadyIncluded = meaningItems.some(
    (item) => item.toLowerCase() === normalizedAnswer.toLowerCase(),
  );
  if (alreadyIncluded) return currentMeaning || normalizedAnswer;

  return [...meaningItems, normalizedAnswer].join(', ');
};

export const buildRegeneratedWordPatch = (wordData) => ({
  meaning_ko: wordData.meaning_ko,
  pronunciation: wordData.pronunciation,
  pos: wordData.pos,
  definitions: wordData.definitions,
  definitions_ko: wordData.definitions_ko,
  examples: wordData.examples,
  synonyms: wordData.synonyms,
  nuance: wordData.nuance,
});

export const buildLearningRatePatch = (newRate, statsUpdate = {}, currentWord = {}) => ({
  learning_rate: Math.max(0, Math.min(100, Math.round(newRate))),
  stats: {
    wrong_count: statsUpdate.wrong_count ?? currentWord?.stats?.wrong_count ?? 0,
    review_count: statsUpdate.review_count ?? currentWord?.stats?.review_count ?? 0,
  },
});

export const buildAcceptedAnswerPatch = (currentWord, acceptedAnswer) => {
  const normalizedAnswer = acceptedAnswer.answer.trim();
  const currentAcceptedAnswers = Array.isArray(currentWord.accepted_answers)
    ? currentWord.accepted_answers
    : [];
  const alreadySaved = currentAcceptedAnswers.some((item) => (
    item?.mode === acceptedAnswer.mode &&
    String(item?.answer || '').trim().toLowerCase() === normalizedAnswer.toLowerCase()
  ));
  const nextMeaningKo = buildMeaningWithAcceptedAnswer(currentWord.meaning_ko, {
    ...acceptedAnswer,
    answer: normalizedAnswer,
  });
  const shouldUpdateMeaning = nextMeaningKo !== (currentWord.meaning_ko || '');

  if (alreadySaved && !shouldUpdateMeaning) {
    return null;
  }

  return {
    ...(shouldUpdateMeaning ? { meaning_ko: nextMeaningKo } : {}),
    ...(alreadySaved ? {} : {
      accepted_answers: [
        ...currentAcceptedAnswers,
        {
          mode: acceptedAnswer.mode,
          answer: normalizedAnswer,
          source: acceptedAnswer.source || 'ai-review',
          feedback: acceptedAnswer.feedback || null,
        },
      ],
    }),
  };
};
