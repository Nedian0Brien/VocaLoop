import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Volume2, Check, X, Sparkles, AlertCircle, FileText, Brain, ArrowRightLeft, Quote } from './Icons';
import { generateMultipleChoiceOptions } from '../services/quizService';

export default function MultipleChoiceQuiz({ word, allWords, onAnswer, progress, stats, aiMode, apiKey }) {
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
        const generatedOptions = await generateMultipleChoiceOptions(word, allWords, aiMode, apiKey);
        setOptions(generatedOptions);
      } catch (error) {
        console.error('문제 생성 실패:', error);
        // 에러 시 로컬 모드로 폴백
        const generatedOptions = await generateMultipleChoiceOptions(word, allWords, false, null);
        setOptions(generatedOptions);
      } finally {
        setLoading(false);
      }
    }

    generateQuestion();
  }, [word, allWords, aiMode, apiKey]);

  const handleSelectOption = (option) => {
    if (isAnswered) return;

    setSelectedOption(option);
  };

  const handleSubmit = useCallback(() => {
    if (!selectedOption || isAnswered) return;

    scrollPositionRef.current = window.scrollY;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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
      if (loading) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

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
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">
            {aiMode ? 'AI가 문제를 생성하는 중...' : '문제를 준비하는 중...'}
          </p>
        </div>
      </div>
    );
  }

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
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* 퀴즈 카드 */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium opacity-90">객관식 문제</span>
            {aiMode && (
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                AI 모드
              </div>
            )}
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
            이 단어의 뜻을 고르세요
          </h3>
          {/* 선택지 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {options.map((option, index) => {
              const isSelected = selectedOption === option;
              const isCorrectOption = option === word.meaning_ko;

              let buttonStyle = 'border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50';

              if (isAnswered) {
                if (isCorrectOption) {
                  buttonStyle = 'border-2 border-green-500 bg-green-50';
                } else if (isSelected && !isCorrectOption) {
                  buttonStyle = 'border-2 border-red-500 bg-red-50';
                } else {
                  buttonStyle = 'border-2 border-gray-200 bg-gray-50';
                }
              } else if (isSelected) {
                buttonStyle = 'border-2 border-blue-500 bg-blue-50';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-xl transition-all ${buttonStyle} ${
                    isAnswered ? 'cursor-not-allowed' : 'cursor-pointer'
                  } h-full flex`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <span className="flex-1 font-medium text-gray-900">{option}</span>
                    {isAnswered && isCorrectOption && (
                      <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrectOption && (
                      <X className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${
              isAnswered ? 'max-h-[1200px] opacity-100 mb-6' : 'max-h-0 opacity-0'
            }`}
          >
            {/* 피드백 */}
            <div className={`p-4 rounded-xl mb-6 ${
              isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className={`font-bold mb-1 ${
                    isCorrect ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {isCorrect ? '정답입니다! 🎉' : '아쉽네요 😢'}
                  </h4>
                  {!isCorrect && (
                    <p className="text-sm text-gray-700">
                      정답: <strong>{word.meaning_ko}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {isAnswered && (
              <button
                onClick={handleNextQuestion}
                className="w-full py-4 rounded-xl font-bold transition-all bg-blue-600 text-white hover:bg-blue-700 mb-6"
              >
                다음 문제
              </button>
            )}

            {/* 단어 정보 */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Definition</p>
                </div>
                {word.definitions?.length ? (
                  <ul className="text-sm text-gray-800 leading-relaxed list-disc list-inside space-y-1">
                    {word.definitions.map((definition, idx) => (
                      <li key={`definition-${idx}`}>{definition}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">등록된 정의가 없습니다.</p>
                )}
              </div>

              <div className="pt-3 border-t border-blue-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Nuance</p>
                </div>
                {word.nuance ? (
                  <p className="text-xs text-gray-700 leading-relaxed">{word.nuance}</p>
                ) : (
                  <p className="text-xs text-gray-500">등록된 뉘앙스 설명이 없습니다.</p>
                )}
              </div>

              <div className="pt-3 border-t border-blue-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-orange-500" />
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Synonyms</p>
                </div>
                {word.synonyms?.length ? (
                  <p className="text-sm text-gray-800 leading-relaxed italic">
                    {word.synonyms.join(', ')}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">등록된 유의어가 없습니다.</p>
                )}
              </div>

              <div className="pt-3 border-t border-blue-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Quote className="w-3.5 h-3.5 text-blue-400" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Examples</p>
                </div>
                {word.examples?.length ? (
                  <div className="space-y-2">
                    {word.examples.map((example, idx) => (
                      <div key={`example-${idx}`}>
                        <p className="text-sm text-blue-900 font-medium mb-0.5 leading-snug">"{example.en}"</p>
                        <p className="text-xs text-gray-500">{example.ko}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">등록된 예문이 없습니다.</p>
                )}
              </div>
            </div>
          </div>

          {/* 버튼 */}
          {!isAnswered && (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                selectedOption
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedOption ? (
                <>
                  <span>정답 확인</span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-blue-100">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/20 text-white text-xs">
                      ↵
                    </span>
                    Enter
                  </span>
                </>
              ) : (
                '선택지를 골라주세요'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
