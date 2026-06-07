import { useEffect, useState } from 'react';
import { generateBulkWordData, generateWordData } from '../services/geminiService';
import { hasAiProviderAccess } from '../services/aiModelService';
import { createWord, deleteWord, updateWord } from '../services/wordApi';
import {
  buildVocabularyPayload,
  getVocabularyWordKey,
  normalizeCapturedWord,
} from '../utils/vocabularyCapture';
import { getWordFolderIds, normalizeWord, sortWordsByNewest } from '../utils/appDataTransforms';

const BULK_WORD_CHUNK_SIZE = 6;

const normalizeFolderId = (folderId) => {
  if (folderId === null || folderId === undefined || folderId === '') return null;
  const numericFolderId = Number(folderId);
  return Number.isNaN(numericFolderId) ? null : numericFolderId;
};

const normalizeBulkWordQueue = (items) => {
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

export function useVocabularyCommands({
  activeAiConfig,
  activeAiProvider,
  folders,
  inputWord,
  selectedFolderId,
  setInputWord,
  setIsWordSuggestOpen,
  setWords,
  showNotification,
  user,
  words,
}) {
  const [addToFolderId, setAddToFolderId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bulkAddProgress, setBulkAddProgress] = useState(null);

  useEffect(() => {
    setAddToFolderId(selectedFolderId);
  }, [selectedFolderId]);

  const upsertWordInState = (word) => {
    const normalizedWord = normalizeWord(word);
    setWords((prev) => sortWordsByNewest([...prev.filter((it) => it.id !== normalizedWord.id), normalizedWord]));
    return normalizedWord;
  };

  const removeWordFromState = (wordId) =>
    setWords((prev) => prev.filter((it) => it.id !== wordId));

  const resetAddToFolder = () => setAddToFolderId(null);
  const clearAddToFolderIfFolder = (folderId) =>
    setAddToFolderId((current) => (current === folderId ? null : current));
  const activeAiProviderNeedsKey = !hasAiProviderAccess(activeAiConfig);
  const activeAiProviderAccessError = `${activeAiProvider.name} API Key가 필요합니다. 계정 설정에서 키를 등록해 주세요.`;

  const handleAddWord = async (event) => {
    event.preventDefault();
    if (!inputWord.trim() || !user) return;
    setIsWordSuggestOpen(false);
    if (activeAiProviderNeedsKey) {
      showNotification(activeAiProviderAccessError, 'error');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysisResult = await generateWordData(inputWord, activeAiConfig);
      const folderId = addToFolderId === null || addToFolderId === undefined || addToFolderId === ''
        ? null
        : Number(addToFolderId);
      const createdWord = await createWord({
        ...analysisResult,
        folder_id: Number.isNaN(folderId) ? null : folderId,
        folder_ids: Number.isNaN(folderId) || folderId === null ? [] : [folderId],
      });
      upsertWordInState(createdWord);

      setInputWord('');
      const folderName = Number.isNaN(folderId) || folderId === null
        ? null
        : folders.find((folder) => folder.id === folderId)?.name;
      showNotification(`'${analysisResult.word}' ${folderName ? `→ ${folderName}` : ''} 추가 완료!`);
    } catch (error) {
      console.error('Add Word Error:', error);
      showNotification(error.message.includes('403') ? 'API Key Invalid or Expired' : 'Analysis failed: ' + error.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveVocabularyWord = async (rawWord, context = {}) => {
    if (!user) throw new Error('로그인이 필요합니다.');
    const capturedWord = normalizeCapturedWord(rawWord);
    if (!capturedWord) throw new Error('저장할 단어를 찾을 수 없습니다.');

    const existingWord = words.find((word) => getVocabularyWordKey(word.word) === capturedWord);
    if (existingWord) {
      showNotification(`'${existingWord.word}'는 이미 단어장에 있습니다.`);
      return existingWord;
    }

    if (activeAiProviderNeedsKey) {
      throw new Error(activeAiProviderAccessError);
    }

    const analysisResult = await generateWordData(capturedWord, activeAiConfig);
    const createdWord = await createWord(buildVocabularyPayload(analysisResult, capturedWord, context));
    const normalizedWord = upsertWordInState(createdWord);
    showNotification(`'${normalizedWord.word}' 단어장에 저장했습니다.`);
    return normalizedWord;
  };

  const handleBulkAddWords = async ({ words: queuedWords, folderId }) => {
    if (!user) throw new Error('로그인이 필요합니다.');
    const normalizedWords = normalizeBulkWordQueue(queuedWords);
    if (normalizedWords.length === 0) throw new Error('저장할 단어를 입력해 주세요.');

    if (activeAiProviderNeedsKey) {
      showNotification(activeAiProviderAccessError, 'error');
      throw new Error(activeAiProviderAccessError);
    }

    const targetFolderId = normalizeFolderId(folderId);
    const createdWords = [];
    const assignedWords = [];
    const skippedWords = [];
    const failedWords = [];
    const completedCount = () => createdWords.length + assignedWords.length + skippedWords.length;

    const existingWordsByKey = new Map(
      words.map((word) => [getVocabularyWordKey(word.word), word])
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
      const normalizedWord = upsertWordInState(updatedWord);
      assignedWords.push(normalizedWord);
      return normalizedWord;
    };

    for (const word of normalizedWords) {
      const existingWord = existingWordsByKey.get(getVocabularyWordKey(word));
      if (!existingWord) {
        wordsToCreate.push(word);
        continue;
      }

      setBulkAddProgress({
        phase: 'saving',
        completed: completedCount(),
        total: normalizedWords.length,
        currentWord: word,
      });

      try {
        await assignExistingWordToFolder(existingWord);
      } catch (error) {
        console.error('Bulk word folder assignment failed:', word, error);
        failedWords.push({ word, error });
      }
    }

    const generateWordForRetry = async (word) => {
      setBulkAddProgress({
        phase: 'retrying',
        completed: completedCount(),
        total: normalizedWords.length,
        currentWord: word,
      });
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

    try {
      for (let index = 0; index < wordsToCreate.length; index += BULK_WORD_CHUNK_SIZE) {
        const chunk = wordsToCreate.slice(index, index + BULK_WORD_CHUNK_SIZE);
        setBulkAddProgress({
          phase: 'analyzing',
          completed: completedCount(),
          total: normalizedWords.length,
          currentWord: chunk[0],
        });

        const analysisResults = await generateChunk(chunk);
        setBulkAddProgress({
          phase: 'saving',
          completed: completedCount(),
          total: normalizedWords.length,
          currentWord: chunk[0],
        });

        for (const requestedWord of chunk) {
          const analysisResult = analysisResults.find((item) =>
            String(item?.word || '').trim().toLowerCase() === requestedWord.toLowerCase()
          );
          if (!analysisResult) continue;
          setBulkAddProgress({
            phase: 'saving',
            completed: completedCount(),
            total: normalizedWords.length,
            currentWord: requestedWord,
          });
          try {
            const savedWord = await saveWordWithRetry(analysisResult, requestedWord);
            createdWords.push(upsertWordInState(savedWord));
          } catch (error) {
            console.error('Bulk word save failed after retry:', requestedWord, error);
            failedWords.push({ word: requestedWord, error });
          }
        }
      }

      setBulkAddProgress({
        phase: 'done',
        completed: completedCount(),
        total: normalizedWords.length,
        currentWord: '',
      });
      if (failedWords.length > 0) {
        const message = `${createdWords.length + assignedWords.length}개 처리, ${failedWords.length}개 실패`;
        showNotification(message, 'error');
        if (createdWords.length + assignedWords.length === 0) {
          throw new Error(message);
        }
        return [...assignedWords, ...createdWords];
      }
      const messageParts = [];
      if (createdWords.length > 0) messageParts.push(`${createdWords.length}개 저장`);
      if (assignedWords.length > 0) messageParts.push(`${assignedWords.length}개 폴더 추가`);
      if (skippedWords.length > 0) messageParts.push(`${skippedWords.length}개 중복 스킵`);
      showNotification(
        assignedWords.length === 0 && skippedWords.length === 0
          ? `${createdWords.length}개 단어를 저장했습니다.`
          : messageParts.join(', ') || '저장할 새 단어가 없습니다.'
      );
      return [...assignedWords, ...createdWords];
    } catch (error) {
      console.error('Bulk Add Word Error:', error);
      showNotification('대량 추가 실패: ' + error.message, 'error');
      throw error;
    } finally {
      setBulkAddProgress(null);
    }
  };

  const handleExplainVocabularyWord = async (rawWord) => {
    if (!user) throw new Error('로그인이 필요합니다.');
    const capturedWord = normalizeCapturedWord(rawWord);
    if (!capturedWord) throw new Error('설명할 단어를 찾을 수 없습니다.');
    if (activeAiProviderNeedsKey) {
      throw new Error(activeAiProviderAccessError);
    }

    const existingWord = words.find((word) => getVocabularyWordKey(word.word) === capturedWord);
    if (existingWord) return existingWord;
    return generateWordData(capturedWord, activeAiConfig);
  };

  const handleDeleteWord = async (wordId) => {
    if (!window.confirm('Delete this word?') || !user) return;
    try {
      await deleteWord(wordId);
      removeWordFromState(wordId);
      showNotification('Word deleted.');
    } catch (error) {
      console.error('Delete failed', error);
      showNotification('Failed to delete word: ' + error.message, 'error');
    }
  };

  const handleMoveWord = async (wordId, targetFolderId) => {
    if (!user) return;
    try {
      const updatedWord = await updateWord(wordId, { folder_id: targetFolderId || null });
      upsertWordInState(updatedWord);
    } catch (error) {
      showNotification('단어 이동 실패: ' + error.message, 'error');
    }
  };

  const handleRegenerateWord = async (wordId) => {
    if (!user) return;
    if (activeAiProviderNeedsKey) {
      showNotification(activeAiProviderAccessError, 'error');
      return;
    }

    const existingWord = words.find((word) => word.id === wordId);
    if (!existingWord) {
      showNotification('단어를 찾을 수 없습니다.', 'error');
      return;
    }

    try {
      const newWordData = await generateWordData(existingWord.word, activeAiConfig);
      const updatedWord = await updateWord(wordId, {
        meaning_ko: newWordData.meaning_ko,
        pronunciation: newWordData.pronunciation,
        pos: newWordData.pos,
        definitions: newWordData.definitions,
        definitions_ko: newWordData.definitions_ko,
        examples: newWordData.examples,
        synonyms: newWordData.synonyms,
        nuance: newWordData.nuance,
      });
      upsertWordInState(updatedWord);
    } catch (error) {
      console.error('Regenerate Word Error:', error);
      showNotification(
        error.message.includes('403') ? 'API Key Invalid or Expired' : '재생성 실패: ' + error.message,
        'error',
      );
    }
  };

  const handleUpdateLearningRate = async (wordId, newRate, statsUpdate = {}) => {
    if (!user) return;
    try {
      const currentWord = words.find((word) => word.id === wordId);
      const updatedWord = await updateWord(wordId, {
        learning_rate: Math.max(0, Math.min(100, Math.round(newRate))),
        stats: {
          wrong_count: statsUpdate.wrong_count ?? currentWord?.stats?.wrong_count ?? 0,
          review_count: statsUpdate.review_count ?? currentWord?.stats?.review_count ?? 0,
        },
      });
      upsertWordInState(updatedWord);
    } catch (error) {
      console.error('Learning rate update failed:', error);
    }
  };

  return {
    addToFolderId,
    bulkAddProgress,
    clearAddToFolderIfFolder,
    handleAddWord,
    handleBulkAddWords,
    handleDeleteWord,
    handleExplainVocabularyWord,
    handleMoveWord,
    handleRegenerateWord,
    handleSaveVocabularyWord,
    handleUpdateLearningRate,
    isAnalyzing,
    resetAddToFolder,
    setAddToFolderId,
    upsertWordInState,
  };
}
