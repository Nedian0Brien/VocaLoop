import React from 'react';
import { CheckCircle, Edit3, Brain, Sparkles } from './Icons';

export default function QuizModeSelector({ onSelectMode, wordCount = 0 }) {
  const vocabModes = [
    {
      id: 'multiple',
      title: '객관식 퀴즈',
      description: '4개의 선택지 중 정답을 고르세요',
      icon: CheckCircle,
      color: 'blue',
      recommended: true
    },
    {
      id: 'short',
      title: '주관식 퀴즈',
      description: '단어의 뜻을 직접 입력하세요',
      icon: Edit3,
      color: 'purple',
      recommended: false
    }
  ];

  const toeflModes = [
    {
      id: 'toefl-complete',
      title: 'Complete-the-Word',
      description: '학술적 문단 속 철자 빈칸을 채우는 TOEFL 모드',
      icon: Sparkles,
      color: 'blue',
      recommended: true
    },
    {
      id: 'toefl-build',
      title: 'Build-a-Sentence',
      description: '문장 구성하기 (준비 중)',
      icon: Brain,
      color: 'purple',
      recommended: false,
      disabled: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* 제목 */}
      <div className="text-center">
        <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">퀴즈 모드 선택</h2>
        <p className="text-gray-500">학습 방식을 선택해주세요</p>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">TOEFL 학습 모드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {toeflModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => !mode.disabled && onSelectMode(mode.id)}
                  className={`relative bg-white rounded-3xl border border-gray-100 p-8 text-left transition-all duration-300 ${
                    mode.disabled
                      ? 'opacity-60 cursor-not-allowed grayscale'
                      : 'hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-500/10 active:scale-95'
                  }`}
                >
                  {mode.recommended && (
                    <span className="absolute top-4 right-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      추천
                    </span>
                  )}

                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                    mode.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    <Icon className={`w-7 h-7 ${
                      mode.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                    }`} />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{mode.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{mode.description}</p>

                  <div className={`mt-6 inline-flex items-center gap-2 text-sm font-medium ${
                    mode.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                  }`}>
                    {mode.disabled ? '준비 중' : '시작하기'}
                    <span className="text-lg">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">단어 학습 모드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vocabModes.map((mode) => {
              const Icon = mode.icon;
              const isDisabled = wordCount === 0;
              return (
                <button
                  key={mode.id}
                  onClick={() => !isDisabled && onSelectMode(mode.id)}
                  className={`relative bg-white rounded-3xl border border-gray-100 p-8 text-left transition-all duration-300 ${
                    isDisabled
                      ? 'opacity-60 cursor-not-allowed grayscale'
                      : 'hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-95'
                  }`}
                >
                  {mode.recommended && (
                    <span className="absolute top-4 right-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      추천
                    </span>
                  )}

                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                    mode.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    <Icon className={`w-7 h-7 ${
                      mode.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                    }`} />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{mode.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{mode.description}</p>
                  {isDisabled && (
                    <p className="text-xs text-red-500 mt-2">단어를 먼저 추가해주세요.</p>
                  )}

                  <div className={`mt-6 inline-flex items-center gap-2 text-sm font-medium ${
                    mode.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                  }`}>
                    시작하기
                    <span className="text-lg">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <p className="text-sm text-blue-900">
          💡 <strong>팁:</strong> 처음에는 객관식으로 시작하고, 익숙해지면 주관식에 도전해보세요!
        </p>
      </div>
    </div>
  );
}
