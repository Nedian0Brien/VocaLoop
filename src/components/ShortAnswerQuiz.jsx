import React, { useState, useLayoutEffect, useRef } from 'react';
import { Volume2, Check, X, Sparkles, AlertCircle, HelpCircle } from './Icons';
import { gradeShortAnswer, gradeWithAI } from '../services/quizService';

export default function ShortAnswerQuiz({ word, onAnswer, progress, stats, aiMode, apiKey }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const scrollPositionRef = useRef(0);

  const handleSubmit = async () => {
    if (!userAnswer.trim() || isAnswered || loading) return;

    scrollPositionRef.current = window.scrollY;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setLoading(true);

    try {
      let result;

      if (aiMode && apiKey) {
        // AI 모드: 의미론적 채점
        try {
          const aiResult = await gradeWithAI(userAnswer, word.meaning_ko, word, apiKey);
          result = {
            isCorrect: aiResult.isCorrect,
            feedback: aiResult.feedback,
            similarity: aiResult.isCorrect ? 1.0 : 0.5,
            mode: 'AI'
          };
        } catch (error) {
          console.warn('AI 채점 실패, 로컬 모드로 폴백:', error);
          const localResult = gradeShortAnswer(userAnswer, word.meaning_ko);
          result = {
            ...localResult,
            feedback: localResult.isCorrect ? '정답입니다!' : `유사도: ${Math.round(localResult.similarity * 100)}%`,
            mode: 'Local (AI 실패)'
          };
        }
      } else {
        // 로컬 모드: Levenshtein Distance
        const localResult = gradeShortAnswer(userAnswer, word.meaning_ko);
        result = {
          ...localResult,
          feedback: localResult.isCorrect ? '정답입니다!' : `유사도: ${Math.round(localResult.similarity * 100)}%`,
          mode: 'Local'
        };
      }

      setGradeResult(result);
      setIsAnswered(true);

      // 1.5초 후 다음 문제로
      setTimeout(() => {
        onAnswer(result.isCorrect);
      }, 2000);
    } catch (error) {
      console.error('채점 오류:', error);
      alert('채점 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    if (isAnswered) {
      window.scrollTo({ top: scrollPositionRef.current });
    }
  }, [isAnswered]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAnswered) {
      handleSubmit();
    }
  };

  const speakWord = () => {
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const getHint = () => {
    const answer = word.meaning_ko;
    // 첫 글자와 글자 수 힌트
    const firstChar = answer.charAt(0);
    const length = answer.length;
    return `"${firstChar}"로 시작하는 ${length}글자`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* 진행 상황 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span className="font-medium">
            문제 {progress.current} / {progress.total}
          </span>
          <span>
            정답: <span className="text-green-600 font-bold">{stats.correct}</span> |
            오답: <span className="text-red-600 font-bold">{stats.wrong}</span>
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-purple-600 h-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* 퀴즈 카드 */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium opacity-90">주관식 문제</span>
            <div className="flex items-center gap-2">
              {aiMode && (
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                  <Sparkles className="w-3 h-3" />
                  AI 채점
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-bold">{word.word}</h2>
            <button
              onClick={speakWord}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title="발음 듣기"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {word.pronunciation && (
            <p className="text-lg opacity-90 mt-2">{word.pronunciation}</p>
          )}

          {word.pos && (
            <span className="inline-block mt-3 px-3 py-1 bg-white/20 rounded-full text-sm">
              {word.pos}
            </span>
          )}
        </div>

        {/* 질문 */}
        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            이 단어의 뜻을 한글로 입력하세요
          </h3>

          {/* 입력창 */}
          <div className="mb-6">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isAnswered || loading}
              placeholder="예: 뜻밖의 행운"
              className={`w-full px-6 py-4 text-lg border-2 rounded-xl transition-all ${
                isAnswered
                  ? gradeResult?.isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-gray-300 focus:border-purple-500 focus:outline-none'
              } ${isAnswered || loading ? 'cursor-not-allowed' : ''}`}
              autoFocus
            />

            {/* 힌트 */}
            {!isAnswered && (
              <div className="mt-3">
                {showHint ? (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <HelpCircle className="w-4 h-4" />
                    <span>힌트: {getHint()}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowHint(true)}
                    className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
                  >
                    💡 힌트 보기
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 피드백 */}
          {isAnswered && gradeResult && (
            <div className={`p-4 rounded-xl mb-6 ${
              gradeResult.isCorrect
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {gradeResult.isCorrect ? (
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className={`font-bold mb-1 ${
                    gradeResult.isCorrect ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {gradeResult.isCorrect ? '정답입니다! 🎉' : '아쉽네요 😢'}
                  </h4>

                  <div className="text-sm space-y-2">
                    <p className="text-gray-700">
                      정답: <strong>{word.meaning_ko}</strong>
                    </p>
                    <p className="text-gray-700">
                      입력한 답: <strong>{userAnswer}</strong>
                    </p>

                    {gradeResult.feedback && (
                      <p className="text-gray-600 mt-2">
                        💬 {gradeResult.feedback}
                      </p>
                    )}

                    {!aiMode && gradeResult.similarity && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>유사도</span>
                          <span className="font-bold">{Math.round(gradeResult.similarity * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              gradeResult.similarity >= 0.8 ? 'bg-green-500' :
                              gradeResult.similarity >= 0.6 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${gradeResult.similarity * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {word.definitions && word.definitions.length > 0 && (
                    <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200">
                      💡 {word.definitions[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 버튼 */}
          {!isAnswered && (
            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || loading}
              className={`w-full py-4 rounded-xl font-bold transition-all ${
                userAnswer.trim() && !loading
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>채점 중...</span>
                </div>
              ) : (
                userAnswer.trim() ? '정답 확인' : '답을 입력해주세요'
              )}
            </button>
          )}
        </div>
      </div>

      {/* 안내 메시지 */}
      {!isAnswered && aiMode && (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-900">
              <p className="font-medium mb-1">AI 채점 모드</p>
              <p className="text-purple-700">
                의미가 유사하면 정답으로 인정됩니다. (예: "일시적인", "잠깐 동안의")
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
