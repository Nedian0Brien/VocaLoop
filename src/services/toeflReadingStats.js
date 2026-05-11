const STORAGE_KEY = 'vocaloop_toefl_reading_stats_v1';

const emptyBucket = () => ({ correct: 0, total: 0 });

const emptyStats = () => ({
  version: 1,
  totals: emptyBucket(),
  byTask: {},
  byTopic: {},
  bySkill: {},
  recent: [],
});

const isBrowser = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const normalizeBucket = (bucket) => ({
  correct: Number.isFinite(Number(bucket?.correct)) ? Number(bucket.correct) : 0,
  total: Number.isFinite(Number(bucket?.total)) ? Number(bucket.total) : 0,
});

const normalizeMap = (value) => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, bucket]) => [key, normalizeBucket(bucket)])
  );
};

export const readToeflReadingStats = () => {
  if (!isBrowser()) return emptyStats();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw);
    return {
      version: 1,
      totals: normalizeBucket(parsed?.totals),
      byTask: normalizeMap(parsed?.byTask),
      byTopic: normalizeMap(parsed?.byTopic),
      bySkill: normalizeMap(parsed?.bySkill),
      recent: Array.isArray(parsed?.recent) ? parsed.recent.slice(0, 20) : [],
    };
  } catch {
    return emptyStats();
  }
};

const writeStats = (stats) => {
  if (!isBrowser()) return stats;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
};

const addToBucket = (bucket, correct, total) => ({
  correct: bucket.correct + correct,
  total: bucket.total + total,
});

const addToMapBucket = (map, key, correct, total) => {
  if (!key) return map;
  return {
    ...map,
    [key]: addToBucket(map[key] || emptyBucket(), correct, total),
  };
};

export const recordToeflReadingAttempt = ({ taskType, topicTags = [], results = [] }) => {
  const stats = readToeflReadingStats();
  const normalizedResults = Array.isArray(results) ? results : [];
  const correct = normalizedResults.filter((result) => Boolean(result?.correct)).length;
  const total = normalizedResults.length;
  if (!taskType || total === 0) return stats;

  let bySkill = stats.bySkill;
  normalizedResults.forEach((result) => {
    bySkill = addToMapBucket(bySkill, result?.skillTag || 'general-reading', result?.correct ? 1 : 0, 1);
  });

  let byTopic = stats.byTopic;
  const topics = Array.isArray(topicTags) && topicTags.length > 0 ? topicTags : ['general'];
  topics.forEach((topic) => {
    byTopic = addToMapBucket(byTopic, topic, correct, total);
  });

  return writeStats({
    ...stats,
    totals: addToBucket(stats.totals, correct, total),
    byTask: addToMapBucket(stats.byTask, taskType, correct, total),
    byTopic,
    bySkill,
    recent: [
      { taskType, correct, total, topicTags: topics, createdAt: new Date().toISOString() },
      ...stats.recent,
    ].slice(0, 20),
  });
};

export const clearToeflReadingStats = () => {
  if (isBrowser()) localStorage.removeItem(STORAGE_KEY);
};

const accuracyFor = (bucket) => {
  const total = Number(bucket?.total) || 0;
  if (total === 0) return 0;
  return Math.round(((Number(bucket?.correct) || 0) / total) * 100);
};

const weakestEntry = (map) => {
  const entries = Object.entries(map || {}).filter(([, bucket]) => (bucket?.total || 0) > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => accuracyFor(a[1]) - accuracyFor(b[1]) || b[1].total - a[1].total);
  const [id, bucket] = entries[0];
  return { id, ...bucket, accuracy: accuracyFor(bucket) };
};

export const summarizeToeflReadingStats = (stats = readToeflReadingStats()) => {
  const weakestTask = weakestEntry(stats.byTask);
  return {
    accuracy: accuracyFor(stats.totals),
    total: stats.totals.total,
    correct: stats.totals.correct,
    weakestTask,
    weakestTopic: weakestEntry(stats.byTopic),
    weakestSkill: weakestEntry(stats.bySkill),
    nextTaskId: weakestTask?.id || 'daily-life',
  };
};
