import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Brain, Settings as SettingsIcon, ArrowLeft, Folder, X } from './Icons';
import QuizDashboard from './QuizDashboard';
import QuizConfigModal from './QuizConfigModal';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import ShortAnswerQuiz from './ShortAnswerQuiz';
import QuizResult from './QuizResult';
import ToeflCompleteTheWordQuiz from './ToeflCompleteTheWordQuiz';
import ToeflBuildSentencePlaceholder from './ToeflBuildSentencePlaceholder';
import { calculateCorrectRate, calculateWrongRate } from '../utils/learningRate';
import { playSound } from '../utils/soundEffects';

export default function QuizView({ words, setView, db, user, aiMode, setAiMode, aiConfig, folders = [], selectedFolderId, onSelectFolder, onUpdateLearningRate }) {
  const [quizState, setQuizState] = useState('select'); // 'select', 'quiz', 'result'
  const [selectedMode, setSelectedMode] = useState(null); // mode object from dashboard
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  
  // 퀴즈 설정 상태
  const [toeflConfig, setToeflConfig] = useState({ questionCount: 5, targetScore: 100 });
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Dashboard Stats
  const dashboardStats = useMemo(() => {
    const totalWords = words.length;
    if (totalWords === 0) return { 
      learningRate: '0%', 
      studiedCount: 0, 
      recentAccuracy: '0%', 
      folderCount: folders.length,
      rateTrend: 0,
      accuracyTrend: 0
    };

    const avgRate = words.reduce((acc, w) => acc + (w.learningRate || 0), 0) / totalWords;
    const studiedThisWeek = words.filter(w => {
      if (!w.createdAt) return false;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const timestamp = w.createdAt.seconds ? w.createdAt.seconds * 1000 : w.createdAt;
      return new Date(timestamp) > oneWeekAgo;
    }).length;

    return {
      learningRate: `${Math.round(avgRate)}%`,
      studiedCount: studiedThisWeek,
      recentAccuracy: '0%', 
      folderCount: folders.length,
      rateTrend: 0,
      accuracyTrend: 0
    };
  }, [words, folders]);

  const wordQuizTracker = useRef({}); 

  const handleBackToModeSelect = useCallback(() => {
    setQuizState('select');
    setSelectedMode(null);
    setQueue([]);
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, total: 0 });
    wordQuizTracker.current = {};
  }, []);

  const startQuiz = (config) => {
    const { questionCount, selectedFolderIds, aiMode: sessionAiMode, targetScore, soundEnabled: sessionSoundEnabled } = config;
    
    if (sessionAiMode !== aiMode) {
      setAiMode(sessionAiMode);
    }
    
    setSoundEnabled(sessionSoundEnabled);

    if (!selectedMode) return;
    const modeId = selectedMode.id;
    
    // TOEFL 모드 설정 저장 및 시작
    if (modeId === 'toefl-complete') {
      setToeflConfig({ questionCount, targetScore });
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
    
    setQueue(limitedQueue);
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
    const currentWord = queue[currentIndex];
    const wordId = currentWord?.id;

    const newStats = {
      ...stats,
      correct: stats.correct + (isCorrect ? 1 : 0),
      wrong: stats.wrong + (isCorrect ? 0 : 1),
      total: stats.total + 1
    };
    setStats(newStats);

    if (wordId && onUpdateLearningRate) {
      const tracker = wordQuizTracker.current[wordId] || { wrongCount: 0, lastPenalty: 0, wasReasked: false };
      const currentRate = currentWord.learningRate || 0;

      if (isCorrect) {
        const newRate = calculateCorrectRate({
          currentRate,
          quizType: selectedMode?.id || 'multiple',
          isReasked: tracker.wasReasked,
          isAiSimilar: aiMode && tracker.wasReasked,
          lastPenalty: tracker.lastPenalty,
        });
        onUpdateLearningRate(wordId, newRate, {
          review_count: (currentWord.stats?.review_count || 0) + 1,
        });
      } else {
        const { newRate, penalty } = calculateWrongRate({
          currentRate,
          wrongCount: tracker.wrongCount,
        });
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

      if (currentIndex >= newQueue.length) {
        setCurrentIndex(0);
      }
    }
  };

  const resetQuiz = () => {
    handleBackToModeSelect();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[600px]">
      {/* 1. 대시보드 상태 (초기 화면) */}
      {quizState === 'select' && (
        <QuizDashboard 
          onSelectMode={handleModeSelect} 
          stats={dashboardStats}
          wordCount={words.length}
        />
      )}

      {/* 2. 결과 화면 상태 */}
      {quizState === 'result' && (
        <QuizResult
          stats={stats}
          onRestart={resetQuiz}
          onBackToDashboard={() => setView('dashboard')}
        />
      )}

      {/* 3. 퀴즈 진행 상태 */}
      {quizState === 'quiz' && (
        <div className="animate-in fade-in duration-500">
          {/* 퀴즈 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleBackToModeSelect}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black transition-all bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">종료하기</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <Volume2 className={`w-3.5 h-3.5 ${soundEnabled ? 'text-blue-600' : 'text-slate-300'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Sound: {soundEnabled ? 'On' : 'Off'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <span className={`w-2.5 h-2.5 rounded-full ${aiMode ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  AI: {aiMode ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </div>

          {/* 퀴즈 컨텐츠 */}
          {(!selectedMode || (selectedMode.id !== 'toefl-complete' && (!queue || queue.length === 0 || !queue[currentIndex]))) ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-xl">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-slate-200 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">문제를 준비하고 있습니다</h3>
              <p className="text-slate-400 font-bold text-sm mb-8 text-center px-10">
                선택한 범위에 단어가 충분한지 확인해주세요. <br />
                문제가 계속 보이지 않는다면 모드 선택으로 돌아가주세요.
              </p>
              <button 
                onClick={handleBackToModeSelect}
                className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                모드 선택으로 돌아가기
              </button>
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

              {selectedMode.id === 'toefl-complete' && (
                <ToeflCompleteTheWordQuiz
                  aiConfig={aiConfig}
                  questionCount={toeflConfig.questionCount} 
                  targetScore={toeflConfig.targetScore}
                  onExit={handleBackToModeSelect}
                  db={db}
                  user={user}
                />
              )}

              {selectedMode.id === 'toefl-build' && (
                <ToeflBuildSentencePlaceholder onExit={handleBackToModeSelect} />
              )}
            </div>
          )}
        </div>
      )}

      {/* 설정 모달 (항상 렌더링 가능하지만 isOpen으로 제어) */}
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
