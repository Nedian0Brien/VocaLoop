import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Volume2, Check, X, Sparkles, AlertCircle, FileText, Brain, ArrowRightLeft, Quote } from './Icons';
import { generateMultipleChoiceOptions } from '../services/quizService';

const QuizSkeleton = () => (
  <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
    <div className="mb-6">
      <div className="h-4 w-32 bg-gray-200 rounded-md mb-2 animate-skeleton"></div>
      <div className="w-full bg-gray-200 rounded-full h-2 animate-skeleton"></div>
    </div>
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      <div className="h-48 bg-gradient-to-r from-gray-100 to-gray-200 p-6 flex flex-col justify-center animate-skeleton">
        <div className="h-4 w-24 bg-white/30 rounded mb-4"></div>
        <div className="h-12 w-48 bg-white/50 rounded"></div>
      </div>
      <div className="p-8">
        <div className="h-6 w-64 bg-gray-100 rounded mb-8 animate-skeleton"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-50 rounded-xl border border-gray-100 animate-skeleton"></div>
          ))}
        </div>
        <div className="h-14 bg-gray-100 rounded-xl animate-skeleton"></div>
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

  // 문제 생성
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
        setTimeout(() => setLoading(false), 400); // 부드러운 전환을 위한 지연
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
        if (isAnswered) {
          handleNextQuestion();
        } else {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextQuestion, handleSubmit, isAnswered, loading, options]);

  useLayoutEffect(() => {
    if (isAnswered) {
      window.scrollTo({ top: scrollPositionRef.current });
    }
  }, [isAnswered]);

  const speakWord = () => {
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return <QuizSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      {/* 진행 상황 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span className="font-bold tracking-tight">
            문제 {progress.current} <span className="text-gray-300 mx-1">/</span> {progress.total}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-600 font-black">{stats.correct}</span>
            </span>
            <span className="flex items-center gap-1">
              <X className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-600 font-black">{stats.wrong}</span>
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-700 ease-out"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* 퀴즈 카드 */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden ring-1 ring-black/5">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <span className="text-xs font-black uppercase tracking-widest opacity-80 bg-white/10 px-3 py-1 rounded-full border border-white/10">Multiple Choice</span>
            {aiMode && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg shadow-orange-900/20">
                <Sparkles className="w-3 h-3" />
                AI Powered
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 relative z-10">
            <h2 className="text-5xl font-black tracking-tight font-serif">{word.word}</h2>
            <button
              onClick={speakWord}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-90 rounded-2xl transition-all border border-white/10"
              title="발음 듣기"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-4 relative z-10">
            {word.pronunciation && (
              <p className="text-xl font-serif italic opacity-80">{word.pronunciation}</p>
            )}
            {word.pos && (
              <span className="px-3 py-0.5 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider border border-white/5">
                {word.pos}
              </span>
            )}
          </div>
        </div>

        {/* 질문 */}
        <div className="p-8 sm:p-10">
          <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            이 단어의 뜻을 고르세요
          </h3>
          
          {/* 선택지 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {options.map((option, index) => {
              const isSelected = selectedOption === option;
              const isCorrectOption = option === word.meaning_ko;

              let buttonStyle = 'border-2 border-gray-100 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5';

              if (isAnswered) {
                if (isCorrectOption) {
                  buttonStyle = 'border-2 border-green-500 bg-green-50 scale-[1.02] shadow-md';
                } else if (isSelected && !isCorrectOption) {
                  buttonStyle = 'border-2 border-red-500 bg-red-50 scale-[0.98] opacity-80';
                } else {
                  buttonStyle = 'border-2 border-gray-100 bg-gray-50 opacity-40';
                }
              } else if (isSelected) {
                buttonStyle = 'border-2 border-blue-600 bg-blue-50/50 shadow-md scale-[1.02]';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswered}
                  className={`group w-full text-left p-5 rounded-2xl transition-all duration-300 active:scale-[0.98] ${buttonStyle} ${
                    isAnswered ? 'cursor-not-allowed' : 'cursor-pointer'
                  } h-full flex items-center`}
                >
                  <div className="flex items-center gap-4 w-full">
                    <span className={`flex-shrink-0 w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black text-sm transition-colors ${
                      isSelected || (isAnswered && isCorrectOption) 
                        ? 'bg-current border-transparent text-white' 
                        : 'border-gray-200 text-gray-400 group-hover:border-blue-400 group-hover:text-blue-600'
                    }`}
                    style={ (isSelected || (isAnswered && isCorrectOption)) ? { color: 'white', backgroundColor: isAnswered && isCorrectOption ? '#10b981' : '#2563eb' } : {} }
                    >
                      {index + 1}
                    </span>
                    <span className={`flex-1 font-bold text-gray-800 transition-colors ${isSelected ? 'text-blue-700' : ''}`}>{option}</span>
                    {isAnswered && isCorrectOption && (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white animate-in zoom-in duration-300">
                        <Check className="w-5 h-5 stroke-[3px]" />
                      </div>
                    )}
                    {isAnswered && isSelected && !isCorrectOption && (
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white animate-in zoom-in duration-300">
                        <X className="w-5 h-5 stroke-[3px]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className={`transition-all duration-700 ease-in-out overflow-hidden ${
              isAnswered ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* 피드백 */}
            <div className={`p-6 rounded-2xl mb-8 flex items-start gap-4 border-2 ${
              isCorrect ? 'bg-green-50/50 border-green-100 text-green-900' : 'bg-red-50/50 border-red-100 text-red-900'
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {isCorrect ? <Check className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-black mb-1">
                  {isCorrect ? '정답입니다! 🎉' : '아쉽네요 😢'}
                </h4>
                {!isCorrect && (
                  <p className="text-base font-medium opacity-80">
                    정답: <strong className="text-red-700">{word.meaning_ko}</strong>
                  </p>
                )}
              </div>
            </div>

            {isAnswered && (
              <button
                onClick={handleNextQuestion}
                className="w-full py-5 rounded-2xl font-black text-lg transition-all bg-gray-900 text-white hover:bg-black active:scale-[0.98] shadow-xl hover:shadow-2xl mb-10 flex items-center justify-center gap-3 group"
              >
                <span>다음 문제</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
              </button>
            )}

            {/* 단어 정보 */}
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50/30 to-white p-8 space-y-8 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Definition</p>
                </div>
                {word.definitions?.length ? (
                  <ul className="text-base text-gray-800 leading-relaxed list-disc list-inside space-y-2 font-medium">
                    {word.definitions.map((definition, idx) => (
                      <li key={`definition-${idx}`} className="pl-1">{definition}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">등록된 정의가 없습니다.</p>
                )}
              </div>

              <div className="pt-6 border-t border-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-sm font-black text-purple-600 uppercase tracking-widest">Nuance</p>
                </div>
                {word.nuance ? (
                  <p className="text-base text-gray-700 leading-relaxed font-medium bg-purple-50/30 p-4 rounded-2xl border border-purple-50">{word.nuance}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">등록된 뉘앙스 설명이 없습니다.</p>
                )}
              </div>

              {word.synonyms?.length > 0 && (
                <div className="pt-6 border-t border-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                      <ArrowRightLeft className="w-4 h-4 text-orange-600" />
                    </div>
                    <p className="text-sm font-black text-orange-600 uppercase tracking-widest">Synonyms</p>
                  </div>
                  <p className="text-base text-gray-800 leading-relaxed italic font-serif tracking-tight">
                    {word.synonyms.join(', ')}
                  </p>
                </div>
              )}

              {word.examples?.length > 0 && (
                <div className="pt-6 border-t border-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Quote className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Usage Examples</p>
                  </div>
                  <div className="space-y-4">
                    {word.examples.map((example, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
                        <p className="text-lg text-indigo-950 font-bold mb-1.5 leading-snug">"{example.en}"</p>
                        <p className="text-sm text-gray-500 font-medium">{example.ko}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 버튼 */}
          {!isAnswered && (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                selectedOption
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] hover:shadow-2xl'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              {selectedOption ? (
                <>
                  <span>정답 확인하기</span>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded-lg text-xs font-black">
                    <span className="text-sm">↵</span>
                    <span>ENTER</span>
                  </div>
                </>
              ) : (
                '정답을 선택해주세요'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
