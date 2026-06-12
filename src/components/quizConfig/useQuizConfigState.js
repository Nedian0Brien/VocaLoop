import { useEffect, useMemo, useState } from 'react';
import {
  loadTopics,
  addTopic as addTopicToStore,
  removeTopic as removeTopicFromStore,
  updateTopic as updateTopicInStore,
} from '../../utils/topicSets';
import {
  DEFAULT_MIXED_MODES,
  DEFAULT_STUDY_SET_SIZE,
  MIXED_MODE_IDS,
  STORAGE_KEYS,
  VOCAB_SAMPLE_DEFAULT,
  VOCAB_SAMPLE_MAX,
  VOCAB_SAMPLE_MIN,
} from './quizConfigConstants';
import { wordBelongsToFolder } from '../../utils/appDataTransforms';
import { normalizeToeflDifficulty } from '../../services/toefl/difficulty';

const readJsonArray = (key, fallback = []) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const clampNumber = (value, min, max, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

const expandMixedModeId = (modeId) => (
  modeId === 'short' ? ['short-en-ko', 'short-ko-en'] : [modeId]
);

const normalizeMixedModeIds = (modeIds = []) => {
  const normalized = [];
  modeIds.flatMap(expandMixedModeId).forEach((modeId) => {
    if (MIXED_MODE_IDS.includes(modeId) && !normalized.includes(modeId)) {
      normalized.push(modeId);
    }
  });
  return MIXED_MODE_IDS.filter((modeId) => normalized.includes(modeId));
};

export function useQuizConfigState({
  isOpen,
  mode,
  words,
  initialAiMode,
  onStart,
}) {
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [wordScope, setWordScope] = useState('all');
  const [questionCount, setQuestionCount] = useState(10);
  const [targetScore, setTargetScore] = useState('intermediate');
  const [aiMode, setAiMode] = useState(initialAiMode);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mixedModeIds, setMixedModeIds] = useState(DEFAULT_MIXED_MODES);
  const [studySetSize, setStudySetSize] = useState(DEFAULT_STUDY_SET_SIZE);
  const [vocabMode, setVocabMode] = useState('off');
  const [vocabFolderIds, setVocabFolderIds] = useState([]);
  const [vocabSampleSize, setVocabSampleSize] = useState(VOCAB_SAMPLE_DEFAULT);
  const [topicEnabled, setTopicEnabled] = useState(false);
  const [topics, setTopics] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [topicPickCount, setTopicPickCount] = useState(1);
  const [newTopicLabel, setNewTopicLabel] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [topicError, setTopicError] = useState('');
  const [editingTopic, setEditingTopic] = useState(null);

  const isToefl = Boolean(mode?.id?.startsWith('toefl'));
  const isMixed = mode?.id === 'mixed';

  useEffect(() => {
    if (!isOpen) return;

    const savedQCount = localStorage.getItem(STORAGE_KEYS.QUESTION_COUNT);
    const savedAiMode = localStorage.getItem(STORAGE_KEYS.AI_MODE);
    const savedTarget = localStorage.getItem(STORAGE_KEYS.TARGET_SCORE);
    const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    const savedStudySetSizeRaw = localStorage.getItem(STORAGE_KEYS.STUDY_SET_SIZE);
    const savedVocabMode = localStorage.getItem(STORAGE_KEYS.VOCAB_MODE);
    const savedVocabSample = localStorage.getItem(STORAGE_KEYS.VOCAB_SAMPLE);
    const savedTopicOn = localStorage.getItem(STORAGE_KEYS.TOPIC_ENABLED);
    const savedTopicPick = localStorage.getItem(STORAGE_KEYS.TOPIC_PICK);

    if (savedQCount) setQuestionCount(Number(savedQCount));
    if (savedAiMode !== null) setAiMode(savedAiMode === 'true');
    if (savedTarget) setTargetScore(normalizeToeflDifficulty(savedTarget));
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');

    setStudySetSize(clampNumber(savedStudySetSizeRaw, 1, Number.MAX_SAFE_INTEGER, DEFAULT_STUDY_SET_SIZE));
    const savedMixedModes = readJsonArray(STORAGE_KEYS.MIXED_MODES);
    const normalizedModes = normalizeMixedModeIds(savedMixedModes);
    setMixedModeIds(normalizedModes.length > 0 ? normalizedModes : DEFAULT_MIXED_MODES);

    setSelectedFolderIds([]);
    setWordScope('all');
    setVocabMode(savedVocabMode === 'all' || savedVocabMode === 'folders' ? savedVocabMode : 'off');
    setVocabFolderIds(readJsonArray(STORAGE_KEYS.VOCAB_FOLDERS).map(Number).filter((n) => !Number.isNaN(n)));
    setVocabSampleSize(clampNumber(savedVocabSample, VOCAB_SAMPLE_MIN, VOCAB_SAMPLE_MAX, VOCAB_SAMPLE_DEFAULT));
    setTopicEnabled(savedTopicOn === 'true');
    setTopics(loadTopics());
    setSelectedTopicIds(readJsonArray(STORAGE_KEYS.TOPIC_IDS).filter((it) => typeof it === 'string'));
    setTopicPickCount(clampNumber(savedTopicPick, 1, 3, 1));
    setNewTopicLabel('');
    setNewTopicDesc('');
    setTopicError('');
    setEditingTopic(null);
  }, [isOpen]);

  const filteredWords =
    wordScope === 'flagged'
      ? words.filter((word) => word?.isFlagged || word?.is_flagged)
      : selectedFolderIds.length > 0
        ? words.filter((word) => selectedFolderIds.some((folderId) => wordBelongsToFolder(word, folderId)))
        : words;

  const maxQuestions = isToefl ? 10 : Math.max(1, filteredWords.length);
  const maxStudySetSize = Math.max(1, filteredWords.length);
  const countValue = isMixed ? Math.min(studySetSize, maxStudySetSize) : questionCount;
  const countTitle = isMixed ? '학습 세트 크기' : '문항 개수';
  const countSubtitle = isMixed ? '한 번에 집중할 단어 묶음 크기를 정하세요' : '퀴즈당 출제될 문제 수를 정하세요';
  const countBadge = isMixed ? 'Words' : 'Items';

  useEffect(() => {
    if (!isOpen) return;
    if (questionCount > maxQuestions && !isToefl) {
      setQuestionCount(Math.min(10, maxQuestions));
    }
    if (isMixed && studySetSize > maxStudySetSize) {
      setStudySetSize(maxStudySetSize);
    }
  }, [isOpen, isMixed, maxQuestions, maxStudySetSize, questionCount, studySetSize, isToefl]);

  const toeflVocabPool = useMemo(() => {
    if (!isToefl || vocabMode === 'off') return [];
    if (vocabMode === 'all') return words;
    return words.filter((word) => vocabFolderIds.some((folderId) => wordBelongsToFolder(word, folderId)));
  }, [isToefl, vocabMode, vocabFolderIds, words]);

  const toggleVocabFolder = (folderId) => {
    setVocabFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const toggleTopic = (topicId) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleAddTopic = () => {
    setTopicError('');
    try {
      const next = addTopicToStore(topics, { label: newTopicLabel, description: newTopicDesc });
      setTopics(next);
      setNewTopicLabel('');
      setNewTopicDesc('');
    } catch (err) {
      setTopicError(err.message || '분야 추가에 실패했습니다.');
    }
  };

  const handleRemoveTopic = (id) => {
    setTopicError('');
    try {
      const next = removeTopicFromStore(topics, id);
      setTopics(next);
      setSelectedTopicIds((prev) => prev.filter((it) => it !== id));
    } catch (err) {
      setTopicError(err.message || '분야 삭제에 실패했습니다.');
    }
  };

  const startEditTopic = (topic) => {
    setEditingTopic({ id: topic.id, label: topic.label, description: topic.description || '' });
    setTopicError('');
  };

  const commitEditTopic = () => {
    if (!editingTopic) return;
    setTopicError('');
    try {
      const next = updateTopicInStore(topics, editingTopic.id, {
        label: editingTopic.label,
        description: editingTopic.description,
      });
      setTopics(next);
      setEditingTopic(null);
    } catch (err) {
      setTopicError(err.message || '분야 수정에 실패했습니다.');
    }
  };

  const handleStart = () => {
    localStorage.setItem(STORAGE_KEYS.QUESTION_COUNT, questionCount.toString());
    localStorage.setItem(STORAGE_KEYS.AI_MODE, aiMode.toString());
    localStorage.setItem(STORAGE_KEYS.TARGET_SCORE, targetScore.toString());
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, soundEnabled.toString());
    if (isMixed) {
      localStorage.setItem(STORAGE_KEYS.MIXED_MODES, JSON.stringify(mixedModeIds));
      localStorage.setItem(STORAGE_KEYS.STUDY_SET_SIZE, String(countValue));
    }

    if (isToefl) {
      localStorage.setItem(STORAGE_KEYS.VOCAB_MODE, vocabMode);
      localStorage.setItem(STORAGE_KEYS.VOCAB_FOLDERS, JSON.stringify(vocabFolderIds));
      localStorage.setItem(STORAGE_KEYS.VOCAB_SAMPLE, vocabSampleSize.toString());
      localStorage.setItem(STORAGE_KEYS.TOPIC_ENABLED, topicEnabled.toString());
      localStorage.setItem(STORAGE_KEYS.TOPIC_IDS, JSON.stringify(selectedTopicIds));
      localStorage.setItem(STORAGE_KEYS.TOPIC_PICK, topicPickCount.toString());
    }

    onStart({
      questionCount,
      selectedFolderIds,
      wordScope,
      aiMode,
      targetScore,
      soundEnabled,
      adaptiveModes: isMixed ? mixedModeIds : [],
      studySetSize: isMixed ? countValue : 0,
      vocabSource: isToefl
        ? { mode: vocabMode, folderIds: vocabFolderIds, sampleSize: vocabSampleSize, pool: toeflVocabPool }
        : { mode: 'off', folderIds: [], sampleSize: 0, pool: [] },
      topicSelection: isToefl
        ? {
            enabled: topicEnabled,
            allTopics: topics,
            selectedIds: selectedTopicIds,
            pickCount: topicPickCount,
          }
        : { enabled: false, allTopics: [], selectedIds: [], pickCount: 0 },
    });
  };

  const toggleFolder = (folderId) => {
    setWordScope('folders');
    setSelectedFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const toggleMixedMode = (modeId) => {
    setMixedModeIds((prev) => {
      if (prev.includes(modeId)) {
        return prev.length === 1 ? prev : prev.filter((id) => id !== modeId);
      }
      return MIXED_MODE_IDS.filter((id) => [...prev, modeId].includes(id));
    });
  };

  const startDisabled = (!isToefl && filteredWords.length === 0) || (isMixed && mixedModeIds.length === 0);
  const vocabPoolWarning =
    isToefl && vocabMode !== 'off' && toeflVocabPool.length === 0
      ? vocabMode === 'all'
        ? '단어장이 비어있어 단어 기반 출제가 불가합니다. 기본 출제로 진행됩니다.'
        : '선택한 폴더에 단어가 없습니다. 다른 폴더를 선택하거나 옵션을 꺼주세요.'
      : '';

  return {
    aiMode,
    commitEditTopic,
    countBadge,
    countSubtitle,
    countTitle,
    countValue,
    editingTopic,
    filteredWords,
    handleAddTopic,
    handleRemoveTopic,
    handleStart,
    isMixed,
    isToefl,
    maxQuestions,
    maxStudySetSize,
    mixedModeIds,
    newTopicDesc,
    newTopicLabel,
    questionCount,
    selectedFolderIds,
    selectedTopicIds,
    setAiMode,
    setEditingTopic,
    setNewTopicDesc,
    setNewTopicLabel,
    setQuestionCount,
    setSelectedFolderIds,
    setWordScope,
    setSelectedTopicIds,
    setSoundEnabled,
    setStudySetSize,
    setTargetScore,
    setTopicEnabled,
    setTopicError,
    setTopicPickCount,
    setVocabFolderIds,
    setVocabMode,
    setVocabSampleSize,
    soundEnabled,
    startDisabled,
    startEditTopic,
    targetScore,
    toeflVocabPool,
    toggleFolder,
    toggleMixedMode,
    toggleTopic,
    toggleVocabFolder,
    topicEnabled,
    topicError,
    topicPickCount,
    topics,
    vocabFolderIds,
    vocabMode,
    vocabPoolWarning,
    vocabSampleSize,
    wordScope,
  };
}
