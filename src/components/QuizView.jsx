import React, { useState, useEffect } from 'react';
import { Brain, Settings as SettingsIcon, ArrowLeft } from './Icons';
import QuizModeSelector from './QuizModeSelector';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import ShortAnswerQuiz from './ShortAnswerQuiz';
import QuizResult from './QuizResult';
import ToeflCompleteTheWordQuiz from './ToeflCompleteTheWordQuiz';
import ToeflBuildSentencePlaceholder from './ToeflBuildSentencePlaceholder';

export default function QuizView({ words, setView, db, user, aiMode, setAiMode, apiKey }) {
  const [quizState, setQuizState] = useState('select'); // 'select', 'quiz', 'result'
  const [selectedMode, setSelectedMode] = useState(null); // 'multiple', 'short'
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [quizCount, setQuizCount] = useState(words.length);
  const [toeflQuestionCount, setToeflQuestionCount] = useState(5);
  const [toeflTargetScore, setToeflTargetScore] = useState(100);

  useEffect(() => {
    if (words.length > 0) {
      setQuizCount((prev) => Math.min(prev || words.length, words.length));
    }
  }, [words.length]);

  const clampQuizCount = (value) => {
    if (!Number.isFinite(value)) {
      return words.length > 0 ? 1 : 0;
    }
    if (words.length === 0) {
      return 0;
    }
    return Math.max(1, Math.min(value, words.length));
  };

  const clampToeflQuestionCount = (value) => {
    if (!Number.isFinite(value)) {
      return 1;
    }
    return Math.max(1, Math.min(value, 10));
  };

  const clampToeflTargetScore = (value) => {
    if (!Number.isFinite(value)) {
      return 100;
    }
    return Math.max(60, Math.min(value, 120));
  };

  const shuffleWords = (list) => {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startQuiz = (mode) => {
    setSelectedMode(mode);
    setQuizState('quiz');

    if (mode === 'multiple' || mode === 'short') {
      const shuffledWords = shuffleWords(words);
      const limitedQueue = shuffledWords.slice(0, clampQuizCount(quizCount));
      setQueue(limitedQueue);
      setCurrentIndex(0);
      setStats({ correct: 0, wrong: 0, total: 0 });
    }
  };

  const handleAnswer = (isCorrect) => {
    const newStats = {
      ...stats,
      correct: stats.correct + (isCorrect ? 1 : 0),
      wrong: stats.wrong + (isCorrect ? 0 : 1),
      total: stats.total + 1
    };
    setStats(newStats);

    if (isCorrect) {
      // 정답: 다음 문제로
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // 퀴즈 종료
        setQuizState('result');
      }
    } else {
      // 오답: 현재 단어를 큐 뒤로 보내기
      const currentWord = queue[currentIndex];
      const newQueue = [...queue];
      newQueue.splice(currentIndex, 1);
      newQueue.push(currentWord);
      setQueue(newQueue);

      // 인덱스가 큐 범위를 벗어나면 조정
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
  };

  const handleBackToModeSelect = () => {
    setQuizState('select');
    setSelectedMode(null);
    setQueue([]);
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, total: 0 });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        {quizState === 'quiz' ? (
          <button
            onClick={handleBackToModeSelect}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">뒤로 가기</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            AI 모드: <span className={`font-bold ${aiMode ? 'text-green-600' : 'text-gray-400'}`}>
              {aiMode ? 'ON' : 'OFF'}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AI 모드 설정 패널 */}
      {showSettings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">AI 모드 설정</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-700 font-medium">AI 기반 퀴즈 생성 및 채점</p>
              <p className="text-xs text-gray-500 mt-1">
                AI를 사용하면 더 정교한 문제와 채점이 가능하지만, API 비용이 발생합니다.
              </p>
            </div>
            <button
              onClick={() => setAiMode(!aiMode)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                aiMode ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  aiMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="quiz-count">
              문제 출제 개수
            </label>
            <div className="flex items-center gap-3">
              <input
                id="quiz-count"
                type="number"
                min={1}
                max={words.length}
                value={quizCount}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setQuizCount(clampQuizCount(value));
                }}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="text-xs text-gray-500">최대 {words.length}개</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="toefl-target">
                TOEFL 목표 점수
              </label>
              <input
                id="toefl-target"
                type="number"
                min={60}
                max={120}
                value={toeflTargetScore}
                onChange={(event) =>
                  setToeflTargetScore(clampToeflTargetScore(Number(event.target.value)))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="toefl-question-count">
                TOEFL 문제 개수
              </label>
              <input
                id="toefl-question-count"
                type="number"
                min={1}
                max={10}
                value={toeflQuestionCount}
                onChange={(event) => setToeflQuestionCount(clampToeflQuestionCount(Number(event.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="text-xs text-gray-600 bg-white rounded-lg p-3">
            <p className="font-medium mb-2">💡 모드별 차이점:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>AI OFF:</strong> 로컬 알고리즘으로 문제 생성, 정확한 문자열 매칭으로 채점</li>
              <li><strong>AI ON:</strong> Gemini API로 지능형 오답 생성, 의미론적 채점</li>
            </ul>
          </div>
        </div>
      )}

      {/* 퀴즈 상태에 따른 렌더링 */}
      {quizState === 'select' && (
        <QuizModeSelector onSelectMode={startQuiz} wordCount={words.length} />
      )}

      {quizState === 'quiz' && selectedMode === 'multiple' && (
        <MultipleChoiceQuiz
          word={queue[currentIndex]}
          allWords={words}
          onAnswer={handleAnswer}
          progress={{ current: currentIndex + 1, total: queue.length }}
          stats={stats}
          aiMode={aiMode}
          apiKey={apiKey}
        />
      )}

      {quizState === 'quiz' && selectedMode === 'short' && (
        <ShortAnswerQuiz
          word={queue[currentIndex]}
          onAnswer={handleAnswer}
          progress={{ current: currentIndex + 1, total: queue.length }}
          stats={stats}
          aiMode={aiMode}
          apiKey={apiKey}
        />
      )}

      {quizState === 'quiz' && selectedMode === 'toefl-complete' && (
        <ToeflCompleteTheWordQuiz
          apiKey={apiKey}
          questionCount={toeflQuestionCount}
          targetScore={toeflTargetScore}
          onExit={handleBackToModeSelect}
        />
      )}

      {quizState === 'quiz' && selectedMode === 'toefl-build' && (
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
