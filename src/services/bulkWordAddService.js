import { getVocabularyWordKey } from '../utils/vocabularyCapture';
import { getWordFolderIds } from '../utils/appDataTransforms';

const BULK_WORD_CHUNK_SIZE = 6;

const normalizeFolderId = (folderId) => {
  if (folderId === null || folderId === undefined || folderId === '') return null;
  const numericFolderId = Number(folderId);
  return Number.isNaN(numericFolderId) ? null : numericFolderId;
};

const normalizeGloss = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || null;
};

/**
 * 큐 항목은 문자열이거나 `{ word, meaning_ko }` 다.
 * 파일 가져오기는 파일에 적힌 뜻을 같이 넘기고, 그 뜻이 AI 결과의 meaning_ko 를 덮어쓴다.
 * 같은 단어가 두 번 오면 먼저 온 것을 지키되, 뜻이 비어 있으면 뒤의 뜻을 채운다.
 */
export const normalizeBulkWordEntries = (items) => {
  const entriesByKey = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const rawWord = item && typeof item === 'object' ? item.word : item;
    const word = String(rawWord || '').trim();
    if (!word) continue;
    const meaningKo = item && typeof item === 'object' ? normalizeGloss(item.meaning_ko) : null;
    const key = word.toLowerCase();
    const existing = entriesByKey.get(key);
    if (existing) {
      if (!existing.meaning_ko && meaningKo) existing.meaning_ko = meaningKo;
      continue;
    }
    entriesByKey.set(key, { word, meaning_ko: meaningKo });
  }
  return [...entriesByKey.values()];
};

export const normalizeBulkWordQueue = (items) =>
  normalizeBulkWordEntries(items).map((entry) => entry.word);

const normalizeTextValue = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeTextList = (values) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeTextValue(value))
    .filter(Boolean);
};

const normalizeExamples = (examples) => {
  if (!Array.isArray(examples)) return [];
  return examples
    .map((example) => ({
      en: normalizeTextValue(example?.en),
      ko: normalizeTextValue(example?.ko),
    }))
    .filter((example) => example.en && example.ko);
};

const buildBulkWordPayload = (analysisResult, fallbackWord, folderId, gloss = null) => ({
  ...analysisResult,
  word: normalizeTextValue(analysisResult?.word) || fallbackWord,
  // 사용자가 가져온 파일에 뜻이 있으면 그 뜻이 카드 제목이자 퀴즈 정답이다.
  meaning_ko: gloss || normalizeTextValue(analysisResult?.meaning_ko),
  pronunciation: normalizeTextValue(analysisResult?.pronunciation),
  pos: normalizeTextValue(analysisResult?.pos),
  definitions: normalizeTextList(analysisResult?.definitions),
  definitions_ko: normalizeTextList(analysisResult?.definitions_ko),
  examples: normalizeExamples(analysisResult?.examples),
  synonyms: normalizeTextList(analysisResult?.synonyms),
  nuance: normalizeTextValue(analysisResult?.nuance),
  folder_id: folderId,
  folder_ids: folderId === null ? [] : [folderId],
});

const shouldRetryWordSave = (error) => (
  error?.status === 422 ||
  /validation|unprocessable|must not contain empty values/i.test(error?.message || '')
);

