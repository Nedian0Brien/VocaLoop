import { calculateCorrectRate, calculateWrongRate } from '../utils/learningRate';

export const getWordSummaryKey = (word) => String(word?.id ?? word?.word ?? '');

export const replaceWordInAdaptiveSession = (session, updatedWord) => {
  const wordKey = getWordSummaryKey(updatedWord);
  if (!session || !wordKey) return session;
  const replaceWord = (word) => (
    getWordSummaryKey(word) === wordKey ? { ...word, ...updatedWord } : word
  );

  return {
    ...session,
    currentSetWords: session.currentSetWords?.map(replaceWord) || [],
    studySets: session.studySets?.map((setWords) => setWords.map(replaceWord)) || [],
    queue: session.queue?.map((task) => ({
      ...task,
      word: replaceWord(task.word),
    })) || [],
  };
};

export const buildLearningRateUpdate = ({
  activeQuizType,
  aiMode,
  currentWord,
  isCorrect,
  tracker = { wrongCount: 0, lastPenalty: 0, wasReasked: false },
}) => {
  const currentRate = currentWord.learningRate || 0;
  let newRate = currentRate;
  let updatedTracker = tracker;
  let updatedStats = currentWord.stats || {};

  if (isCorrect) {
    newRate = calculateCorrectRate({
      currentRate,
      quizType: activeQuizType,
      isReasked: tracker.wasReasked,
      isAiSimilar: aiMode && tracker.wasReasked,
      lastPenalty: tracker.lastPenalty,
    });
    updatedStats = {
      ...(currentWord.stats || {}),
      review_count: (currentWord.stats?.review_count || 0) + 1,
    };
  } else {
    const wrongResult = calculateWrongRate({ currentRate, wrongCount: tracker.wrongCount });
    newRate = wrongResult.newRate;
    updatedTracker = {
      ...tracker,
      wrongCount: tracker.wrongCount + 1,
      lastPenalty: wrongResult.penalty,
      wasReasked: true,
    };

    updatedStats = {
      ...(currentWord.stats || {}),
      wrong_count: (currentWord.stats?.wrong_count || 0) + 1,
      review_count: (currentWord.stats?.review_count || 0) + 1,
    };
  }

  return {
    newRate,
    tracker: updatedTracker,
    updatedStats,
    updatedWord: {
      ...currentWord,
      learningRate: newRate,
      stats: updatedStats,
    },
  };
};
