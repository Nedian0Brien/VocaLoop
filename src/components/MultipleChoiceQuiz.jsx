import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Volume2, Check, X, Sparkles, AlertCircle, FileText, Brain, ArrowRightLeft, Quote, ChevronRight } from './Icons';
import { generateMultipleChoiceOptions } from '../services/quizService';

const QuizSkeleton = () => (
  <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
    <div className="mb-8 px-2">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-24 bg-gray-200 rounded-full animate-skeleton"></div>
        <div className="h-4 w-32 bg-gray-200 rounded-full animate-skeleton"></div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 animate-skeleton shadow-inner"></div>
    </div>
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
      <div className="h-56 bg-slate-900 p-10 animate-skeleton opacity-20"></div>
      <div className="p-10">
        <div className="h-7 w-48 bg-gray-100 rounded-lg mb-10 animate-skeleton"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-50 rounded-[1.5rem] border border-gray-100 animate-skeleton"></div>
          ))}
        </div>
        <div className="h-16 bg-gray-100 rounded-[1.5rem] animate-skeleton"></div>
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
    <div className="max-w-3xl mx-auto animate-in fade-in duration-700">
      {/* 진행 상황 및 통계 */}
      <div className="mb-10 group">
        <div className="flex items-end justify-between mb-4 px-2">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Learning Session</p>
            <h4 className="text-2xl font-black text-gray-900 tracking-tight">
              Question <span className="text-blue-600">{progress.current}</span>
              <span className="text-gray-300 mx-2 text-xl">/</span>
              <span className="text-gray-400 text-lg font-bold">{progress.total}</span>
            </h4>
          </div>
          <div className="flex gap-5">
            <div className="text-right">
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-0.5">Correct</p>
              <p className="text-2xl font-black text-green-600 leading-none">{stats.correct}</p>
            </div>
            <div className="text-right border-l border-gray-100 pl-5">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">Wrong</p>
              <p className="text-2xl font-black text-red-500 leading-none">{stats.wrong}</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 p-1 shadow-inner relative overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-1000 ease-out relative"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>

      {/* 메인 퀴즈 카드 */}
      <div className="bg-white rounded-[3rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden ring-1 ring-black/5">
        {/* 프리미엄 헤더 (Deep Navy) */}
        <div className="bg-[#0f172a] text-white p-10 sm:p-14 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-[-30%] left-[-10%] w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/90">Multiple Choice</span>
            </div>
            {aiMode && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-2xl shadow-orange-900/40">
                <Sparkles className="w-3.5 h-3.5" />
                AI ENHANCED
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-8 relative z-10">
            <h2 className="text-6xl sm:text-7xl font-black tracking-tighter font-serif leading-none drop-shadow-sm">{word.word}</h2>
            <button
              onClick={speakWord}
              className="w-16 h-16 bg-white/5 hover:bg-white/15 active:scale-90 rounded-[1.5rem] transition-all border border-white/10 flex items-center justify-center group/btn shadow-xl"
              title="Listen Pronunciation"
            >
              <Volume2 className="w-8 h-8 text-white group-hover/btn:scale-110 transition-transform" />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-8 relative z-10">
            {word.pronunciation && (
              <p className="text-2xl font-serif italic text-blue-200/60 tracking-wider">{word.pronunciation}</p>
            )}
            {word.pos && (
              <span className="px-4 py-1.5 bg-blue-500/20 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] border border-blue-400/20 text-blue-300">
                {word.pos}
              </span>
            )}
          </div>
        </div>

        {/* 질문 및 선택지 영역 */}
        <div className="p-10 sm:p-14">
          <div className="flex items-center gap-5 mb-12">
            <div className="w-2.5 h-12 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-200" />
            <h3 className="text-2xl font-black text-gray-900 tracking-tight italic opacity-90">
              Select the most accurate Korean meaning:
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            {options.map((option, index) => {
              const isSelected = selectedOption === option;
              const isCorrectOption = option === word.meaning_ko;

              let cardStyle = 'bg-white border-2 border-gray-100 hover:border-blue-500 hover:shadow-[0_20px_50px_-15px_rgba(59,130,246,0.25)] hover:-translate-y-1.5';
              let badgeStyle = 'bg-gray-50 border-gray-200 text-gray-400 group-hover:bg-blue-50 group-hover:border-blue-500 group-hover:text-blue-600';

              if (isAnswered) {
                if (isCorrectOption) {
                  cardStyle = 'bg-green-50 border-2 border-green-500 shadow-xl shadow-green-100 scale-[1.03] z-10';
                  badgeStyle = 'bg-green-500 border-transparent text-white';
                } else if (isSelected && !isCorrectOption) {
                  cardStyle = 'bg-red-50 border-2 border-red-500 opacity-90 scale-[0.97]';
                  badgeStyle = 'bg-red-500 border-transparent text-white';
                } else {
                  cardStyle = 'bg-gray-50 border-2 border-gray-100 opacity-40 grayscale-[0.5]';
                  badgeStyle = 'bg-gray-100 border-transparent text-gray-300';
                }
              } else if (isSelected) {
                cardStyle = 'bg-blue-50/50 border-2 border-blue-600 shadow-2xl shadow-blue-100 scale-[1.04] z-10';
                badgeStyle = 'bg-blue-600 border-transparent text-white';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswered}
                  className={`group relative w-full text-left p-7 rounded-[2.5rem] transition-all duration-500 active:scale-[0.96] ${cardStyle} ${
                    isAnswered ? 'cursor-default' : 'cursor-pointer'
                  } h-full flex items-center overflow-hidden`}
                >
                  <div className="flex items-center gap-6 w-full relative z-10">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-[1.25rem] border-2 flex items-center justify-center font-black text-base transition-all duration-500 ${badgeStyle}`}>
                      {index + 1}
                    </div>
                    <span className={`flex-1 text-xl font-bold transition-colors duration-500 ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                      {option}
                    </span>
                    {isAnswered && isCorrectOption && (
                      <div className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200 animate-in zoom-in duration-500">
                        <Check className="w-7 h-7 stroke-[4px]" />
                      </div>
                    )}
                    {isAnswered && isSelected && !isCorrectOption && (
                      <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200 animate-in zoom-in duration-500">
                        <X className="w-7 h-7 stroke-[4px]" />
                      </div>
                    )}
                  </div>
                  {!isAnswered && (
                    <span className="absolute -right-4 -bottom-6 text-[10rem] font-black text-gray-500/5 select-none pointer-events-none group-hover:text-blue-500/10 transition-all duration-700 group-hover:scale-110">
                      {index + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 결과 및 정보 섹션 */}
          <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isAnswered ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {/* 정답 피드백 배너 */}
            <div className={`p-10 rounded-[3rem] mb-12 flex flex-col sm:flex-row items-center gap-8 border-4 shadow-2xl transition-transform duration-700 ${
              isCorrect ? 'bg-green-50/80 border-green-100 text-green-900 shadow-green-100 scale-[1.01]' : 'bg-red-50/80 border-red-100 text-red-900 shadow-red-100 scale-[1.01]'
            }`}>
              <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-2xl animate-bounce-slow ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {isCorrect ? <Check className="w-12 h-12 stroke-[3px]" /> : <AlertCircle className="w-12 h-12 stroke-[3px]" />}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-4xl font-black tracking-tight mb-2 uppercase">
                  {isCorrect ? 'Brilliant! 🎉' : 'Keep Learning 📚'}
                </h4>
                <p className="text-xl font-bold opacity-80 leading-relaxed">
                  {isCorrect ? 'Your answer is perfectly correct.' : <>The actual meaning is <span className="text-red-700 underline underline-offset-8 decoration-red-300 font-black">{word.meaning_ko}</span></>}
                </p>
              </div>
            </div>

            {/* 정보 카드 그리드 */}
            <div className="space-y-8 mb-12">
              {/* Definition & Nuance Unified Card */}
              <div className="bg-gradient-to-br from-blue-50/40 via-white to-white rounded-[3rem] border border-blue-100 p-10 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-1000">
                  <FileText className="w-40 h-40" />
                </div>
                <div className="relative z-10 space-y-10">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-[11px] font-black text-blue-600/60 uppercase tracking-[0.3em]">Contextual Definitions</p>
                    </div>
                    <div className="pl-2">
                      {word.definitions?.length ? (
                        <ul className="space-y-5">
                          {word.definitions.map((def, idx) => (
                            <li key={idx} className="text-xl font-bold text-slate-800 leading-tight flex gap-4">
                              <span className="text-blue-400 font-serif text-3xl h-0 leading-none mt-2 opacity-50">“</span>
                              {def}
                              <span className="text-blue-400 font-serif text-3xl h-0 leading-none mt-6 opacity-50">”</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-slate-400 italic font-medium text-lg">No definitions available for this entry.</p>}
                    </div>
                  </div>

                  {word.nuance && (
                    <div className="pt-10 border-t border-slate-100">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-11 h-11 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                          <Brain className="w-6 h-6" />
                        </div>
                        <p className="text-[11px] font-black text-purple-600/60 uppercase tracking-[0.3em]">Usage Nuance</p>
                      </div>
                      <div className="p-7 rounded-[2rem] bg-slate-900 text-slate-100 font-bold leading-relaxed text-lg shadow-2xl border border-slate-800 relative">
                        <div className="absolute -top-3 -left-3 bg-purple-500 text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest shadow-lg">INSIGHT</div>
                        {word.nuance}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub Info Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Examples */}
                <div className="bg-white rounded-[3rem] border border-indigo-100 p-10 shadow-xl shadow-indigo-900/5 relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                      <Quote className="w-6 h-6" />
                    </div>
                    <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.25em]">Live Examples</p>
                  </div>
                  <div className="space-y-8">
                    {word.examples?.slice(0, 2).map((ex, idx) => (
                      <div key={idx} className="relative pl-6 border-l-4 border-indigo-500/20 group/ex">
                        <p className="text-lg text-slate-900 font-black mb-2 leading-snug group-hover/ex:text-indigo-600 transition-colors">{ex.en}</p>
                        <p className="text-sm text-slate-400 font-bold tracking-tight">{ex.ko}</p>
                      </div>
                    )) || <p className="text-slate-400 italic">No examples found.</p>}
                  </div>
                </div>

                {/* Synonyms */}
                <div className="bg-white rounded-[3rem] border border-amber-100 p-10 shadow-xl shadow-amber-900/5">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                      <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <p className="text-[11px] font-black text-amber-400 uppercase tracking-[0.25em]">Similar Words</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {word.synonyms?.map((syn, idx) => (
                      <span key={idx} className="px-5 py-2.5 bg-amber-50/50 text-amber-700 text-base font-black rounded-2xl border border-amber-100 shadow-sm hover:scale-105 transition-transform cursor-default">
                        {syn}
                      </span>
                    )) || <p className="text-slate-400 italic">No synonyms found.</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* 다음 버튼 */}
            <button
              onClick={handleNextQuestion}
              className="w-full py-7 rounded-[2.5rem] font-black text-2xl tracking-tighter transition-all bg-slate-900 text-white hover:bg-black active:scale-[0.96] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] mb-16 flex items-center justify-center gap-5 group"
            >
              <span>CONTINUE STUDY SESSION</span>
              <ChevronRight className="w-8 h-8 transition-transform group-hover:translate-x-3 duration-500" />
            </button>
          </div>

          {/* 메인 액션 버튼 */}
          {!isAnswered && (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className={`w-full py-7 rounded-[2.5rem] font-black text-2xl tracking-tighter transition-all flex items-center justify-center gap-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] ${
                selectedOption
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.96] hover:shadow-blue-500/40'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
              }`}
            >
              {selectedOption ? (
                <>
                  <span>VALIDATE ANSWER</span>
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-[1rem] text-xs font-black tracking-widest shadow-inner">
                    <span className="text-lg leading-none">↵</span>
                    <span>ENTER</span>
                  </div>
                </>
              ) : (
                'Select an Answer to Proceed'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
