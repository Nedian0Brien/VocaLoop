import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Brain, ArrowLeft, Volume2, Trophy, Sparkles } from './Icons';
import QuizDashboard from './QuizDashboard';
import QuizConfigModal from './QuizConfigModal';
import QuizResult from './QuizResult';
import QuizModeContent from './QuizModeContent';
import { TOEFL_MODE_TITLES, QUIZ_MODE_BY_ID } from './quizModeRegistry';
import { sortByLearningRate } from '../utils/learningRate';
import { playSound } from '../utils/soundEffects';
import { recordMasterySnapshot, getMasteryTrend } from '../utils/masteryHistory';
import { wordBelongsToFolder } from '../utils/appDataTransforms';
import { normalizeToeflDifficulty } from '../services/toefl/difficulty';
import { Badge, Button, Card } from '../design-system';
import {
  createAdaptiveSession,
  getAdaptiveProgress,
  startNextAdaptiveSet,
} from '../services/adaptiveQuizService';
import { useQuizAnswerController } from '../hooks/useQuizAnswerController';
import { createToeflAsset, createToeflAttempt, getToeflAsset } from '../services/toeflAssetApi';
import {
  loadPersistedQuizSession,
  persistQuizSession,
  recordToeflAssetActivity,
} from '../services/quizSessionStorage';
import {
  getWordSummaryKey,
} from '../services/quizAnswerFlow';

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

const formatRateDelta = (delta) => `${delta >= 0 ? '+' : ''}${delta}%p`;

const StudySetBreak = ({ session, setSummary, stats, onContinue, onFinish }) => {
  const setNumber = (session?.currentSetIndex || 0) + 1;
  const totalSets = session?.totalSets || 1;
  const setWordCount = session?.currentSetWords?.length || 0;
  const summaryWords = Object.values(setSummary?.words || {});
  const fallbackWords = (session?.currentSetWords || []).map((word) => ({
    id: word?.id,
    word: word?.word,
    meaningKo: word?.meaning_ko || word?.meaningKo || '',
    startRate: word?.learningRate || 0,
    latestRate: word?.learningRate || 0,
  }));
  const displayedWords = summaryWords.length > 0 ? summaryWords : fallbackWords;
  const totalRateDelta = displayedWords.reduce((sum, word) => (
    sum + Math.round((word.latestRate || 0) - (word.startRate || 0))
  ), 0);

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

      <div className="rounded-xl border border-surface-100 bg-surface-50 p-4 text-left mb-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xs font-black text-surface-400 uppercase tracking-widest">진행한 단어</p>
            <p className="text-sm font-bold text-surface-600">{displayedWords.length}개 단어</p>
          </div>
          <div className="rounded-lg bg-white border border-surface-100 px-3 py-2 text-sm font-black text-success-700">
            학습률 증가 {formatRateDelta(totalRateDelta)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {displayedWords.map((word) => {
            const delta = Math.round((word.latestRate || 0) - (word.startRate || 0));
            return (
              <div
                key={getWordSummaryKey(word)}
                className="flex items-center justify-between gap-3 rounded-lg bg-white border border-surface-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-surface-900">{word.word}</p>
                  {word.meaningKo && (
                    <p className="truncate text-xs font-bold text-surface-500">{word.meaningKo}</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-black ${delta >= 0 ? 'text-success-700' : 'text-danger-600'}`}>
                  {formatRateDelta(delta)}
                </span>
              </div>
            );
          })}
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
    restoredSessionRef.current = loadPersistedQuizSession({ quizModeById: QUIZ_MODE_BY_ID });
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
  const [studySetSummaries, setStudySetSummaries] = useState(restoredSession?.studySetSummaries ?? {});
  const [stats, setStats] = useState(restoredSession?.stats ?? { correct: 0, wrong: 0, total: 0 });

  const [toeflConfig, setToeflConfig] = useState({
    questionCount: 5,
    targetScore: 'intermediate',
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
      recordToeflAssetActivity(asset, { modeTitles: TOEFL_MODE_TITLES });
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
    setStudySetSummaries({});
    setStats({ correct: 0, wrong: 0, total: 0 });
    wordQuizTracker.current = {};
  }, []);

  const startQuiz = (config) => {
    const {
      questionCount,
      selectedFolderIds,
      wordScope,
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
        targetScore: normalizeToeflDifficulty(targetScore),
        vocabSource: vocabSource || { mode: 'off', folderIds: [], sampleSize: 0, pool: [] },
        topicSelection: topicSelection || { enabled: false, allTopics: [], selectedIds: [], pickCount: 0 },
      });
      setQuizState('quiz');
      setShowConfigModal(false);
      return;
    }

    const targetWords =
      wordScope === 'flagged'
        ? words.filter((word) => word?.isFlagged || word?.is_flagged)
        : selectedFolderIds.length > 0
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
    setStudySetSummaries({});
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
      targetScore: normalizeToeflDifficulty(targetAsset.metadata?.targetScore || current.targetScore),
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

  useEffect(() => {
    persistQuizSession({
      adaptiveSession,
      aiMode,
      currentIndex,
      modeId: selectedMode?.id,
      queue,
      quizState,
      soundEnabled,
      stats,
      studySetSummaries,
      wordQuizTracker: wordQuizTracker.current,
    });
  }, [quizState, selectedMode, queue, currentIndex, adaptiveSession, studySetSummaries, stats, soundEnabled, aiMode]);

  const { handleAcceptedAnswer, handleAnswer } = useQuizAnswerController({
    adaptiveSession,
    aiMode,
    currentIndex,
    onAcceptedAnswer,
    onUpdateLearningRate,
    queue,
    selectedMode,
    setAdaptiveSession,
    setCurrentIndex,
    setQueue,
    setQuizState,
    setStats,
    setStudySetSummaries,
    soundEnabled,
    stats,
    wordQuizTracker,
  });

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
  const setProgressLabel = selectedMode?.id === 'mixed' && adaptiveSession
    ? `전체 세트 ${(adaptiveSession.currentSetIndex || 0) + 1}/${adaptiveSession.totalSets || 1}`
    : null;
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
              {setProgressLabel && (
                <div className="flex items-center gap-2 px-4 py-2 bg-surface-50 rounded-xl border border-surface-100 text-2xs font-black text-surface-500 uppercase tracking-widest">
                  {setProgressLabel}
                </div>
              )}
              <StatusChip active={soundEnabled} label="Sound" icon={Volume2} />
              <StatusChip active={aiMode} label="AI" />
            </div>
          </div>

          {/* 컨텐츠 */}
          {isStudySetBreak ? (
            <StudySetBreak
              session={adaptiveSession}
              setSummary={studySetSummaries[String(adaptiveSession?.currentSetIndex || 0)]}
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
