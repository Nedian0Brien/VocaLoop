import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Brain, ArrowLeft, Volume2, Trophy, Sparkles } from './Icons';
import QuizDashboard from './QuizDashboard';
import QuizConfigModal from './QuizConfigModal';
import QuizResult from './QuizResult';
import QuizModeContent from './QuizModeContent';
import { TOEFL_MODE_TITLES, QUIZ_MODE_BY_ID } from './quizModeRegistry';
import { calculateCorrectRate, calculateWrongRate, sortByLearningRate } from '../utils/learningRate';
import { playSound } from '../utils/soundEffects';
import { recordMasterySnapshot, getMasteryTrend } from '../utils/masteryHistory';
import { wordBelongsToFolder } from '../utils/appDataTransforms';
import { Badge, Button, Card } from '../design-system';
import {
  createAdaptiveSession,
  getAdaptiveProgress,
  startNextAdaptiveSet,
  resolveAdaptiveAnswer,
} from '../services/adaptiveQuizService';
import { createToeflAsset, createToeflAttempt, getToeflAsset } from '../services/toeflAssetApi';

const QUIZ_HISTORY_STORAGE_KEY = 'vocaloop_quiz_history';
const QUIZ_SESSION_STORAGE_KEY = 'vocaloop_quiz_session';

// 새로고침 후 복원 가능한 단어 기반 모드. TOEFL 모드는 자식 컴포넌트가 문제를
// 내부에서(AI로) 생성/보관하므로 여기서 복원하지 않는다.
const RESTORABLE_MODE_IDS = new Set(['multiple', 'short', 'mixed']);

/**
 * localStorage에 저장된 진행 중 퀴즈 세션을 읽어 복원 가능한 경우에만 반환한다.
 */
const loadPersistedQuizSession = () => {
  try {
    const raw = localStorage.getItem(QUIZ_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.quizState !== 'quiz') return null;
    if (!RESTORABLE_MODE_IDS.has(data.modeId) || !QUIZ_MODE_BY_ID[data.modeId]) return null;

    const valid = data.modeId === 'mixed'
      ? Boolean(data.adaptiveSession) && !data.adaptiveSession.isComplete
      : Array.isArray(data.queue) && data.queue.length > 0;
    if (!valid) return null;

    return data;
  } catch (error) {
    console.warn('Failed to read saved quiz session', error);
    return null;
  }
};

const recordToeflAssetActivity = (asset) => {
  if (!asset?.id) return;
  try {
    const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_STORAGE_KEY) || '[]');
    const entry = {
      type: 'toefl-asset',
      date: asset.createdAt || asset.created_at || new Date().toISOString(),
      assetId: asset.id,
      mode: TOEFL_MODE_TITLES[asset.mode] || asset.title || 'TOEFL Practice',
      modeId: asset.mode,
      taskType: asset.taskType || asset.task_type,
      title: asset.title || TOEFL_MODE_TITLES[asset.mode] || 'TOEFL Practice',
    };
    const withoutDuplicate = Array.isArray(history)
      ? history.filter((item) => !(item?.type === 'toefl-asset' && item?.assetId === asset.id))
      : [];
    localStorage.setItem(QUIZ_HISTORY_STORAGE_KEY, JSON.stringify([entry, ...withoutDuplicate].slice(0, 20)));
  } catch (error) {
    console.warn('Failed to save TOEFL asset activity', error);
  }
};

/**
 * 상단 상태 칩 — Sound / AI 토글 표시.
 */
const StatusChip = ({ active, label, dot, icon: Icon }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-surface-50 rounded-xl border border-surface-100">
    {Icon ? (
      <Icon className={`w-3.5 h-3.5 ${active ? 'text-brand-600' : 'text-surface-300'}`} aria-hidden="true" />
    ) : (
      <span
        className={`w-2.5 h-2.5 rounded-pill ${
          active ? 'bg-success-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-surface-300'
        }`}
        aria-hidden="true"
      />
    )}
    <span className="text-2xs font-black text-surface-500 uppercase tracking-widest">
      {label}: {active ? 'On' : 'Off'}
    </span>
  </div>
);