export async function runBulkWordAdd({
  activeAiConfig,
  chunkSize = BULK_WORD_CHUNK_SIZE,
  createWord,
  existingWords,
  folderId,
  generateBulkWordData,
  generateWordData,
  onProgress,
  onWordSaved,
  updateWord,
  words: queuedWords,
}) {
  const normalizedEntries = normalizeBulkWordEntries(queuedWords);
  const normalizedWords = normalizedEntries.map((entry) => entry.word);
  if (normalizedWords.length === 0) throw new Error('저장할 단어를 입력해 주세요.');

  const glossByKey = new Map(
    normalizedEntries
      .filter((entry) => entry.meaning_ko)
      .map((entry) => [getVocabularyWordKey(entry.word), entry.meaning_ko])
  );
  const glossFor = (word) => glossByKey.get(getVocabularyWordKey(word)) || null;
  const glossesFor = (chunk) =>
    Object.fromEntries(chunk.filter((word) => glossFor(word)).map((word) => [word, glossFor(word)]));

  const targetFolderId = normalizeFolderId(folderId);
  const createdWords = [];
  const assignedWords = [];
  const skippedWords = [];
  const failedWords = [];
  const completedCount = () => createdWords.length + assignedWords.length + skippedWords.length;

  const reportProgress = (phase, currentWord) => {
    onProgress?.({
      phase,
      completed: completedCount(),
      total: normalizedWords.length,
      currentWord,
    });
  };

  const existingWordsByKey = new Map(
    existingWords.map((word) => [getVocabularyWordKey(word.word), word])
  );
  const wordsToCreate = [];

  const assignExistingWordToFolder = async (existingWord) => {
    if (targetFolderId === null) {
      skippedWords.push(existingWord);
      return null;
    }
    const currentFolderIds = getWordFolderIds(existingWord);
    if (currentFolderIds.includes(targetFolderId)) {
      skippedWords.push(existingWord);
      return null;
    }
    const updatedWord = await updateWord(existingWord.id, {
      folder_ids: [...currentFolderIds, targetFolderId],
    });
    const savedWord = onWordSaved?.(updatedWord) ?? updatedWord;
    assignedWords.push(savedWord);
    return savedWord;
  };

  for (const word of normalizedWords) {
    const existingWord = existingWordsByKey.get(getVocabularyWordKey(word));
    if (!existingWord) {
      wordsToCreate.push(word);
      continue;
    }

    reportProgress('saving', word);

    try {
      await assignExistingWordToFolder(existingWord);
    } catch (error) {
      console.error('Bulk word folder assignment failed:', word, error);
      failedWords.push({ word, error });
    }
  }

  const generateWordForRetry = async (word) => {
    reportProgress('retrying', word);
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await generateWordData(word, activeAiConfig, { gloss: glossFor(word) });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const saveWordWithRetry = async (analysisResult, requestedWord) => {
    const gloss = glossFor(requestedWord);
    const firstPayload = buildBulkWordPayload(analysisResult, requestedWord, targetFolderId, gloss);
    try {
      return await createWord(firstPayload);
    } catch (error) {
      if (!shouldRetryWordSave(error)) throw error;
      const retriedAnalysis = await generateWordForRetry(requestedWord);
      const retryPayload = buildBulkWordPayload(retriedAnalysis, requestedWord, targetFolderId, gloss);
      return createWord(retryPayload);
    }
  };

  const generateChunk = async (chunk) => {
    try {
      return await generateBulkWordData(chunk, activeAiConfig, { glosses: glossesFor(chunk) });
    } catch (error) {
      console.error('Bulk word generation failed; retrying words one by one:', error);
      const fallbackResults = [];
      for (const word of chunk) {
        try {
          fallbackResults.push(await generateWordForRetry(word));
        } catch (wordError) {
          failedWords.push({ word, error: wordError });
        }
      }
      return fallbackResults;
    }
  };

  for (let index = 0; index < wordsToCreate.length; index += chunkSize) {
    const chunk = wordsToCreate.slice(index, index + chunkSize);
    reportProgress('analyzing', chunk[0]);

    const analysisResults = await generateChunk(chunk);
    reportProgress('saving', chunk[0]);

    for (const requestedWord of chunk) {
      const analysisResult = analysisResults.find((item) =>
        String(item?.word || '').trim().toLowerCase() === requestedWord.toLowerCase()
      );
      if (!analysisResult) continue;
      reportProgress('saving', requestedWord);
      try {
        const savedWord = await saveWordWithRetry(analysisResult, requestedWord);
        createdWords.push(onWordSaved?.(savedWord) ?? savedWord);
      } catch (error) {
        console.error('Bulk word save failed after retry:', requestedWord, error);
        failedWords.push({ word: requestedWord, error });
      }
    }
  }

  onProgress?.({
    phase: 'done',
    completed: completedCount(),
    total: normalizedWords.length,
    currentWord: '',
  });

  return {
    assignedWords,
    createdWords,
    failedWords,
    skippedWords,
    processedWords: [...assignedWords, ...createdWords],
  };
}
