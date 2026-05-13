import { callAiModel, parseJsonOutput } from '../aiModelService';

export const requestAiJson = async (prompt, aiConfig) => {
  const text = await callAiModel({ ...aiConfig, prompt, jsonOutput: true });
  return parseJsonOutput(text);
};

export const buildRandomNonce = () => {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${stamp}-${rand}`;
};

export const formatVocabularyWordsBlock = (vocabularyWords) => {
  if (!Array.isArray(vocabularyWords) || vocabularyWords.length === 0) return '';
  const lines = vocabularyWords
    .filter((word) => word && typeof word.word === 'string' && word.word.trim().length > 0)
    .slice(0, 40)
    .map((word) => {
      const meaning = word.meaning_ko ? ` (한글 뜻: ${word.meaning_ko})` : '';
      const pos = word.pos ? ` [${word.pos}]` : '';
      return `- ${word.word}${pos}${meaning}`;
    });
  if (lines.length === 0) return '';
  return `
LEARNER VOCABULARY (use as many of these as possible — they are the priority for this practice set):
${lines.join('\n')}
`;
};

export const formatTopicsBlock = (pickedTopics) => {
  if (!Array.isArray(pickedTopics) || pickedTopics.length === 0) return '';
  const lines = pickedTopics
    .filter((topic) => topic && typeof topic.label === 'string' && topic.label.trim())
    .map((topic) => `- ${topic.label}${topic.description ? ` — ${topic.description}` : ''}`);
  if (lines.length === 0) return '';
  return `
TOPIC FOCUS (write the passage so it clearly belongs to one or more of these academic fields):
${lines.join('\n')}
`;
};

export const clampScore = (score, min, max) => {
  const n = Number(score);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};
