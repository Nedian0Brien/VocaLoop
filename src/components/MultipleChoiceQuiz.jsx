import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Volume2, Check, X, Sparkles, AlertCircle, FileText, Brain, ArrowRightLeft, Quote, ChevronRight } from './Icons';
import { generateMultipleChoiceOptions } from '../services/quizService';

const QuizSkeleton = () => (
  <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
    <div className="mb-6 px-1">
      <div className="flex justify-between mb-2">
        <div className="h-3 w-20 bg-gray-200 rounded-full animate-skeleton"></div>
        <div className="h-3 w-24 bg-gray-200 rounded-full animate-skeleton"></div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 animate-skeleton"></div>
    </div>
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="h-40 bg-slate-900 p-8 animate-skeleton opacity-10"></div>
      <div className="p-8">
        <div className="h-5 w-40 bg-gray-100 rounded-lg mb-8 animate-skeleton"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl border border-gray-100 animate-skeleton"></div>
          ))}
        </div>
        <div className="h-12 bg-gray-100 rounded-xl animate-skeleton"></div>
      </div>
    </div>
  </div>
);

export default function MultipleChoiceQuiz({ word, allWords, onAnswer, progress, stats, aiMode, aiConfig }) {
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollPositionRef = useRef(0);

  useLayoutEffect(() => {
    setLoading(true);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
  }, [word]);

  useEffect(() => {
    async function generateQuestion() {
      try {
        const generatedOptions = await generateMultipleChoiceOptions(word, allWords, aiMode, aiConfig);
        setOptions(generatedOptions);
      } catch (error) {
        console.error('문제 생성 실패:', error);
        const generatedOptions = await generateMultipleChoiceOptions(word, allWords, false, null);
        setOptions(generatedOptions);
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    }
    generateQuestion();
  }, [word, allWords, aiMode, aiConfig]);

  const handleSelectOption = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
  };

  const handleSubmit = useCallback(() => {
    if (!selectedOption || isAnswered) return;
    scrollPositionRef.current = window.scrollY;
    const correct = selectedOption === word.meaning_ko;
    setIsCorrect(correct);
    setIsAnswered(true);
  }, [isAnswered, selectedOption, word.meaning_ko]);

  const handleNextQuestion = useCallback(() => {
    if (!isAnswered) return;
    onAnswer(isCorrect);
  }, [isAnswered, isCorrect, onAnswer]);

  useEffect(() => {
    if (loading) return;
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable) return;
      if (event.key >= '1' && event.key <= '4' && !isAnswered) {
        const optionIndex = Number(event.key) - 1;
        const option = options[optionIndex];
        if (option) {
          event.preventDefault();
          setSelectedOption(option);
        }
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (isAnswered) handleNextQuestion();
        else handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextQuestion, handleSubmit, isAnswered, loading, options]);

  useLayoutEffect(() => {
    if (isAnswered) window.scrollTo({ top: scrollPositionRef.current });
  }, [isAnswered]);

  const speakWord = () => {
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  if (loading) return <QuizSkeleton />;

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-700">
      {/* 진행 상황 및 통계 */}
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
              <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Wrong</p>
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

      {/* 메인 퀴즈 카드 */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden ring-1 ring-black/[0.03]">
        {/* 헤더 */}
        <div className="bg-[#0f172a] text-white p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-200/70">Multiple Choice</span>
            </div>
            {aiMode && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-orange-900/20">
                <Sparkles className="w-3 h-3" />
                AI Enhanced
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight font-serif">{word.word}</h2>
            <button
              onClick={speakWord}
              className="w-11 h-11 bg-white/5 hover:bg-white/10 active:scale-90 rounded-xl transition-all border border-white/10 flex items-center justify-center group/btn"
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

        {/* 선택지 영역 */}
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-7 bg-blue-600 rounded-full shadow-sm shadow-blue-200" />
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              정확한 한국어 뜻을 선택하세요:
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {options.map((option, index) => {
              const isSelected = selectedOption === option;
              const isCorrectOption = option === word.meaning_ko;

              let cardStyle = 'bg-white border-2 border-slate-50 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5';
              let badgeStyle = 'bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:border-blue-500 group-hover:text-blue-600';

              if (isAnswered) {
                if (isCorrectOption) {
                  cardStyle = 'bg-green-50 border-2 border-green-500 shadow-md scale-[1.01] z-10';
                  badgeStyle = 'bg-green-500 border-transparent text-white';
                } else if (isSelected && !isCorrectOption) {
                  cardStyle = 'bg-red-50 border-2 border-red-500 opacity-90';
                  badgeStyle = 'bg-red-500 border-transparent text-white';
                } else {
                  cardStyle = 'bg-slate-50 border-2 border-slate-100 opacity-40 grayscale-[0.5]';
                  badgeStyle = 'bg-slate-100 border-transparent text-slate-300';
                }
              } else if (isSelected) {
                cardStyle = 'bg-blue-50/30 border-2 border-blue-600 shadow-lg scale-[1.02] z-10';
                badgeStyle = 'bg-blue-600 border-transparent text-white';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswered}
                  className={`group relative w-full text-left p-5 rounded-2xl transition-all duration-300 active:scale-[0.98] ${cardStyle} ${
                    isAnswered ? 'cursor-default' : 'cursor-pointer'
                  } h-full flex items-center overflow-hidden`}
                >
                  <div className="flex items-center gap-4 w-full relative z-10">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black text-xs transition-all duration-300 ${badgeStyle}`}>
                      {index + 1}
                    </div>
                    <span className={`flex-1 text-base font-bold transition-colors duration-300 ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                      {option}
                    </span>
                    {isAnswered && isCorrectOption && (
                      <Check className="w-5 h-5 text-green-600 stroke-[3px] animate-in zoom-in duration-300" />
                    )}
                    {isAnswered && isSelected && !isCorrectOption && (
                      <X className="w-5 h-5 text-red-600 stroke-[3px] animate-in zoom-in duration-300" />
                    )}
                  </div>
                  {!isAnswered && (
                    <span className="absolute -right-2 -bottom-4 text-7xl font-black text-slate-500/[0.03] select-none pointer-events-none group-hover:text-blue-500/10 transition-all duration-500">
                      {index + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 결과 섹션 */}
          <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isAnswered ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {/* 정답 피드백 */}
            <div className={`p-6 rounded-2xl mb-8 flex items-center gap-5 border-2 shadow-sm ${
              isCorrect ? 'bg-green-50/50 border-green-100 text-green-900' : 'bg-red-50/50 border-red-100 text-red-900'
            }`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {isCorrect ? <Check className="w-8 h-8 stroke-[3px]" /> : <AlertCircle className="w-8 h-8 stroke-[3px]" />}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-black tracking-tight mb-0.5">
                  {isCorrect ? 'Correct Answer! 🎉' : 'Study More 📚'}
                </h4>
                <p className="text-base font-bold opacity-70">
                  {isCorrect ? '잘 맞췄어요!' : <>정답은 <span className="text-red-700 font-black">{word.meaning_ko}</span> 입니다.</>}
                </p>
              </div>
            </div>

            {/* 정보 카드 그리드 */}
            <div className="space-y-5 mb-8">
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Definition</p>
                </div>
                {word.definitions?.length ? (
                  <ul className="space-y-2">
                    {word.definitions.map((def, idx) => (
                      <li key={idx} className="text-base font-bold text-slate-700 leading-snug pl-3 border-l-2 border-blue-200">
                        {def}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-400 text-sm italic">No definitions.</p>}
              </div>

              {word.nuance && (
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nuance</p>
                  </div>
                  <p className="text-sm font-bold leading-relaxed relative z-10">{word.nuance}</p>
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Brain className="w-16 h-16" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-indigo-50 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Quote className="w-4 h-4 text-indigo-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Examples</p>
                  </div>
                  <div className="space-y-4">
                    {word.examples?.slice(0, 2).map((ex, idx) => (
                      <div key={idx}>
                        <p className="text-sm text-slate-900 font-black mb-1">"{ex.en}"</p>
                        <p className="text-[11px] text-slate-400 font-bold">{ex.ko}</p>
                      </div>
                    )) || <p className="text-slate-400 text-sm italic">No examples.</p>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-amber-50 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synonyms</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {word.synonyms?.map((syn, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-black rounded-lg border border-amber-100">
                        {syn}
                      </span>
                    )) || <p className="text-slate-400 text-sm italic">No synonyms.</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* 다음 버튼 */}
            <button
              onClick={handleNextQuestion}
              className="w-full py-5 rounded-2xl font-black text-lg tracking-tight transition-all bg-slate-900 text-white hover:bg-black active:scale-[0.98] shadow-lg mb-12 flex items-center justify-center gap-3 group"
            >
              <span>Next Question</span>
              <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1.5" />
            </button>
          </div>

          {/* 메인 액션 버튼 */}
          {!isAnswered && (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className={`w-full py-5 rounded-2xl font-black text-lg tracking-tight transition-all flex items-center justify-center gap-3 shadow-lg ${
                selectedOption
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
              }`}
            >
              {selectedOption ? (
                <>
                  <span>정답 확인</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-black">
                    <span className="text-sm leading-none">↵</span>
                    <span>ENTER</span>
                  </div>
                </>
              ) : (
                '뜻을 선택하세요'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
