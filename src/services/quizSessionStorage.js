export const QUIZ_HISTORY_STORAGE_KEY = 'vocaloop_quiz_history';
export const QUIZ_SESSION_STORAGE_KEY = 'vocaloop_quiz_session';

const RESTORABLE_MODE_IDS = new Set(['multiple', 'short', 'mixed']);

const getStorage = (storage) => storage || globalThis.localStorage;

export const loadPersistedQuizSession = ({ quizModeById = {}, storage } = {}) => {
  try {
    const targetStorage = getStorage(storage);
    const raw = targetStorage.getItem(QUIZ_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.quizState !== 'quiz') return null;
    if (!RESTORABLE_MODE_IDS.has(data.modeId) || !quizModeById[data.modeId]) return null;

    const valid = data.modeId === 'mixed'
      ? Boolean(data.adaptiveSession) && !data.adaptiveSession.isComplete
      : Array.isArray(data.queue) && data.queue.length > 0;
    if (!valid) return null;

    return data;
  } catch (error) {
    console.warn('Failed to read saved quiz session', error);
    return null;
  }
};

export const persistQuizSession = ({
  adaptiveSession,
  aiMode,
  currentIndex,
  modeId,
  queue,
  quizState,
  soundEnabled,
  stats,
  studySetSummaries,
  wordQuizTracker,
}, { storage } = {}) => {
  const targetStorage = getStorage(storage);
  if (quizState !== 'quiz' || !RESTORABLE_MODE_IDS.has(modeId)) {
    targetStorage.removeItem(QUIZ_SESSION_STORAGE_KEY);
    return;
  }
  try {
    targetStorage.setItem(
      QUIZ_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        quizState,
        modeId,
        queue,
        currentIndex,
        adaptiveSession,
        studySetSummaries,
        stats,
        wordQuizTracker,
        soundEnabled,
        aiMode,
      })
    );
  } catch (error) {
    console.warn('Failed to persist quiz session', error);
  }
};

export const recordToeflAssetActivity = (asset, { modeTitles = {}, storage } = {}) => {
  if (!asset?.id) return;
  try {
    const targetStorage = getStorage(storage);
    const history = JSON.parse(targetStorage.getItem(QUIZ_HISTORY_STORAGE_KEY) || '[]');
    const entry = {
      type: 'toefl-asset',
      date: asset.createdAt || asset.created_at || new Date().toISOString(),
      assetId: asset.id,
      mode: modeTitles[asset.mode] || asset.title || 'TOEFL Practice',
      modeId: asset.mode,
      taskType: asset.taskType || asset.task_type,
      title: asset.title || modeTitles[asset.mode] || 'TOEFL Practice',
    };
    const withoutDuplicate = Array.isArray(history)
      ? history.filter((item) => !(item?.type === 'toefl-asset' && item?.assetId === asset.id))
      : [];
    targetStorage.setItem(QUIZ_HISTORY_STORAGE_KEY, JSON.stringify([entry, ...withoutDuplicate].slice(0, 20)));
  } catch (error) {
    console.warn('Failed to save TOEFL asset activity', error);
  }
};
