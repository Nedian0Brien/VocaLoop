import { useCallback } from 'react';

import { resolveAdaptiveAnswer } from '../services/adaptiveQuizService';
import {
  buildLearningRateUpdate,
  getWordSummaryKey,
  replaceWordInAdaptiveSession,
} from '../services/quizAnswerFlow';
import { playSound } from '../utils/soundEffects';

export function useQuizAnswerController({
  adaptiveSession,
  aiMode,
  currentIndex,
  onAcceptedAnswer,
  onUpdateLearningRate,
  queue,
  selectedMode,
  setAdaptiveSession,
  setCurrentIndex,
  setQueue,
  setQuizState,
  setStats,
  setStudySetSummaries,
  soundEnabled,
  stats,
  wordQuizTracker,
}) {
  const handleAnswer = useCallback((isCorrect) => {
    const isAdaptive = selectedMode?.id === 'mixed';
    const currentTask = isAdaptive ? adaptiveSession?.queue?.[0] : null;
    const currentWord = isAdaptive ? currentTask?.word : queue[currentIndex];
    const wordId = currentWord?.id;
    const activeQuizType =
      isAdaptive
        ? adaptiveSession?.modes?.[currentTask?.stageIndex || 0] || 'multiple'
        : selectedMode?.id || 'multiple';

    const newStats = {
      ...stats,
      correct: stats.correct + (isCorrect ? 1 : 0),
      wrong: stats.wrong + (isCorrect ? 0 : 1),
      total: stats.total + 1,
    };
    setStats(newStats);

    let workingAdaptiveSession = adaptiveSession;
    let workingQueue = queue;
    let workingCurrentWord = currentWord;

    const recordStudySetProgress = (setIndex, word, newRate) => {
      const key = getWordSummaryKey(word);
      if (!key) return;
      setStudySetSummaries((current) => {
        const setKey = String(setIndex);
        const currentSet = current[setKey] || { words: {} };
        const currentWordSummary = currentSet.words?.[key];
        const startRate = currentWordSummary?.startRate ?? (word?.learningRate || 0);
        return {
          ...current,
          [setKey]: {
            ...currentSet,
            words: {
              ...(currentSet.words || {}),
              [key]: {
                id: word?.id,
                word: word?.word || key,
                meaningKo: word?.meaning_ko || word?.meaningKo || '',
                startRate,
                latestRate: newRate,
              },
            },
          },
        };
      });
    };

    if (wordId !== undefined && wordId !== null && onUpdateLearningRate) {
      const tracker = wordQuizTracker.current[wordId] || { wrongCount: 0, lastPenalty: 0, wasReasked: false };
      const learningUpdate = buildLearningRateUpdate({
        activeQuizType,
        aiMode,
        currentWord,
        isCorrect,
        tracker,
      });
      wordQuizTracker.current[wordId] = learningUpdate.tracker;
      onUpdateLearningRate(wordId, learningUpdate.newRate, learningUpdate.updatedStats);
      workingCurrentWord = learningUpdate.updatedWord;

      if (isAdaptive) {
        recordStudySetProgress(adaptiveSession?.currentSetIndex || 0, currentWord, learningUpdate.newRate);
        workingAdaptiveSession = replaceWordInAdaptiveSession(adaptiveSession, workingCurrentWord);
      } else {
        workingQueue = queue.map((word) => (
          getWordSummaryKey(word) === getWordSummaryKey(workingCurrentWord) ? workingCurrentWord : word
        ));
      }
    }

    if (isAdaptive) {
      const nextSession = resolveAdaptiveAnswer(workingAdaptiveSession, isCorrect);
      setAdaptiveSession(nextSession);
      if (nextSession.isComplete) {
        setQuizState('result');
        if (soundEnabled) playSound('COMPLETE');
      }
      return;
    }

    if (isCorrect) {
      if (currentIndex < queue.length - 1) {
        setQueue(workingQueue);
        setCurrentIndex(currentIndex + 1);
      } else {
        setQuizState('result');
        if (soundEnabled) playSound('COMPLETE');
      }
    } else {
      const newQueue = [...workingQueue];
      newQueue.splice(currentIndex, 1);
      newQueue.push(workingCurrentWord);
      setQueue(newQueue);
      if (currentIndex >= newQueue.length) setCurrentIndex(0);
    }
  }, [
    adaptiveSession,
    aiMode,
    currentIndex,
    onUpdateLearningRate,
    queue,
    selectedMode,
    setAdaptiveSession,
    setCurrentIndex,
    setQueue,
    setQuizState,
    setStats,
    setStudySetSummaries,
    soundEnabled,
    stats,
    wordQuizTracker,
  ]);

  const handleAcceptedAnswer = useCallback(async (wordId, acceptedAnswer) => {
    if (!onAcceptedAnswer) return null;
    const updatedWord = await onAcceptedAnswer(wordId, acceptedAnswer);
    if (!updatedWord?.id) return updatedWord;

    setQueue((currentQueue) => currentQueue.map((word) => (
      word?.id === updatedWord.id ? { ...word, ...updatedWord } : word
    )));
    setAdaptiveSession((currentSession) => {
      if (!currentSession) return currentSession;
      const replaceWord = (word) => (
        word?.id === updatedWord.id ? { ...word, ...updatedWord } : word
      );
      return {
        ...currentSession,
        currentSetWords: currentSession.currentSetWords?.map(replaceWord) || [],
        studySets: currentSession.studySets?.map((setWords) => setWords.map(replaceWord)) || [],
        queue: currentSession.queue?.map((task) => ({
          ...task,
          word: replaceWord(task.word),
        })) || [],
      };
    });

    return updatedWord;
  }, [onAcceptedAnswer, setAdaptiveSession, setQueue]);

  return {
    handleAcceptedAnswer,
    handleAnswer,
  };
}
