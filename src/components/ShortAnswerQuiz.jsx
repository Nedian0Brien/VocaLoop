import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Volume2, Check, X, Sparkles, AlertCircle, HelpCircle } from './Icons';
import { gradeShortAnswer, gradeWithAI } from '../services/quizService';
import { playSound } from '../utils/soundEffects';

export default function ShortAnswerQuiz({ word, onAnswer, progress, stats, aiMode, aiConfig, soundEnabled = true }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const scrollPositionRef = useRef(0);

  const speakWord = useCallback(() => {
    if (!word?.word || !soundEnabled) return;
    // 이전 재생 중인 음성이 있다면 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }, [word?.word, soundEnabled]);

  // 단어가 바뀔 때마다 초기화 및 발음 재생
  useEffect(() => {
    setUserAnswer('');
    setIsAnswered(false);
    setGradeResult(null);
    setShowHint(false);
    if (word && soundEnabled) {
      speakWord();
    }
  }, [word, speakWord, soundEnabled]);

  const handleSubmit = async () => {
    if (!userAnswer.trim() || isAnswered || loading) return;

    scrollPositionRef.current = window.scrollY;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setLoading(true);

    try {
      let result;

      if (aiMode && aiConfig?.apiKey) {
        // AI 모드: 의미론적 채점
        try {
          const aiResult = await gradeWithAI(userAnswer, word.meaning_ko, word, aiConfig);
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
      
      // 정답/오답 효과음 재생
      if (soundEnabled) {
        playSound(result.isCorrect ? 'SUCCESS' : 'FAIL');
      }

      // 2초 후 다음 문제로
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAnswered) {
      handleSubmit();
    }
  };

  const getHint = () => {
    const answer = word.meaning_ko;
    const firstChar = answer.charAt(0);
    const length = answer.length;
    return `${firstChar}${'*'.repeat(length - 1)} (${length}글자)`;
  };

  useLayoutEffect(() => {
    if (isAnswered) {
      window.scrollTo({ top: scrollPositionRef.current });
    }
  }, [isAnswered]);

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-700">
      {/* 진행 상황 */}
      <div className="mb-8 px-1">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Quiz Session</p>
            <h4 className="text-xl font-black text-gray-900 tracking-tight">
              Q. <span className="text-blue-600">{progress.current}</span>
              <span className="text-gray-300 mx-1.5 font-light">/</span>
              <span className="text-gray-400 text-sm font-bold">{progress.total}</span>
            </h4>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mb-0.5">Correct</p>
              <p className="text-lg font-black text-green-600 leading-none">{stats.correct}</p>
            </div>
            <div className="text-right border-l border-gray-100 pl-4">
              <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">Wrong</p>
              <p className="text-lg font-black text-red-500 leading-none">{stats.wrong}</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 relative overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out relative"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden ring-1 ring-black/[0.03]">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-200/70">Short Answer</span>
            </div>
            {aiMode && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-orange-900/20">
                <Sparkles className="w-3 h-3" />
                AI Grading
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight font-serif">{word.word}</h2>
            <button
              onClick={speakWord}
              disabled={!soundEnabled}
              className={`w-11 h-11 bg-white/5 hover:bg-white/10 active:scale-90 rounded-xl transition-all border border-white/10 flex items-center justify-center group/btn ${!soundEnabled ? 'opacity-20 cursor-not-allowed' : ''}`}
            >
              <Volume2 className="w-5 h-5 text-white/80 group-hover/btn:text-white transition-colors" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-5 relative z-10">
            {word.pronunciation && (
              <p className="text-lg font-serif italic text-blue-200/50">{word.pronunciation}</p>
            )}
            {word.pos && (
              <span className="px-2.5 py-0.5 bg-blue-500/10 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-400/10 text-blue-400/80">
                {word.pos}
              </span>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-7 bg-blue-600 rounded-full shadow-sm shadow-blue-200" />
                <h3 className="text-lg font-black text-slate-800 tracking-tight">한국어 뜻을 입력하세요</h3>
              </div>
              <button 
                onClick={() => setShowHint(true)}
                disabled={isAnswered || showHint}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-30 disabled:no-underline"
              >
                Get Hint
              </button>
            </div>
            
            <div className="relative group">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isAnswered || loading}
                placeholder={showHint ? getHint() : "뜻을 입력하세요..."}
                className={`w-full p-6 text-xl font-bold bg-slate-50 border-2 rounded-2xl transition-all outline-none ${
                  isAnswered 
                    ? gradeResult?.isCorrect 
                      ? 'border-green-500 bg-green-50 text-green-900' 
                      : 'border-red-500 bg-red-50 text-red-900'
                    : 'border-slate-100 focus:border-blue-500 focus:bg-white focus:shadow-xl focus:shadow-blue-500/5'
                }`}
                autoFocus
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Feedback Section */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isAnswered ? 'max-h-96 opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
            <div className={`p-6 rounded-2xl flex items-center gap-5 border-2 ${
              gradeResult?.isCorrect ? 'bg-green-100/50 border-green-200 text-green-900' : 'bg-red-100/50 border-red-200 text-red-900'
            }`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                gradeResult?.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {gradeResult?.isCorrect ? <Check className="w-8 h-8 stroke-[3px]" /> : <X className="w-8 h-8 stroke-[3px]" />}
              </div>
              <div>
                <h4 className="text-xl font-black tracking-tight mb-0.5">
                  {gradeResult?.isCorrect ? 'Great Job! 🎉' : 'Incorrect 📚'}
                </h4>
                <p className="text-base font-bold opacity-70">
                  {gradeResult?.isCorrect ? gradeResult.feedback : <>정답은 <span className="text-red-700 font-black">{word.meaning_ko}</span> 입니다.</>}
                </p>
              </div>
            </div>
          </div>

          {/* Main Action Button */}
          {!isAnswered && (
            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || loading}
              className={`w-full py-5 rounded-2xl font-black text-lg tracking-tight transition-all flex items-center justify-center gap-3 shadow-lg ${
                userAnswer.trim() && !loading
                  ? 'bg-slate-800 text-white hover:bg-slate-900 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
              }`}
            >
              {loading ? (
                '채점 중...'
              ) : (
                <>
                  <span>정답 확인</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-black">
                    <span className="text-sm leading-none">↵</span>
                    <span>ENTER</span>
                  </div>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
