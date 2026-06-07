const ENGLISH_WORD_RE = /[A-Za-z]+(?:[-'][A-Za-z]+)*/g;

export const normalizeCapturedWord = (value) => {
  if (!value) return '';
  const normalized = String(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
  const matches = normalized.match(ENGLISH_WORD_RE);
  if (!matches || matches.length === 0) return '';
  return matches[0].toLowerCase();
};

export const getVocabularyWordKey = (value) => normalizeCapturedWord(value).toLowerCase();

export const tokenizeVocabularyText = (value) => {
  const text = String(value || '');
  if (!text) return [];

  const tokens = [];
  const matcher = new RegExp(ENGLISH_WORD_RE.source, 'g');
  let lastIndex = 0;
  let match;

  while ((match = matcher.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    tokens.push({
      type: 'word',
      value: match[0],
      key: getVocabularyWordKey(match[0]),
      start: match.index,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
};

export const buildVocabularyPayload = (wordData, fallbackWord, context = {}) => {
  const word = wordData?.word || fallbackWord;
  const examples = Array.isArray(wordData?.examples) ? [...wordData.examples] : [];
  const contextText = typeof context.contextText === 'string' ? context.contextText.trim() : '';

  if (contextText) {
    const trimmedContext = contextText.length > 240 ? `${contextText.slice(0, 237)}...` : contextText;
    const alreadyIncluded = examples.some((example) => example?.en === trimmedContext);
    if (!alreadyIncluded) {
      examples.unshift({
        en: trimmedContext,
        ko: 'TOEFL Reading에서 저장한 문맥',
      });
    }
  }

  const sourceLabel = context.sourceLabel || 'TOEFL Reading';
  const nuanceParts = [wordData?.nuance, `${sourceLabel} 중 저장한 단어입니다.`].filter(Boolean);

  return {
    word,
    meaning_ko: wordData?.meaning_ko ?? null,
    pronunciation: wordData?.pronunciation ?? null,
    pos: wordData?.pos ?? null,
    definitions: Array.isArray(wordData?.definitions) ? wordData.definitions : [],
    definitions_ko: Array.isArray(wordData?.definitions_ko) ? wordData.definitions_ko : [],
    examples,
    synonyms: Array.isArray(wordData?.synonyms) ? wordData.synonyms : [],
    nuance: nuanceParts.join('\n'),
    folder_id: null,
    folder_ids: [],
    learning_rate: 0,
    status: 'new',
    stats: { wrong_count: 0, review_count: 0 },
  };
};
