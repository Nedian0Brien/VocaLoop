import { useEffect, useState } from 'react';
import { generateWordData } from '../services/geminiService';
import { hasAiProviderAccess } from '../services/aiModelService';
import { createWord, deleteWord, updateWord } from '../services/wordApi';
import {
  buildVocabularyPayload,
  getVocabularyWordKey,
  normalizeCapturedWord,
} from '../utils/vocabularyCapture';
import { normalizeWord, sortWordsByNewest } from '../utils/appDataTransforms';

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
    clearAddToFolderIfFolder,
    handleAddWord,
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
