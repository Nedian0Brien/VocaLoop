import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Volume2, Check, X, Sparkles, AlertTriangle, FileText, Brain, ArrowRightLeft, Quote, ChevronRight } from './Icons';
import { gradeShortAnswer, gradeWithAI } from '../services/quizService';
import { hasAiProviderAccess } from '../services/aiModelService';
import { playSound } from '../utils/soundEffects';
import { speakEnglishWord } from '../utils/speechSynthesis';
import { Badge } from '../design-system';

export default function ShortAnswerQuiz({
  word,
  onAnswer,
  progress,
  stats,
  aiMode,
  aiConfig,
  soundEnabled = true,
  direction = 'en-ko',
  onAcceptedAnswer,
}) {
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const scrollPositionRef = useRef(0);
  const isKoreanToEnglish = direction === 'ko-en';
  const correctAnswer = isKoreanToEnglish ? word?.word : word?.meaning_ko;
  const promptValue = isKoreanToEnglish ? word?.meaning_ko : word?.word;
  const inputLabel = isKoreanToEnglish ? '영어 단어 입력' : '한국어 뜻 입력';
  const quizMode = isKoreanToEnglish ? 'short-ko-en' : 'short-en-ko';
  const wordResetKey = word?.id ?? word?.word ?? '';
  const gradeOptions = {
    acceptedAnswers: word?.accepted_answers,
    mode: quizMode,
  };
  const hasAiReviewAccess = hasAiProviderAccess(aiConfig || {});
  const canRequestAiReview = Boolean(
    isAnswered &&
    gradeResult &&
    !gradeResult.isCorrect &&
    !aiReviewLoading &&
    hasAiReviewAccess
  );

  const speakWord = useCallback(() => {
    if (!word?.word || !soundEnabled || isKoreanToEnglish) return;
    speakEnglishWord(word.word);
  }, [isKoreanToEnglish, word?.word, soundEnabled]);

  useEffect(() => {
    setUserAnswer('');
    setIsAnswered(false);
    setGradeResult(null);
    setAiReviewError('');
    setAiReviewLoading(false);
    setShowHint(false);
    if (wordResetKey && soundEnabled) speakWord();
  }, [wordResetKey, speakWord, soundEnabled]);

  const handleSubmit = async () => {
    if (!userAnswer.trim() || isAnswered || loading) return;

    scrollPositionRef.current = window.scrollY;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setLoading(true);

    try {
      let result;
      if (!isKoreanToEnglish && aiMode && hasAiProviderAccess(aiConfig)) {
        try {
          const aiResult = await gradeWithAI(userAnswer, correctAnswer, word, aiConfig, gradeOptions);
          result = {
            ...aiResult,
            isCorrect: aiResult.isCorrect,
            feedback: aiResult.feedback,
            similarity: aiResult.isCorrect ? 1.0 : 0.5,
            mode: 'AI',
          };
        } catch (error) {
          console.warn('AI 채점 실패, 로컬 모드로 폴백:', error);
          const localResult = gradeShortAnswer(userAnswer, word.meaning_ko, gradeOptions);
          result = {
            ...localResult,
            feedback: localResult.isCorrect ? '정답입니다!' : `유사도: ${Math.round(localResult.similarity * 100)}%`,
            mode: 'Local (AI 실패)',
          };
        }
      } else {
        const localResult = gradeShortAnswer(userAnswer, correctAnswer, gradeOptions);
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

  const handleAiReview = async () => {
    if (!isAnswered || !gradeResult || gradeResult.isCorrect || aiReviewLoading || !hasAiReviewAccess) return;

    setAiReviewLoading(true);
    setAiReviewError('');
    try {
      const aiResult = await gradeWithAI(userAnswer, correctAnswer, word, aiConfig, gradeOptions);
      const reviewFeedback = aiResult.feedback || (
        aiResult.isCorrect
          ? 'AI가 답안과 정답의 의미가 같다고 판단했습니다.'
          : 'AI가 답안과 정답의 핵심 의미가 다르다고 판단했습니다.'
      );
      const nextResult = {
        ...gradeResult,
        ...aiResult,
        feedback: reviewFeedback,
        similarity: aiResult.isCorrect ? 1.0 : gradeResult.similarity,
        mode: 'AI Review',
      };
      setGradeResult(nextResult);
      if (aiResult.isCorrect) {
        if (soundEnabled) playSound('SUCCESS');
        await onAcceptedAnswer?.(word?.id, {
          mode: quizMode,
          answer: userAnswer.trim(),
          source: 'ai-review',
          feedback: reviewFeedback,
        });
      }
    } catch (error) {
      console.error('AI 재검토 실패:', error);
      setAiReviewError('AI 재검토에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setAiReviewLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAnswered) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  const handleNextQuestion = useCallback(() => {
    if (!isAnswered || !gradeResult) return;
    onAnswer(gradeResult.isCorrect);
  }, [gradeResult, isAnswered, onAnswer]);

  // 채점 후에는 입력창이 비활성화되어 포커스를 잃으므로,
  // 전역 Enter 키로 다음 문제로 넘어갈 수 있게 한다.
  useEffect(() => {
    if (!isAnswered) return;
    const handleNextKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', handleNextKey);
    return () => window.removeEventListener('keydown', handleNextKey);
  }, [isAnswered, handleNextQuestion]);

  const getHint = () => {
    const answer = correctAnswer || '';
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
              <span className="text-2xs font-black uppercase tracking-wider text-brand-200/70">
                {isKoreanToEnglish ? 'Short Answer 한→영' : 'Short Answer 영→한'}
              </span>
            </div>
            {aiMode && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-warning-400 to-warning-500 px-3 py-1 rounded-md text-2xs font-black uppercase shadow-lg shadow-warning-700/20">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI Grading
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <h2 className={`font-black tracking-tight ${isKoreanToEnglish ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl font-serif'}`}>
              {promptValue}
            </h2>
            {!isKoreanToEnglish && (
              <button
                onClick={speakWord}
                disabled={!soundEnabled}
                aria-label="발음 듣기"
                className={`w-11 h-11 bg-white/5 hover:bg-white/10 active:scale-90 rounded-md transition-all border border-white/10 flex items-center justify-center group/btn ${!soundEnabled ? 'opacity-20 cursor-not-allowed' : ''}`}
              >
                <Volume2 className="w-5 h-5 text-white/80 group-hover/btn:text-white transition-colors" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mt-5 relative z-10">
            {!isKoreanToEnglish && word.pronunciation && (
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
                <h3 className="text-lg font-black text-surface-800 tracking-tight">
                  {isKoreanToEnglish ? '영어 단어를 입력하세요' : '한국어 뜻을 입력하세요'}
                </h3>
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
                placeholder={showHint ? getHint() : isKoreanToEnglish ? '영어 단어 입력...' : '뜻을 입력하세요...'}
                aria-label={inputLabel}
                lang={isKoreanToEnglish ? 'en' : undefined}
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
                  {gradeResult?.isCorrect
                    ? <>{isKoreanToEnglish ? '정답:' : '전체 뜻:'} <span className="text-success-800 font-black">{correctAnswer}</span></>
                    : <>정답은 <span className="text-danger-700 font-black">{correctAnswer}</span> 입니다.</>}
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

            {gradeResult?.feedback && (
              <div className="mt-3 rounded-xl border border-surface-200 bg-white px-4 py-3">
                {gradeResult.mode === 'AI Review' && (
                  <p className="mb-1 text-2xs font-black uppercase tracking-widest text-brand-600">AI 판단 이유</p>
                )}
                <p className="text-sm font-bold text-surface-600">{gradeResult.feedback}</p>
              </div>
            )}

            {!gradeResult?.isCorrect && hasAiReviewAccess && (
              <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-black text-brand-800">의미가 맞는 답이라면 AI 재검토를 요청할 수 있습니다.</p>
                    <p className="mt-1 text-xs font-bold text-brand-600">정답으로 인정되면 이 표현은 다음 채점부터 자동으로 반영됩니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiReview}
                    disabled={!canRequestAiReview}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-200"
                  >
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    {aiReviewLoading ? '재검토 중...' : 'AI 재검토'}
                  </button>
                </div>
                {aiReviewError && (
                  <p className="mt-3 text-xs font-bold text-danger-600">{aiReviewError}</p>
                )}
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
