import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Brain, ArrowLeft, Volume2, Trophy, Sparkles } from './Icons';
import QuizDashboard from './QuizDashboard';
import QuizConfigModal from './QuizConfigModal';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import ShortAnswerQuiz from './ShortAnswerQuiz';
import CompleteWordQuiz from './CompleteWordQuiz';
import QuizResult from './QuizResult';
import ToeflCompleteTheWordQuiz from './ToeflCompleteTheWordQuiz';
import ToeflBuildSentenceQuiz from './ToeflBuildSentenceQuiz';
import { calculateCorrectRate, calculateWrongRate } from '../utils/learningRate';
import { playSound } from '../utils/soundEffects';
import { recordMasterySnapshot, getMasteryTrend } from '../utils/masteryHistory';
import { Badge, Button, Card } from '../design-system';
import {
  createAdaptiveSession,
  getAdaptiveProgress,
  startNextAdaptiveSet,
  resolveAdaptiveAnswer,
} from '../services/adaptiveQuizService';

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

export default function QuizView({ words, setView, user, aiMode, setAiMode, aiConfig, folders = [], onUpdateLearningRate }) {
  const [quizState, setQuizState] = useState('select');
  const [selectedMode, setSelectedMode] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adaptiveSession, setAdaptiveSession] = useState(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });

  const [toeflConfig, setToeflConfig] = useState({
    questionCount: 5,
    targetScore: 100,
    vocabSource: { mode: 'off', folderIds: [], sampleSize: 0, pool: [] },
    topicSelection: { enabled: false, allTopics: [], selectedIds: [], pickCount: 0 },
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

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
        const folderWords = words.filter((w) => w.folderId === f.id);
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

  const wordQuizTracker = useRef({});

  const handleBackToModeSelect = useCallback(() => {
    setQuizState('select');
    setSelectedMode(null);
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

    if (modeId === 'toefl-complete' || modeId === 'toefl-build') {
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
      ? words.filter(w => selectedFolderIds.includes(w.folderId))
      : words;

    if (targetWords.length === 0) {
      alert('선택한 범위에 단어가 없습니다. 범위를 다시 설정해주세요.');
      return;
    }

    const shuffledWords = [...targetWords].sort(() => Math.random() - 0.5);
    const limitedQueue = shuffledWords.slice(0, Math.min(questionCount, targetWords.length));

    if (modeId === 'mixed') {
      setAdaptiveSession(createAdaptiveSession(shuffledWords, adaptiveModes, {
        setSize: studySetSize || 5,
        randomize: true,
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
    setSelectedMode(mode);
    setShowConfigModal(true);
  };

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[600px]">
      {/* 1. 대시보드 */}
      {quizState === 'select' && (
        <QuizDashboard
          onSelectMode={handleModeSelect}
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
              {selectedMode.id === 'multiple' && (
                <MultipleChoiceQuiz
                  word={queue[currentIndex]}
                  allWords={words}
                  onAnswer={handleAnswer}
                  progress={{ current: currentIndex + 1, total: queue.length }}
                  stats={stats}
                  aiMode={aiMode}
                  aiConfig={aiConfig}
                  soundEnabled={soundEnabled}
                />
              )}

              {selectedMode.id === 'mixed' && adaptiveMode === 'multiple' && (
                <MultipleChoiceQuiz
                  word={adaptiveTask.word}
                  allWords={words}
                  onAnswer={handleAnswer}
                  progress={adaptiveProgress}
                  stats={stats}
                  aiMode={aiMode}
                  aiConfig={aiConfig}
                  soundEnabled={soundEnabled}
                />
              )}

              {selectedMode.id === 'short' && (
                <ShortAnswerQuiz
                  word={queue[currentIndex]}
                  onAnswer={handleAnswer}
                  progress={{ current: currentIndex + 1, total: queue.length }}
                  stats={stats}
                  aiMode={aiMode}
                  aiConfig={aiConfig}
                  soundEnabled={soundEnabled}
                />
              )}

              {selectedMode.id === 'mixed' && adaptiveMode === 'short' && (
                <ShortAnswerQuiz
                  word={adaptiveTask.word}
                  onAnswer={handleAnswer}
                  progress={adaptiveProgress}
                  stats={stats}
                  aiMode={aiMode}
                  aiConfig={aiConfig}
                  soundEnabled={soundEnabled}
                />
              )}

              {selectedMode.id === 'mixed' && adaptiveMode === 'complete-word' && (
                <CompleteWordQuiz
                  word={adaptiveTask.word}
                  onAnswer={handleAnswer}
                  progress={adaptiveProgress}
                  stats={stats}
                  aiMode={aiMode}
                  soundEnabled={soundEnabled}
                />
              )}

              {selectedMode.id === 'toefl-complete' && (
                <ToeflCompleteTheWordQuiz
                  aiConfig={aiConfig}
                  questionCount={toeflConfig.questionCount}
                  targetScore={toeflConfig.targetScore}
                  vocabSource={toeflConfig.vocabSource}
                  topicSelection={toeflConfig.topicSelection}
                  onExit={handleBackToModeSelect}
                  user={user}
                />
              )}

              {selectedMode.id === 'toefl-build' && (
                <ToeflBuildSentenceQuiz
                  aiConfig={aiConfig}
                  questionCount={toeflConfig.questionCount}
                  targetScore={toeflConfig.targetScore}
                  vocabSource={toeflConfig.vocabSource}
                  topicSelection={toeflConfig.topicSelection}
                  onExit={handleBackToModeSelect}
                />
              )}
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
