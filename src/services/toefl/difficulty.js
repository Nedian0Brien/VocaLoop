export const TOEFL_DIFFICULTY_LEVELS = [
  {
    id: 'beginner',
    label: 'Beginner',
    caption: '짧고 명확한 지문',
    prompt: 'Difficulty level: beginner. Use clear, short contexts, direct wording, and mostly literal questions.',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    caption: '표준 연습 난이도',
    prompt: 'Difficulty level: intermediate. Use standard TOEFL-like contexts with moderate vocabulary and a balanced mix of detail and inference.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    caption: '추론과 밀도 강화',
    prompt: 'Difficulty level: advanced. Use denser language and harder inference, rhetoric, and vocabulary-in-context questions without making the task convoluted.',
  },
];

const LEVEL_BY_ID = Object.fromEntries(TOEFL_DIFFICULTY_LEVELS.map((level) => [level.id, level]));

export const normalizeToeflDifficulty = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (LEVEL_BY_ID[normalized]) return normalized;
  }

  const score = Number(value);
  if (Number.isFinite(score)) {
    if (score >= 105) return 'advanced';
    if (score >= 80) return 'intermediate';
  }
  return 'beginner';
};

export const getToeflDifficulty = (value) => LEVEL_BY_ID[normalizeToeflDifficulty(value)] || LEVEL_BY_ID.beginner;

export const formatToeflDifficultyLabel = (value) => getToeflDifficulty(value).label;

export const getToeflDifficultyPrompt = (value) => getToeflDifficulty(value).prompt;