const StudySetBreak = ({ session, stats, onContinue, onFinish }) => {
  const setNumber = (session?.currentSetIndex || 0) + 1;
  const totalSets = session?.totalSets || 1;
  const setWordCount = session?.currentSetWords?.length || 0;

  return (
    <Card variant="elevated" radius="hero" padding="xl" className="max-w-2xl mx-auto text-center shadow-[var(--shadow-elevated)]">
      <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-success-50 text-success-600 flex items-center justify-center shadow-[var(--shadow-soft)]">
        <Trophy className="w-10 h-10" aria-hidden="true" />
      </div>
      <Badge tone="success" style="dot" size="md" className="mb-5">
        Study Break
      </Badge>
      <h3 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight mb-3">
        학습 세트 {setNumber} 완료
      </h3>
      <p className="text-sm sm:text-base font-bold text-surface-500 leading-relaxed mb-8">
        {setWordCount}개 단어의 복합 퀴즈를 끝냈습니다. 잠깐 쉬고 다음 세트로 이어가세요.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl bg-surface-50 border border-surface-100 p-4">
          <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-1">Set</p>
          <p className="text-xl font-black text-brand-600">{setNumber}/{totalSets}</p>
        </div>
        <div className="rounded-xl bg-success-50 border border-success-100 p-4">
          <p className="text-2xs font-black text-success-500 uppercase tracking-widest mb-1">Correct</p>
          <p className="text-xl font-black text-success-700">{stats.correct}</p>
        </div>
        <div className="rounded-xl bg-danger-50 border border-danger-100 p-4">
          <p className="text-2xs font-black text-danger-400 uppercase tracking-widest mb-1">Wrong</p>
          <p className="text-xl font-black text-danger-600">{stats.wrong}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="secondary" size="lg" fullWidth onClick={onFinish}>
          여기서 마치기
        </Button>
        <Button variant="primary" size="lg" fullWidth onClick={onContinue} rightIcon={Sparkles}>
          다음 학습으로
        </Button>
      </div>
    </Card>
  );
};

