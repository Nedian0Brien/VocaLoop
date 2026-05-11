export const ADAPTIVE_MODE_ORDER = ['multiple', 'short', 'complete-word'];

const getWordKey = (word) => String(word?.id ?? word?.word ?? '');

export function normalizeAdaptiveModes(modes = ADAPTIVE_MODE_ORDER) {
  const selected = Array.isArray(modes) && modes.length > 0 ? modes : ADAPTIVE_MODE_ORDER;
  const valid = selected.filter((mode) => ADAPTIVE_MODE_ORDER.includes(mode));
  return valid.length > 0 ? valid : ADAPTIVE_MODE_ORDER;
}

export function buildAdaptiveQueue(words = [], modes = ADAPTIVE_MODE_ORDER) {
  normalizeAdaptiveModes(modes);
  return words.map((word) => ({
    word,
    stageIndex: 0,
    wrongStreak: 0,
  }));
}

export function createAdaptiveSession(words = [], modes = ADAPTIVE_MODE_ORDER) {
  const selectedModes = normalizeAdaptiveModes(modes);
  return {
    modes: selectedModes,
    totalStages: words.length * selectedModes.length,
    queue: buildAdaptiveQueue(words, selectedModes),
    completedStages: 0,
    isComplete: words.length === 0,
  };
}

export function resolveAdaptiveAnswer(session, isCorrect) {
  const currentTask = session?.queue?.[0];
  if (!currentTask) {
    return { ...session, queue: [], isComplete: true };
  }

  const modes = normalizeAdaptiveModes(session.modes);
  const remainingQueue = session.queue.slice(1);
  const wordKey = getWordKey(currentTask.word);
  const currentStageIndex = Math.max(0, Math.min(currentTask.stageIndex || 0, modes.length - 1));
  const currentCompletedStages = Math.max(0, session.completedStages || 0);

  if (isCorrect) {
    const nextCompletedStages = currentCompletedStages + 1;
    const nextStageIndex = currentStageIndex + 1;
    const nextTask =
      nextStageIndex < modes.length
        ? { word: currentTask.word, stageIndex: nextStageIndex, wrongStreak: 0 }
        : null;

    const nextQueue = nextTask ? [...remainingQueue, nextTask] : remainingQueue;
    return {
      ...session,
      modes,
      totalStages: session.totalStages,
      queue: nextQueue,
      completedStages: nextCompletedStages,
      isComplete: nextQueue.length === 0,
    };
  }

  const nextWrongStreak = (currentTask.wrongStreak || 0) + 1;
  const shouldStepDown = nextWrongStreak >= 2 && currentStageIndex > 0;
  const nextStageIndex = shouldStepDown ? currentStageIndex - 1 : currentStageIndex;
  const completedRollback =
    shouldStepDown
      ? remainingQueue.some((task) => getWordKey(task.word) === wordKey && task.stageIndex === currentStageIndex)
        ? 0
        : 1
      : 0;

  const nextTask = {
    word: currentTask.word,
    stageIndex: nextStageIndex,
    wrongStreak: shouldStepDown ? 0 : nextWrongStreak,
  };

  return {
    ...session,
    modes,
    totalStages: session.totalStages,
    queue: [...remainingQueue, nextTask],
    completedStages: Math.max(0, currentCompletedStages - completedRollback),
    isComplete: false,
  };
}

export function getAdaptiveProgress(session) {
  const completed = Math.max(0, session?.completedStages || 0);
  const total = Math.max(1, session?.totalStages || 0);

  return {
    current: Math.min(completed + 1, total),
    total,
    completed,
  };
}
