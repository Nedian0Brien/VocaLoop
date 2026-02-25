import React, { useState, useRef } from 'react';
import { CheckCircle, Edit3, Brain, Sparkles } from './Icons';

const ModeCard = ({ mode, onSelect, isDisabled, wordCount }) => {
  const [tiltStyle, setTiltStyle] = useState({});
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, opacity: 0 });
  const cardRef = useRef(null);
  const Icon = mode.icon;

  const handleMouseMove = (e) => {
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;
    if (!cardRef.current || isDisabled || mode.disabled) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const maxDegree = 5;
    const rotateX = ((y - centerY) / centerY) * -maxDegree;
    const rotateY = ((x - centerX) / centerX) * maxDegree;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`,
      transition: 'transform 0.1s ease-out'
    });
    setCursorPos({ x, y, opacity: 1 });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'rotateX(0deg) rotateY(0deg) translateY(0)',
      transition: 'transform 0.5s ease-out'
    });
    setCursorPos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <button
      ref={cardRef}
      onClick={() => !isDisabled && !mode.disabled && onSelect(mode.id)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative bg-white rounded-3xl border-2 p-8 text-left transition-all duration-300 overflow-hidden ${
        isDisabled || mode.disabled
          ? 'border-gray-100 opacity-60 cursor-not-allowed grayscale'
          : 'border-gray-200 hover:border-blue-400 hover:shadow-2xl active:scale-[0.98]'
      }`}
      style={tiltStyle}
    >
      {/* Spotlight Effect */}
      {!isDisabled && !mode.disabled && (
        <div
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(400px circle at ${cursorPos.x}px ${cursorPos.y}px, ${
              mode.color === 'blue' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(168, 85, 247, 0.08)'
            }, transparent 100%)`,
            opacity: cursorPos.opacity,
          }}
        />
      )}

      <div className="relative z-10">
        {mode.recommended && (
          <span className="absolute -top-2 -right-2 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-green-200 uppercase tracking-wider">
            추천
          </span>
        )}

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${
          mode.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
        }`}>
          <Icon className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-black text-gray-900 mb-2">{mode.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed font-medium mb-6">{mode.description}</p>
        
        {isDisabled && (
          <p className="text-[10px] font-bold text-red-500 mb-4 bg-red-50 px-2 py-1 rounded-md inline-block">
            단어를 먼저 추가해주세요
          </p>
        )}

        <div className={`inline-flex items-center gap-2 text-sm font-black tracking-tight ${
          mode.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
        }`}>
          {mode.disabled ? 'COMING SOON' : 'START NOW'}
          <span className="text-lg transition-transform duration-300 group-hover:translate-x-1">→</span>
        </div>
      </div>
    </button>
  );
};

export default function QuizModeSelector({ onSelectMode, wordCount = 0 }) {
  const vocabModes = [
    {
      id: 'multiple',
      title: '객관식 퀴즈',
      description: '4개의 선택지 중 정답을 고르세요. 가장 빠르고 효과적인 학습 방식입니다.',
      icon: CheckCircle,
      color: 'blue',
      recommended: true
    },
    {
      id: 'short',
      title: '주관식 퀴즈',
      description: '단어의 뜻을 직접 입력하세요. 완벽한 암기를 위해 추천합니다.',
      icon: Edit3,
      color: 'purple',
      recommended: false
    }
  ];

  const toeflModes = [
    {
      id: 'toefl-complete',
      title: 'Complete-the-Word',
      description: '학술적 문단 속 철자 빈칸을 채우는 고난도 TOEFL 학습 모드입니다.',
      icon: Sparkles,
      color: 'blue',
      recommended: true
    },
    {
      id: 'toefl-build',
      title: 'Build-a-Sentence',
      description: '주어진 단어로 문장을 구성하세요. 고득점을 위한 필수 과정입니다.',
      icon: Brain,
      color: 'purple',
      recommended: false,
      disabled: true
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 제목 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-50 mb-6 animate-bounce-slow">
          <Brain className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">퀴즈 모드 선택</h2>
        <p className="text-gray-500 font-medium italic">당신에게 맞는 학습 방식을 선택하고 성장을 시작하세요</p>
      </div>

      <div className="space-y-12">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">TOEFL Mastery</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {toeflModes.map((mode) => (
              <ModeCard key={mode.id} mode={mode} onSelect={onSelectMode} isDisabled={false} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Vocabulary Power</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vocabModes.map((mode) => (
              <ModeCard 
                key={mode.id} 
                mode={mode} 
                onSelect={onSelectMode} 
                isDisabled={wordCount === 0} 
                wordCount={wordCount}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-center shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <div className="relative z-10">
          <p className="text-gray-300 text-sm font-bold mb-2">PRO TIP</p>
          <p className="text-white text-lg font-medium leading-relaxed">
            처음에는 <span className="text-blue-400 font-black">객관식</span>으로 기초를 다지고,<br className="sm:hidden" />
            익숙해지면 <span className="text-purple-400 font-black">주관식</span>으로 암기를 완성해보세요!
          </p>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-700" />
      </div>
    </div>
  );
}
