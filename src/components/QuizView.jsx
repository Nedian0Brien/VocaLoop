import React, { useState, useEffect, useRef, useMemo } from 'react';
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
      // Firebase Timestamp handling
      const timestamp = w.createdAt.seconds ? w.createdAt.seconds * 1000 : w.createdAt;
      return new Date(timestamp) > oneWeekAgo;
    }).length;

    return {
      learningRate: `${Math.round(avgRate)}%`,
      studiedCount: studiedThisWeek,
      recentAccuracy: '0%', // This should be linked to actual session history
      folderCount: folders.length,
      rateTrend: 0,
      accuracyTrend: 0
    };
  }, [words, folders]);

  // 학습률 추적: 각 단어의 세션 내 오답 기록
  const wordQuizTracker = useRef({}); 

  const startQuiz = (config) => {
    const { questionCount, selectedFolderIds, aiMode: sessionAiMode } = config;
    
    // Update global AI mode for the session if needed
    if (sessionAiMode !== aiMode) {
      setAiMode(sessionAiMode);
    }

    const modeId = selectedMode.id;
    
    if (modeId === 'toefl-complete') {
      setQuizState('quiz');
      setShowConfigModal(false);
      return;
    }

    setQuizState('quiz');
    setShowConfigModal(false);

    const targetWords = selectedFolderIds.length > 0
      ? words.filter(w => selectedFolderIds.includes(w.folderId))
      : words;

    const shuffledWords = [...targetWords].sort(() => Math.random() - 0.5);
    const limitedQueue = shuffledWords.slice(0, Math.min(questionCount, targetWords.length));
    
    setQueue(limitedQueue);
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, total: 0 });
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

    // 학습률 업데이트
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
        playSound('COMPLETE');
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
    setQuizState('select');
    setSelectedMode(null);
    setQueue([]);
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, total: 0 });
    wordQuizTracker.current = {};
  };

  const handleBackToModeSelect = () => {
    setQuizState('select');
    setSelectedMode(null);
    setQueue([]);
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, total: 0 });
    wordQuizTracker.current = {};
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Quiz UI Header (Only during quiz) */}
      {quizState === 'quiz' && (
        <div className="flex items-center justify-between mb-8 animate-in slide-in-from-top-4 duration-500">
          <button
            onClick={handleBackToModeSelect}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black transition-all bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">종료하기</span>
          </button>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <span className={`w-2 h-2 rounded-full ${aiMode ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              AI Mode: {aiMode ? 'Active' : 'Off'}
            </span>
          </div>
        </div>
      )}

      {/* 퀴즈 상태에 따른 렌더링 */}
      {quizState === 'select' && (
        <QuizDashboard 
          onSelectMode={handleModeSelect} 
          stats={dashboardStats}
          wordCount={words.length}
        />
      )}

      {/* Configuration Modal */}
      <QuizConfigModal 
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        mode={selectedMode}
        folders={folders}
        words={words}
        initialAiMode={aiMode}
        onStart={startQuiz}
      />

      {quizState === 'quiz' && selectedMode?.id === 'multiple' && (
        <MultipleChoiceQuiz
          word={queue[currentIndex]}
          allWords={words}
          onAnswer={handleAnswer}
          progress={{ current: currentIndex + 1, total: queue.length }}
          stats={stats}
          aiMode={aiMode}
          aiConfig={aiConfig}
        />
      )}

      {quizState === 'quiz' && selectedMode?.id === 'short' && (
        <ShortAnswerQuiz
          word={queue[currentIndex]}
          onAnswer={handleAnswer}
          progress={{ current: currentIndex + 1, total: queue.length }}
          stats={stats}
          aiMode={aiMode}
          aiConfig={aiConfig}
        />
      )}

      {quizState === 'quiz' && selectedMode?.id === 'toefl-complete' && (
        <ToeflCompleteTheWordQuiz
          aiConfig={aiConfig}
          questionCount={5} 
          targetScore={100}
          onExit={handleBackToModeSelect}
          db={db}
          user={user}
        />
      )}

      {quizState === 'quiz' && selectedMode?.id === 'toefl-build' && (
        <ToeflBuildSentencePlaceholder onExit={handleBackToModeSelect} />
      )}

      {quizState === 'result' && (
        <QuizResult
          stats={stats}
          onRestart={resetQuiz}
          onBackToDashboard={() => setView('dashboard')}
        />
      )}
    </div>
  );
}
