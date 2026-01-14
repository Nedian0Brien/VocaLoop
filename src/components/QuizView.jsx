import React, { useState, useEffect } from 'react';
import { Brain, Settings as SettingsIcon, ArrowLeft } from './Icons';
import QuizModeSelector from './QuizModeSelector';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import ShortAnswerQuiz from './ShortAnswerQuiz';
import QuizResult from './QuizResult';

export default function QuizView({ words, setView, db, user, aiMode, setAiMode, apiKey }) {
  const [quizState, setQuizState] = useState('select'); // 'select', 'quiz', 'result'
  const [selectedMode, setSelectedMode] = useState(null); // 'multiple', 'short'
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [showSettings, setShowSettings] = useState(false);

  // 학습할 단어가 없는 경우
  if (!words || words.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
        <Brain className="w-16 h-16 text-blue-200 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">단어가 없습니다</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          먼저 Dashboard에서 단어를 추가해주세요.
        </p>
        <button
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => setView('dashboard')}
        >
          Dashboard로 이동
        </button>
      </div>
    );
  }

  const startQuiz = (mode) => {
    setSelectedMode(mode);
    // 단어 큐 초기화 (모든 단어 복사)
    setQueue([...words]);
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, total: 0 });
    setQuizState('quiz');
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">뒤로 가기</span>
        </button>

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
        <QuizModeSelector onSelectMode={startQuiz} />
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
