export const ADAPTIVE_MODE_ORDER = ['multiple', 'short', 'complete-word'];
const DEFAULT_SET_SIZE = 5;

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

function clampSetSize(setSize, wordCount) {
  const n = Number(setSize);
  if (!Number.isFinite(n)) return Math.min(DEFAULT_SET_SIZE, Math.max(1, wordCount));
  return Math.max(1, Math.min(Math.round(n), Math.max(1, wordCount)));
}

function chunkWords(words, setSize) {
  const chunks = [];
  for (let i = 0; i < words.length; i += setSize) {
    chunks.push(words.slice(i, i + setSize));
  }
  return chunks;
}

function lightlyRandomize(tasks, rng = Math.random, probability = 0.25) {
  const next = [...tasks];
  for (let i = 0; i < next.length - 1; i += 1) {
    if (rng() < probability) {
      const tmp = next[i];
      next[i] = next[i + 1];
      next[i + 1] = tmp;
      i += 1;
    }
  }
  return next;
}

function insertAt(items, index, item) {
  return [
    ...items.slice(0, index),
    item,
    ...items.slice(index),
  ];
}

function getProgressedTaskInsertionIndex(queue, nextTask, session) {
  if (!session?.randomize) return queue.length;

  const rng = session.rng || Math.random;
  let earliestIndex = 0;

  if (nextTask.stageIndex > 1) {
    const lowerStageToClear = nextTask.stageIndex - 1;
    queue.forEach((task, index) => {
      if ((task.stageIndex || 0) < lowerStageToClear) {
        earliestIndex = index + 1;
      }
    });
  }

  const availableSlots = queue.length - earliestIndex + 1;
  return earliestIndex + Math.floor(rng() * availableSlots);
}

function getMissedTaskInsertionIndex(queue, session) {
  if (queue.length === 0) return 0;
  if (!session?.randomize) return queue.length;

  const rng = session.rng || Math.random;
  const earliestIndex = Math.min(2, queue.length);
  const availableSlots = queue.length - earliestIndex + 1;
  return earliestIndex + Math.floor(rng() * availableSlots);
}

function buildStudySetQueue(setWords = [], modes = ADAPTIVE_MODE_ORDER, options = {}) {
  const selectedModes = normalizeAdaptiveModes(modes);
  const tasks = setWords.map((word) => ({
    word,
    mode: selectedModes[0],
    stageIndex: 0,
    wrongStreak: 0,
  }));

  if (!options.randomize) return tasks;
  return lightlyRandomize(tasks, options.rng, options.randomizeProbability);
}

function buildSetState(session, setIndex) {
  const currentSetWords = session.studySets[setIndex] || [];
  const queue = buildStudySetQueue(currentSetWords, session.modes, {
    randomize: session.randomize,
    rng: session.rng,
    randomizeProbability: session.randomizeProbability,
  });

  return {
    ...session,
    currentSetIndex: setIndex,
    currentSetWords,
    queue,
    totalStages: currentSetWords.length * session.modes.length,
    completedStages: 0,
    isSetComplete: currentSetWords.length === 0,
    isComplete: currentSetWords.length === 0 && setIndex >= session.totalSets - 1,
  };
}

export function createAdaptiveSession(words = [], modes = ADAPTIVE_MODE_ORDER, options = {}) {
  const selectedModes = normalizeAdaptiveModes(modes);
  const setSize = clampSetSize(options.setSize ?? DEFAULT_SET_SIZE, words.length);
  const studySets = chunkWords(words, setSize);
  const baseSession = {
    modes: selectedModes,
    setSize,
    studySets,
    totalSets: studySets.length,
    currentSetIndex: 0,
    currentSetWords: studySets[0] || [],
    randomize: options.randomize === true,
    rng: options.rng,
    randomizeProbability: options.randomizeProbability,
    totalStages: 0,
    queue: [],
    completedStages: 0,
    isComplete: words.length === 0,
    isSetComplete: words.length === 0,
  };

  if (words.length === 0) return baseSession;
  return buildSetState(baseSession, 0);
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
        ? {
          word: currentTask.word,
          mode: modes[nextStageIndex],
          stageIndex: nextStageIndex,
          wrongStreak: 0,
        }
        : null;
    const nextQueue = nextTask
      ? insertAt(
        remainingQueue,
        getProgressedTaskInsertionIndex(remainingQueue, nextTask, session),
        nextTask
      )
      : remainingQueue;
    const setDone = nextQueue.length === 0;
    const allDone = setDone && (session.currentSetIndex || 0) >= (session.totalSets || 1) - 1;

    return {
      ...session,
      modes,
      totalStages: session.totalStages,
      queue: nextQueue,
      completedStages: nextCompletedStages,
      isSetComplete: setDone && !allDone,
      isComplete: allDone,
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
    mode: modes[nextStageIndex],
    stageIndex: nextStageIndex,
    wrongStreak: shouldStepDown ? 0 : nextWrongStreak,
  };

  return {
    ...session,
    modes,
    totalStages: session.totalStages,
    queue: insertAt(
      remainingQueue,
      getMissedTaskInsertionIndex(remainingQueue, session),
      nextTask
    ),
    completedStages: Math.max(0, currentCompletedStages - completedRollback),
    isSetComplete: false,
    isComplete: false,
  };
}

export function startNextAdaptiveSet(session) {
  if (!session?.isSetComplete) return session;
  const nextSetIndex = (session.currentSetIndex || 0) + 1;
  if (nextSetIndex >= (session.totalSets || 0)) {
    return { ...session, isSetComplete: false, isComplete: true, queue: [] };
  }
  return buildSetState({ ...session, isSetComplete: false }, nextSetIndex);
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
