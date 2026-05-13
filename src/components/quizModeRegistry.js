export const TOEFL_MODE_TITLES = {
  'toefl-complete': 'Complete the Words',
  'toefl-build': 'Build a Sentence',
  'toefl-daily-life': 'Read in Daily Life',
  'toefl-academic-passage': 'Read an Academic Passage',
  'toefl-reading-mock': 'TOEFL Reading Mock Test',
  'toefl-writing-email': 'Write an Email',
  'toefl-writing-discussion': 'Write for an Academic Discussion',
  'toefl-writing-mock': 'TOEFL Writing Mock Test',
};

export const getReadingTaskType = (modeId) => {
  if (modeId === 'toefl-daily-life') return 'daily-life';
  if (modeId === 'toefl-academic-passage') return 'academic-passage';
  return null;
};

export const getWritingTaskType = (modeId) => {
  if (modeId === 'toefl-writing-email') return 'email';
  if (modeId === 'toefl-writing-discussion') return 'academic-discussion';
  return null;
};
