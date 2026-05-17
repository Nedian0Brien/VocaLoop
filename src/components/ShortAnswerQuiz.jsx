import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Volume2, Check, X, Sparkles, AlertTriangle, FileText, Brain, ArrowRightLeft, Quote, ChevronRight } from './Icons';
import { gradeShortAnswer, gradeWithAI } from '../services/quizService';
import { playSound } from '../utils/soundEffects';
import { Badge } from '../design-system';

export default function ShortAnswerQuiz({ word, onAnswer, progress, stats, aiMode, aiConfig, soundEnabled = true }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const scrollPositionRef = useRef(0);

  const speakWord = useCallback(() => {
    if (!word?.word || !soundEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }, [word?.word, soundEnabled]);

  useEffect(() => {
    setUserAnswer('');
    setIsAnswered(false);
    setGradeResult(null);
    setShowHint(false);
    if (word && soundEnabled) speakWord();
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
        try {
          const aiResult = await gradeWithAI(userAnswer, word.meaning_ko, word, aiConfig);
          result = {
            ...aiResult,
            isCorrect: aiResult.isCorrect,
            feedback: aiResult.feedback,
            similarity: aiResult.isCorrect ? 1.0 : 0.5,
            mode: 'AI',
          };
        } catch (error) {
          console.warn('AI 채점 실패, 로컬 모드로 폴백:', error);
          const localResult = gradeShortAnswer(userAnswer, word.meaning_ko);
          result = {
            ...localResult,
            feedback: localResult.isCorrect ? '정답입니다!' : `유사도: ${Math.round(localResult.similarity * 100)}%`,
            mode: 'Local (AI 실패)',
          };
        }
      } else {
        const localResult = gradeShortAnswer(userAnswer, word.meaning_ko);
        result = {
          ...localResult,
          feedback: localResult.isCorrect ? '정답입니다!' : `유사도: ${Math.round(localResult.similarity * 100)}%`,
          mode: 'Local',
        };
      }

      setGradeResult(result);
      setIsAnswered(true);
      if (soundEnabled) playSound(result.isCorrect ? 'SUCCESS' : 'FAIL');
    } catch (error) {
      console.error('채점 오류:', error);
      alert('채점 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAnswered) handleSubmit();
  };

  const handleNextQuestion = useCallback(() => {
    if (!isAnswered || !gradeResult) return;
    onAnswer(gradeResult.isCorrect);
  }, [gradeResult, isAnswered, onAnswer]);

  const getHint = () => {
    const answer = word.meaning_ko;
    const firstChar = answer.charAt(0);
    const length = answer.length;
    return `${firstChar}${'*'.repeat(length - 1)} (${length}글자)`;
  };

  useLayoutEffect(() => {
    if (isAnswered) window.scrollTo({ top: scrollPositionRef.current });
  }, [isAnswered]);

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-700">
      {/* 진행 상황 */}
      <div className="mb-8 px-1">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-0.5">Quiz Session</p>
            <h4 className="text-xl font-black text-surface-900 tracking-tight">
              Q. <span className="text-brand-600">{progress.current}</span>
              <span className="text-surface-300 mx-1.5 font-light">/</span>
              <span className="text-surface-400 text-sm font-bold">{progress.total}</span>
            </h4>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-2xs font-black text-success-500 uppercase tracking-widest mb-0.5">Correct</p>
              <p className="text-lg font-black text-success-600 leading-none">{stats.correct}</p>
            </div>
            <div className="text-right border-l border-surface-100 pl-4">
              <p className="text-2xs font-black text-danger-400 uppercase tracking-widest mb-1">Wrong</p>
              <p className="text-lg font-black text-danger-500 leading-none">{stats.wrong}</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-surface-100 rounded-pill h-2 relative overflow-hidden">
          <div
            className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-indigo-pair-600 transition-all duration-1000 ease-out relative"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-[var(--shadow-elevated)] border border-surface-100 overflow-hidden ring-1 ring-black/[0.03]">
        {/* Header */}
        <div className="bg-gradient-to-br from-surface-800 to-surface-900 text-white p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-brand-500/10 rounded-pill blur-[80px] pointer-events-none" />

          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-md border border-white/10">
              <span className="text-2xs font-black uppercase tracking-wider text-brand-200/70">Short Answer</span>
            </div>
            {aiMode && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-warning-400 to-warning-500 px-3 py-1 rounded-md text-2xs font-black uppercase shadow-lg shadow-warning-700/20">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI Grading
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight font-serif">{word.word}</h2>
            <button
              onClick={speakWord}
              disabled={!soundEnabled}
              aria-label="발음 듣기"
              className={`w-11 h-11 bg-white/5 hover:bg-white/10 active:scale-90 rounded-md transition-all border border-white/10 flex items-center justify-center group/btn ${!soundEnabled ? 'opacity-20 cursor-not-allowed' : ''}`}
            >
              <Volume2 className="w-5 h-5 text-white/80 group-hover/btn:text-white transition-colors" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-5 relative z-10">
            {word.pronunciation && (
              <p className="text-lg font-serif italic text-brand-200/50">{word.pronunciation}</p>
            )}
            {word.pos && (
              <span className="px-2.5 py-0.5 bg-brand-500/10 rounded-xs text-2xs font-black uppercase tracking-wider border border-brand-400/10 text-brand-400/80">
                {word.pos}
              </span>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-7 bg-brand-600 rounded-pill shadow-sm shadow-brand-200" aria-hidden="true" />
                <h3 className="text-lg font-black text-surface-800 tracking-tight">한국어 뜻을 입력하세요</h3>
              </div>
              <button
                onClick={() => setShowHint(true)}
                disabled={isAnswered || showHint}
                className="text-2xs font-black text-brand-600 uppercase tracking-widest hover:underline disabled:opacity-30 disabled:no-underline"
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
                placeholder={showHint ? getHint() : '뜻을 입력하세요...'}
                aria-label="한국어 뜻 입력"
                className={`w-full p-6 text-xl font-bold bg-surface-50 text-surface-900 placeholder-surface-400 border-2 rounded-xl transition-all outline-none ${
                  isAnswered
                    ? gradeResult?.isCorrect
                      ? 'border-success-500 bg-success-50 text-success-700'
                      : 'border-danger-500 bg-danger-50 text-danger-700'
                    : 'border-surface-100 focus:border-brand-500 focus:bg-surface-0 focus:shadow-xl focus:shadow-brand-500/5'
                }`}
                autoFocus
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 border-4 border-brand-600/30 border-t-brand-600 rounded-pill animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Feedback */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isAnswered ? 'max-h-[3000px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
            <div className={`p-6 rounded-xl flex items-center gap-5 border-2 ${
              gradeResult?.isCorrect ? 'bg-success-100/50 border-success-200 text-success-700' : 'bg-danger-100/50 border-danger-200 text-danger-700'
            }`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                gradeResult?.isCorrect ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
              }`}>
                {gradeResult?.isCorrect ? <Check className="w-8 h-8 stroke-[3px]" aria-hidden="true" /> : <X className="w-8 h-8 stroke-[3px]" aria-hidden="true" />}
              </div>
              <div>
                <h4 className="text-xl font-black tracking-tight mb-0.5">
                  {gradeResult?.isCorrect ? 'Great Job! 🎉' : 'Incorrect 📚'}
                </h4>
                <p className="text-base font-bold opacity-70">
                  {gradeResult?.isCorrect ? <>전체 뜻: <span className="text-success-800 font-black">{word.meaning_ko}</span></> : <>정답은 <span className="text-danger-700 font-black">{word.meaning_ko}</span> 입니다.</>}
                </p>
              </div>
            </div>

            {gradeResult?.unmatchedAnswers?.length > 0 && (
              <div className="mt-3 rounded-xl border border-warning-200 bg-warning-50/80 p-4 text-warning-800">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-warning-600" aria-hidden="true" />
                  <p className="text-sm font-black">정답으로 인정되지 않은 입력</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gradeResult.unmatchedAnswers.map((answer, index) => (
                    <span
                      key={`${answer}-${index}`}
                      className="rounded-md border border-warning-300 bg-white/70 px-2.5 py-1 text-sm font-bold text-warning-700"
                    >
                      {answer}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleNextQuestion}
              className="w-full py-5 rounded-xl font-black text-lg tracking-tight transition-all bg-surface-800 text-white hover:bg-surface-900 active:scale-[0.98] shadow-lg my-8 flex items-center justify-center gap-3 group"
            >
              <span>Next Question</span>
              <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1.5" aria-hidden="true" />
            </button>

            <div className="space-y-5">
              <div className="bg-surface-50/50 rounded-xl border border-surface-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-4 h-4 text-brand-500" aria-hidden="true" />
                  <p className="text-2xs font-black text-surface-400 uppercase tracking-widest">Definition</p>
                </div>
                {word.definitions?.length ? (
                  <ul className="space-y-2">
                    {word.definitions.map((def, idx) => (
                      <li key={idx} className="text-base font-bold text-surface-700 leading-snug pl-3 border-l-2 border-brand-200">
                        {def}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-surface-400 text-sm italic">No definitions.</p>}
              </div>

              {word.nuance && (
                <div className="bg-surface-800 text-surface-100 rounded-xl p-6 shadow-xl relative overflow-hidden border border-surface-700">
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <Brain className="w-4 h-4 text-accent-400" aria-hidden="true" />
                    <p className="text-2xs font-black text-surface-400 uppercase tracking-widest">Nuance</p>
                  </div>
                  <p className="text-sm font-bold leading-relaxed relative z-10">{word.nuance}</p>
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Brain className="w-16 h-16" aria-hidden="true" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-indigo-pair-500/10 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Quote className="w-4 h-4 text-indigo-pair-500" aria-hidden="true" />
                    <p className="text-2xs font-black text-surface-400 uppercase tracking-widest">Examples</p>
                  </div>
                  <div className="space-y-4">
                    {word.examples?.slice(0, 2).map((ex, idx) => (
                      <div key={idx}>
                        <p className="text-sm text-surface-900 font-black mb-1">"{ex.en}"</p>
                        <p className="text-xs text-surface-400 font-bold">{ex.ko}</p>
                      </div>
                    )) || <p className="text-surface-400 text-sm italic">No examples.</p>}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-warning-500/10 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <ArrowRightLeft className="w-4 h-4 text-warning-500" aria-hidden="true" />
                    <p className="text-2xs font-black text-surface-400 uppercase tracking-widest">Synonyms</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {word.synonyms?.map((syn, idx) => (
                      <Badge key={idx} tone="warning" size="sm" style="tag">{syn}</Badge>
                    )) || <p className="text-surface-400 text-sm italic">No synonyms.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isAnswered && (
            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || loading}
              className={`w-full py-5 rounded-xl font-black text-lg tracking-tight transition-all flex items-center justify-center gap-3 shadow-lg ${
                userAnswer.trim() && !loading
                  ? 'bg-surface-800 text-white hover:bg-surface-900 active:scale-[0.98]'
                  : 'bg-surface-100 text-surface-400 cursor-not-allowed border border-surface-200 shadow-none'
              }`}
            >
              {loading ? (
                '채점 중...'
              ) : (
                <>
                  <span>정답 확인</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-md text-2xs font-black">
                    <span className="text-sm leading-none" aria-hidden="true">↵</span>
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
