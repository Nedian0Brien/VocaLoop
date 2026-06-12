import { useEffect, useState } from 'react';
import { generateBulkWordData, generateWordData } from '../services/geminiService';
import { hasAiProviderAccess } from '../services/aiModelService';
import { createWord, deleteWord, updateWord } from '../services/wordApi';
import { runBulkWordAdd } from '../services/bulkWordAddService';
import {
  buildVocabularyPayload,
  getVocabularyWordKey,
  normalizeCapturedWord,
} from '../utils/vocabularyCapture';
import { normalizeWord, sortWordsByNewest } from '../utils/appDataTransforms';

const normalizeTextValue = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const splitMeaningItems = (value = '') =>
  String(value)
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const buildMeaningWithAcceptedAnswer = (currentMeaning, acceptedAnswer) => {
  const normalizedAnswer = normalizeTextValue(acceptedAnswer?.answer);
  if (!normalizedAnswer || acceptedAnswer?.mode !== 'short-en-ko') {
    return currentMeaning || '';
  }

  const meaningItems = splitMeaningItems(currentMeaning);
  const alreadyIncluded = meaningItems.some(
    (item) => item.toLowerCase() === normalizedAnswer.toLowerCase(),
  );
  if (alreadyIncluded) return currentMeaning || normalizedAnswer;

  return [...meaningItems, normalizedAnswer].join(', ');
};

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

    if (activeAiProviderNeedsKey) {
      showNotification(activeAiProviderAccessError, 'error');
      throw new Error(activeAiProviderAccessError);
    }

    try {
      const {
        assignedWords,
        createdWords,
        failedWords,
        skippedWords,
        processedWords,
      } = await runBulkWordAdd({
        activeAiConfig,
        createWord,
        existingWords: words,
        folderId,
        generateBulkWordData,
        generateWordData,
        onProgress: setBulkAddProgress,
        onWordSaved: upsertWordInState,
        updateWord,
        words: queuedWords,
      });

      if (failedWords.length > 0) {
        const message = `${createdWords.length + assignedWords.length}개 처리, ${failedWords.length}개 실패`;
        showNotification(message, 'error');
        if (createdWords.length + assignedWords.length === 0) {
          throw new Error(message);
        }
        return processedWords;
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
      return processedWords;
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

  const handleToggleWordFlag = async (wordId, nextFlagged) => {
    if (!user) return;
    try {
      const updatedWord = await updateWord(wordId, { is_flagged: Boolean(nextFlagged) });
      upsertWordInState(updatedWord);
    } catch (error) {
      showNotification('단어 플래그 변경 실패: ' + error.message, 'error');
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

  const handleAcceptQuizAnswer = async (wordId, acceptedAnswer) => {
    if (!user || !wordId || !acceptedAnswer?.answer || !acceptedAnswer?.mode) return null;
    const currentWord = words.find((word) => word.id === wordId);
    if (!currentWord) return null;

    const normalizedAnswer = acceptedAnswer.answer.trim();
    const currentAcceptedAnswers = Array.isArray(currentWord.accepted_answers)
      ? currentWord.accepted_answers
      : [];
    const alreadySaved = currentAcceptedAnswers.some((item) => (
      item?.mode === acceptedAnswer.mode &&
      String(item?.answer || '').trim().toLowerCase() === normalizedAnswer.toLowerCase()
    ));
    const nextMeaningKo = buildMeaningWithAcceptedAnswer(currentWord.meaning_ko, {
      ...acceptedAnswer,
      answer: normalizedAnswer,
    });
    const shouldUpdateMeaning = nextMeaningKo !== (currentWord.meaning_ko || '');
    if (alreadySaved && !shouldUpdateMeaning) return currentWord;

    try {
      const updatedWord = await updateWord(wordId, {
        ...(shouldUpdateMeaning ? { meaning_ko: nextMeaningKo } : {}),
        ...(alreadySaved ? {} : {
          accepted_answers: [
            ...currentAcceptedAnswers,
            {
              mode: acceptedAnswer.mode,
              answer: normalizedAnswer,
              source: acceptedAnswer.source || 'ai-review',
              feedback: acceptedAnswer.feedback || null,
            },
          ],
        }),
      });
      const normalizedWord = upsertWordInState(updatedWord);
      showNotification('AI가 인정한 답안을 앞으로 정답으로 반영합니다.');
      return normalizedWord;
    } catch (error) {
      console.error('Accepted answer update failed:', error);
      showNotification('AI 판정은 정답이지만 채점 기준 저장에 실패했습니다.', 'error');
      throw error;
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
    handleToggleWordFlag,
    handleRegenerateWord,
    handleAcceptQuizAnswer,
    handleSaveVocabularyWord,
    handleUpdateLearningRate,
    isAnalyzing,
    resetAddToFolder,
    setAddToFolderId,
    upsertWordInState,
  };
}
