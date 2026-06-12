import { getVocabularyWordKey } from '../utils/vocabularyCapture';
import { getWordFolderIds } from '../utils/appDataTransforms';

const BULK_WORD_CHUNK_SIZE = 6;

const normalizeFolderId = (folderId) => {
  if (folderId === null || folderId === undefined || folderId === '') return null;
  const numericFolderId = Number(folderId);
  return Number.isNaN(numericFolderId) ? null : numericFolderId;
};

export const normalizeBulkWordQueue = (items) => {
  const seen = new Set();
  return items
    .map((word) => String(word || '').trim())
    .filter((word) => {
      if (!word) return false;
      const key = word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

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

const buildBulkWordPayload = (analysisResult, fallbackWord, folderId) => ({
  ...analysisResult,
  word: normalizeTextValue(analysisResult?.word) || fallbackWord,
  meaning_ko: normalizeTextValue(analysisResult?.meaning_ko),
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
  const normalizedWords = normalizeBulkWordQueue(queuedWords);
  if (normalizedWords.length === 0) throw new Error('저장할 단어를 입력해 주세요.');

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
        return await generateWordData(word, activeAiConfig);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const saveWordWithRetry = async (analysisResult, requestedWord) => {
    const firstPayload = buildBulkWordPayload(analysisResult, requestedWord, targetFolderId);
    try {
      return await createWord(firstPayload);
    } catch (error) {
      if (!shouldRetryWordSave(error)) throw error;
      const retriedAnalysis = await generateWordForRetry(requestedWord);
      const retryPayload = buildBulkWordPayload(retriedAnalysis, requestedWord, targetFolderId);
      return createWord(retryPayload);
    }
  };

  const generateChunk = async (chunk) => {
    try {
      return await generateBulkWordData(chunk, activeAiConfig);
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
