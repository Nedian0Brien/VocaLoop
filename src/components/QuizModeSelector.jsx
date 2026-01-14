import React from 'react';
import { CheckCircle, Edit3, Brain } from './Icons';

export default function QuizModeSelector({ onSelectMode }) {
  const modes = [
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

  return (
    <div className="space-y-6">
      {/* 제목 */}
      <div className="text-center">
        <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">퀴즈 모드 선택</h2>
        <p className="text-gray-500">학습 방식을 선택해주세요</p>
      </div>

      {/* 모드 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`relative bg-white rounded-2xl border-2 p-8 text-left transition-all hover:scale-105 hover:shadow-xl ${
                mode.color === 'blue'
                  ? 'border-blue-200 hover:border-blue-400'
                  : 'border-purple-200 hover:border-purple-400'
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
                시작하기
                <span className="text-lg">→</span>
              </div>
            </button>
          );
        })}
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