export default function QuizView({
  words,
  setView,
  user,
  aiMode,
  setAiMode,
  aiConfig,
  folders = [],
  onUpdateLearningRate,
  onSaveVocabularyWord,
  onExplainVocabularyWord,
  onAcceptedAnswer,
  initialReviewAsset = null,
  onInitialReviewAssetConsumed,
}) {
  // 새로고침 시 진행 중이던 퀴즈를 복원한다. 마운트 시 1회만 읽는다.
  const restoredSessionRef = useRef(undefined);
  if (restoredSessionRef.current === undefined) {
    restoredSessionRef.current = loadPersistedQuizSession();
  }
  const restoredSession = restoredSessionRef.current;

  const [quizState, setQuizState] = useState(restoredSession ? 'quiz' : 'select');
  const [selectedMode, setSelectedMode] = useState(
    restoredSession ? QUIZ_MODE_BY_ID[restoredSession.modeId] : null
  );
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [reviewAsset, setReviewAsset] = useState(null);

  const [queue, setQueue] = useState(restoredSession?.queue ?? []);
  const [currentIndex, setCurrentIndex] = useState(restoredSession?.currentIndex ?? 0);
  const [adaptiveSession, setAdaptiveSession] = useState(restoredSession?.adaptiveSession ?? null);
  const [stats, setStats] = useState(restoredSession?.stats ?? { correct: 0, wrong: 0, total: 0 });

  const [toeflConfig, setToeflConfig] = useState({
    questionCount: 5,
    targetScore: 100,
    vocabSource: { mode: 'off', folderIds: [], sampleSize: 0, pool: [] },
    topicSelection: { enabled: false, allTopics: [], selectedIds: [], pickCount: 0 },
  });
  const [soundEnabled, setSoundEnabled] = useState(restoredSession?.soundEnabled ?? true);

  // Avg. Mastery 정수값 — 트렌드 계산용 의존성으로 분리.
  const avgRateInt = useMemo(() => {
    if (words.length === 0) return 0;
    const sum = words.reduce((acc, w) => acc + (w.learningRate || 0), 0);
    return Math.round(sum / words.length);
  }, [words]);

  // 일일 스냅샷 기록 + 트렌드 (어제 대비 %p 차이) 상태 보관.
  const [rateTrend, setRateTrend] = useState(0);
  useEffect(() => {
    if (words.length === 0) return;
    const history = recordMasterySnapshot(avgRateInt);
    setRateTrend(getMasteryTrend(history));
  }, [avgRateInt, words.length]);

  // 학습률이 가장 낮은 폴더 — Smart Tip에서 추천에 사용.
  const weakestFolder = useMemo(() => {
    if (folders.length === 0 || words.length === 0) return null;
    const candidates = folders
      .map((f) => {
        const folderWords = words.filter((w) => wordBelongsToFolder(w, f.id));
        if (folderWords.length === 0) return null;
        const avg = folderWords.reduce((sum, w) => sum + (w.learningRate || 0), 0) / folderWords.length;
        return { id: f.id, name: f.name, avgRate: Math.round(avg), wordCount: folderWords.length };
      })
      .filter(Boolean);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.avgRate - b.avgRate);
    return candidates[0];
  }, [folders, words]);

  const dashboardStats = useMemo(() => {
    const totalWords = words.length;
    if (totalWords === 0) return {
      learningRate: '0%', studiedCount: 0, recentAccuracy: '0%',
      folderCount: folders.length, rateTrend: 0, accuracyTrend: 0,
      weakestFolder: null,
    };

    const studiedThisWeek = words.filter(w => {
      if (!w.createdAt) return false;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const timestamp = w.createdAt.seconds ? w.createdAt.seconds * 1000 : w.createdAt;
      return new Date(timestamp) > oneWeekAgo;
    }).length;

    return {
      learningRate: `${avgRateInt}%`,
      studiedCount: studiedThisWeek,
      recentAccuracy: '0%',
      folderCount: folders.length,
      rateTrend,
      accuracyTrend: 0,
      weakestFolder,
    };
  }, [words, folders, avgRateInt, rateTrend, weakestFolder]);

  const wordQuizTracker = useRef(restoredSession?.wordQuizTracker ?? {});
  const consumedInitialReviewAssetIdRef = useRef(null);

  const handleToeflAssetCreated = useCallback(async (payload) => {
    if (!user) return null;
    try {
      const asset = await createToeflAsset(payload);
      recordToeflAssetActivity(asset);
      return asset;
    } catch (error) {
      console.warn('Failed to save TOEFL asset', error);
      return null;
    }
  }, [user]);

  const handleToeflAttemptRecorded = useCallback(async (asset, payload) => {
    const assetId = asset?.id;
    if (!user || !assetId) return null;
    try {
      return await createToeflAttempt(assetId, payload);
    } catch (error) {
      console.warn('Failed to record TOEFL attempt', error);
      return null;
    }
  }, [user]);

  const handleBackToModeSelect = useCallback(() => {
    setQuizState('select');
    setSelectedMode(null);
    setReviewAsset(null);
    setQueue([]);
    setCurrentIndex(0);
    setAdaptiveSession(null);
    setStats({ correct: 0, wrong: 0, total: 0 });
    wordQuizTracker.current = {};
  }, []);

  const startQuiz = (config) => {
    const {
      questionCount,
      selectedFolderIds,
      aiMode: sessionAiMode,
      targetScore,
      soundEnabled: sessionSoundEnabled,
      vocabSource,
      topicSelection,
      adaptiveModes,
      studySetSize,
    } = config;

    if (sessionAiMode !== aiMode) setAiMode(sessionAiMode);
    setSoundEnabled(sessionSoundEnabled);

    if (!selectedMode) return;
    const modeId = selectedMode.id;

    if (modeId?.startsWith('toefl-')) {
      setReviewAsset(null);
      setToeflConfig({
        questionCount,
        targetScore,
        vocabSource: vocabSource || { mode: 'off', folderIds: [], sampleSize: 0, pool: [] },
        topicSelection: topicSelection || { enabled: false, allTopics: [], selectedIds: [], pickCount: 0 },
      });
      setQuizState('quiz');
      setShowConfigModal(false);
      return;
    }

    const targetWords = selectedFolderIds.length > 0
      ? words.filter(w => selectedFolderIds.some((folderId) => wordBelongsToFolder(w, folderId)))
      : words;

    if (targetWords.length === 0) {
      alert('선택한 범위에 단어가 없습니다. 범위를 다시 설정해주세요.');
      return;
    }

    const prioritizedWords = sortByLearningRate(targetWords, 'asc');
    const limitedQueue = prioritizedWords.slice(0, Math.min(questionCount, targetWords.length));

    if (modeId === 'mixed') {
      setAdaptiveSession(createAdaptiveSession(prioritizedWords, adaptiveModes, {
        setSize: studySetSize || 5,
        randomize: false,
      }));
      setQueue([]);
    } else {
      setQueue(limitedQueue);
      setAdaptiveSession(null);
    }
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, total: 0 });
    setQuizState('quiz');
    setShowConfigModal(false);
  };

  const handleModeSelect = (mode) => {
    setReviewAsset(null);
    setSelectedMode(mode);
    setShowConfigModal(true);
  };

  const handleToeflAssetSelect = useCallback(async (asset) => {
    if (!asset?.id && !asset?.mode) return;
    let targetAsset = asset;
    if (asset?.id && !asset.payload) {
      try {
        targetAsset = await getToeflAsset(asset.id);
      } catch (error) {
        console.warn('Failed to load TOEFL asset from activity', error);
        return;
      }
    }
    if (!targetAsset?.mode) return;
    setReviewAsset(targetAsset);
    setSelectedMode({
      id: targetAsset.mode,
      title: TOEFL_MODE_TITLES[targetAsset.mode] || targetAsset.title || 'TOEFL Review',
    });
    setToeflConfig((current) => ({
      ...current,
      questionCount: targetAsset.metadata?.questionCount || current.questionCount,
      targetScore: targetAsset.metadata?.targetScore || current.targetScore,
    }));
    setShowConfigModal(false);
    setQuizState('quiz');
  }, []);

  useEffect(() => {
    if (!initialReviewAsset?.id) return;
    if (consumedInitialReviewAssetIdRef.current === initialReviewAsset.id) return;
    consumedInitialReviewAssetIdRef.current = initialReviewAsset.id;
    handleToeflAssetSelect(initialReviewAsset);
    onInitialReviewAssetConsumed?.();
  }, [handleToeflAssetSelect, initialReviewAsset, onInitialReviewAssetConsumed]);

  // 복원된 세션의 AI 채점 모드를 부모 상태에 반영한다.
  // (App의 aiMode는 새로고침 시 false로 초기화되므로 직접 되살린다.)
  useEffect(() => {
    if (restoredSession && typeof restoredSession.aiMode === 'boolean' && restoredSession.aiMode !== aiMode) {
      setAiMode(restoredSession.aiMode);
    }
    // 마운트 시 1회만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 진행 중인 단어 퀴즈 세션을 저장하여 새로고침 후에도 풀던 문제가 유지되게 한다.
  // 퀴즈가 아니거나 복원 불가능한(TOEFL) 모드면 저장본을 제거한다.
  useEffect(() => {
    const modeId = selectedMode?.id;
    if (quizState !== 'quiz' || !RESTORABLE_MODE_IDS.has(modeId)) {
      localStorage.removeItem(QUIZ_SESSION_STORAGE_KEY);
      return;
    }
    try {
      localStorage.setItem(
        QUIZ_SESSION_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          quizState,
          modeId,
          queue,
          currentIndex,
          adaptiveSession,
          stats,
          wordQuizTracker: wordQuizTracker.current,
          soundEnabled,
          aiMode,
        })
      );
    } catch (error) {
      console.warn('Failed to persist quiz session', error);
    }
  }, [quizState, selectedMode, queue, currentIndex, adaptiveSession, stats, soundEnabled, aiMode]);

  const handleAnswer = (isCorrect) => {
    const isAdaptive = selectedMode?.id === 'mixed';
    const currentTask = isAdaptive ? adaptiveSession?.queue?.[0] : null;
    const currentWord = isAdaptive ? currentTask?.word : queue[currentIndex];
    const wordId = currentWord?.id;
    const activeQuizType =
      isAdaptive
        ? adaptiveSession?.modes?.[currentTask?.stageIndex || 0] || 'multiple'
        : selectedMode?.id || 'multiple';

    const newStats = {
      ...stats,
      correct: stats.correct + (isCorrect ? 1 : 0),
      wrong: stats.wrong + (isCorrect ? 0 : 1),
      total: stats.total + 1,
    };
    setStats(newStats);

    if (wordId && onUpdateLearningRate) {
      const tracker = wordQuizTracker.current[wordId] || { wrongCount: 0, lastPenalty: 0, wasReasked: false };
      const currentRate = currentWord.learningRate || 0;

      if (isCorrect) {
        const newRate = calculateCorrectRate({
          currentRate,
          quizType: activeQuizType,
          isReasked: tracker.wasReasked,
          isAiSimilar: aiMode && tracker.wasReasked,
          lastPenalty: tracker.lastPenalty,
        });
        onUpdateLearningRate(wordId, newRate, {
          review_count: (currentWord.stats?.review_count || 0) + 1,
        });
      } else {
        const { newRate, penalty } = calculateWrongRate({ currentRate, wrongCount: tracker.wrongCount });
        tracker.wrongCount += 1;
        tracker.lastPenalty = penalty;
        tracker.wasReasked = true;
        wordQuizTracker.current[wordId] = tracker;

        onUpdateLearningRate(wordId, newRate, {
          wrong_count: (currentWord.stats?.wrong_count || 0) + 1,
          review_count: (currentWord.stats?.review_count || 0) + 1,
        });
      }
    }

    if (isAdaptive) {
      const nextSession = resolveAdaptiveAnswer(adaptiveSession, isCorrect);
      setAdaptiveSession(nextSession);
      if (nextSession.isComplete) {
        setQuizState('result');
        if (soundEnabled) playSound('COMPLETE');
      }
      return;
    }

    if (isCorrect) {
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setQuizState('result');
        if (soundEnabled) playSound('COMPLETE');
      }
    } else {
      const newQueue = [...queue];
      newQueue.splice(currentIndex, 1);
      newQueue.push(currentWord);
      setQueue(newQueue);
      if (currentIndex >= newQueue.length) setCurrentIndex(0);
    }
  };

  const handleAcceptedAnswer = useCallback(async (wordId, acceptedAnswer) => {
    if (!onAcceptedAnswer) return null;
    const updatedWord = await onAcceptedAnswer(wordId, acceptedAnswer);
    if (!updatedWord?.id) return updatedWord;

    setQueue((currentQueue) => currentQueue.map((word) => (
      word?.id === updatedWord.id ? { ...word, ...updatedWord } : word
    )));
    setAdaptiveSession((currentSession) => {
      if (!currentSession) return currentSession;
      const replaceWord = (word) => (
        word?.id === updatedWord.id ? { ...word, ...updatedWord } : word
      );
      return {
        ...currentSession,
        currentSetWords: currentSession.currentSetWords?.map(replaceWord) || [],
        studySets: currentSession.studySets?.map((setWords) => setWords.map(replaceWord)) || [],
        queue: currentSession.queue?.map((task) => ({
          ...task,
          word: replaceWord(task.word),
        })) || [],
      };
    });

    return updatedWord;
  }, [onAcceptedAnswer]);

  const resetQuiz = () => handleBackToModeSelect();
  const handleNextStudySet = () => {
    setAdaptiveSession((current) => startNextAdaptiveSet(current));
  };
  const handleFinishAtStudyBreak = () => {
    setQuizState('result');
    if (soundEnabled) playSound('COMPLETE');
  };
  const adaptiveTask = selectedMode?.id === 'mixed' ? adaptiveSession?.queue?.[0] : null;
  const adaptiveMode = adaptiveTask ? adaptiveSession?.modes?.[adaptiveTask.stageIndex] : null;
  const adaptiveProgress = adaptiveSession ? getAdaptiveProgress(adaptiveSession) : null;
  const isStudySetBreak = selectedMode?.id === 'mixed' && adaptiveSession?.isSetComplete;
  const quizContentKey = selectedMode?.id === 'mixed' && adaptiveTask
    ? [
      'mixed',
      adaptiveMode,
      adaptiveTask.word?.id ?? adaptiveTask.word?.word ?? 'word',
      adaptiveTask.stageIndex ?? 0,
      stats.total,
    ].join(':')
    : undefined;

  return (
    <div data-testid="quiz-view-shell" className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 py-5 sm:py-8 min-h-[600px]">
      {/* 1. 대시보드 */}
      {quizState === 'select' && (
        <QuizDashboard
          onSelectMode={handleModeSelect}
          onSelectToeflAsset={handleToeflAssetSelect}
          stats={dashboardStats}
          wordCount={words.length}
        />
      )}

      {/* 2. 결과 */}
      {quizState === 'result' && (
        <QuizResult
          stats={stats}
          modeTitle={selectedMode?.title}
          onRestart={resetQuiz}
          onBackToDashboard={() => setView('dashboard')}
        />
      )}

      {/* 3. 진행 */}
      {quizState === 'quiz' && (
        <div className="animate-in fade-in duration-500">
          {/* 퀴즈 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="secondary"
              size="md"
              onClick={handleBackToModeSelect}
              leftIcon={ArrowLeft}
              className="!bg-white !border !border-surface-100 shadow-[var(--shadow-soft)] !rounded-xl"
            >
              종료하기
            </Button>

            <div className="flex items-center gap-4">
              <StatusChip active={soundEnabled} label="Sound" icon={Volume2} />
              <StatusChip active={aiMode} label="AI" />
            </div>
          </div>

          {/* 컨텐츠 */}
          {isStudySetBreak ? (
            <StudySetBreak
              session={adaptiveSession}
              stats={stats}
              onContinue={handleNextStudySet}
              onFinish={handleFinishAtStudyBreak}
            />
          ) : (!selectedMode || (!selectedMode.id?.startsWith('toefl') && selectedMode.id !== 'mixed' && (!queue || queue.length === 0 || !queue[currentIndex])) || (selectedMode.id === 'mixed' && !adaptiveTask)) ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-hero border border-surface-100 shadow-[var(--shadow-elevated)]">
              <div className="w-20 h-20 bg-surface-50 rounded-2xl flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-surface-200 animate-pulse" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">문제를 준비하고 있습니다</h3>
              <p className="text-surface-400 font-bold text-sm mb-8 text-center px-10">
                선택한 범위에 단어가 충분한지 확인해주세요. <br />
                문제가 계속 보이지 않는다면 모드 선택으로 돌아가주세요.
              </p>
              <Button variant="dark" size="lg" onClick={handleBackToModeSelect}>
                모드 선택으로 돌아가기
              </Button>
            </div>
          ) : (
            <div className="quiz-container">
              <QuizModeContent
                key={quizContentKey}
                selectedMode={selectedMode}
                adaptiveMode={adaptiveMode}
                adaptiveTask={adaptiveTask}
                adaptiveProgress={adaptiveProgress}
                queue={queue}
                currentIndex={currentIndex}
                stats={stats}
                words={words}
                aiMode={aiMode}
                aiConfig={aiConfig}
                soundEnabled={soundEnabled}
                onAnswer={handleAnswer}
                toeflConfig={toeflConfig}
                onExit={handleBackToModeSelect}
                user={user}
                reviewAsset={reviewAsset}
                onAssetCreated={handleToeflAssetCreated}
                onAttemptRecorded={handleToeflAttemptRecorded}
                onSaveVocabularyWord={onSaveVocabularyWord}
                onExplainVocabularyWord={onExplainVocabularyWord}
                onAcceptedAnswer={handleAcceptedAnswer}
              />
            </div>
          )}
        </div>
      )}

      {/* 설정 모달 */}
      <QuizConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        mode={selectedMode}
        folders={folders}
        words={words}
        initialAiMode={aiMode}
        onStart={startQuiz}
      />
    </div>
  );
}
