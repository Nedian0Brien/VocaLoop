import React from 'react';
import { CheckCircle, Edit3, Brain, Sparkles, BookOpen, Target, Award, Zap } from './Icons';

const ModeCard = ({ mode, onSelect, wordCount }) => {
  const Icon = mode.icon;
  const isDisabled = (mode.id === 'multiple' || mode.id === 'short') && wordCount === 0;

  return (
    <button
      onClick={() => !isDisabled && !mode.disabled && onSelect(mode)}
      className={`group relative flex flex-col p-6 rounded-[2rem] border-2 transition-all duration-500 text-left overflow-hidden ${
        isDisabled || mode.disabled
          ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed grayscale'
          : 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 active:scale-[0.98]'
      }`}
    >
      {/* Background Pattern */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 ${
        mode.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
      }`}>
        <Icon className="w-full h-full" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 ${
          isDisabled || mode.disabled 
            ? 'bg-slate-200 text-slate-500' 
            : mode.color === 'blue' ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100' : 'bg-purple-50 text-purple-600 shadow-sm shadow-purple-100'
        }`}>
          <Icon className="w-7 h-7" />
        </div>

        <div className="mb-2">
          {mode.recommended && !isDisabled && !mode.disabled && (
            <span className="inline-block px-2.5 py-1 bg-green-500 text-white text-[9px] font-black rounded-lg uppercase tracking-wider mb-3 shadow-sm shadow-green-200">
              Recommended
            </span>
          )}
          <h3 className="text-xl font-black text-slate-900 tracking-tight">{mode.title}</h3>
        </div>
        
        <p className="text-slate-500 text-xs leading-relaxed font-bold mb-8 flex-1 opacity-80">{mode.description}</p>
        
        <div className={`inline-flex items-center gap-2 text-[11px] font-black tracking-widest uppercase ${
          isDisabled || mode.disabled ? 'text-slate-400' : mode.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
        }`}>
          {mode.disabled ? 'Coming Soon' : 'Configure Mode'}
          <span className="text-base leading-none transition-transform duration-500 group-hover:translate-x-1.5">→</span>
        </div>
      </div>
    </button>
  );
};

const StatCard = ({ title, value, icon: Icon, color, subValue, trend }) => (
  <div className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm shadow-slate-100/50 flex flex-col gap-5 relative overflow-hidden group">
    <div className="flex items-center justify-between relative z-10">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-sm transition-transform duration-500 group-hover:scale-110`}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trend > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
          {trend > 0 ? `+${trend}%` : 'Stable'}
        </span>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
        {subValue && <span className="text-xs font-bold text-slate-400 opacity-70">{subValue}</span>}
      </div>
    </div>
    {/* Decorative blur */}
    <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-3xl opacity-10 ${color.split(' ')[1]}`} />
  </div>
);

export default function QuizDashboard({ onSelectMode, stats, wordCount }) {
  const vocabModes = [
    {
      id: 'multiple',
      title: '객관식 퀴즈',
      description: '가장 빠르고 효과적인 학습 방식입니다. 4가지 뜻 중 올바른 정답을 선택하세요.',
      icon: CheckCircle,
      color: 'blue',
      recommended: true
    },
    {
      id: 'short',
      title: '주관식 퀴즈',
      description: '단어의 철자와 뜻을 직접 입력하여 암기 수준을 완벽하게 검증합니다.',
      icon: Edit3,
      color: 'purple'
    }
  ];

  const toeflModes = [
    {
      id: 'toefl-complete',
      title: 'TOEFL 문단 완성',
      description: '실제 TOEFL 학술 텍스트의 맥락을 이해하고 빈칸의 철자를 완성하는 고난도 모드입니다.',
      icon: Sparkles,
      color: 'blue',
      recommended: true
    },
    {
      id: 'toefl-build',
      title: 'TOEFL 문장 구성',
      description: '주어진 단어들을 문법적으로 올바르게 조합하여 완성된 문장을 구성합니다.',
      icon: Zap,
      color: 'purple',
      disabled: true
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-14 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header & Main Stats */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100">
              <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Learning Dashboard</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Let's <span className="text-blue-600">Level Up</span> Your Vocab.
            </h2>
            <p className="text-slate-500 font-bold text-base max-w-lg leading-relaxed">
              당신만을 위한 지능형 학습 대시보드입니다. <br className="hidden sm:block" />
              오늘의 목표를 정하고 퀴즈를 시작해보세요.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100/50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Words</p>
              <p className="text-xl font-black text-blue-600 tracking-tighter">{wordCount}</p>
            </div>
            <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100/50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Folders</p>
              <p className="text-xl font-black text-slate-900 tracking-tighter">{stats.folderCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
            title="Avg. Mastery" 
            value={stats.learningRate || '0%'} 
            icon={Target} 
            color="bg-blue-50 text-blue-600"
            subValue="Mastery Level"
            trend={stats.rateTrend}
          />
          <StatCard 
            title="Session Accuracy" 
            value={stats.recentAccuracy || '0%'} 
            icon={Award} 
            color="bg-purple-50 text-purple-600"
            subValue="Last 10 Quizzes"
            trend={stats.accuracyTrend}
          />
          <StatCard 
            title="Studied This Week" 
            value={stats.studiedCount || '0'} 
            icon={BookOpen} 
            color="bg-amber-50 text-amber-600"
            subValue="Words Completed"
          />
        </div>
      </section>

      {/* Quiz Modes Grid */}
      <div className="space-y-16">
        {/* Vocabulary Power Section */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Vocabulary Training</h3>
                <p className="text-sm font-bold text-slate-400">암기 수준에 맞춘 기초 단계 학습</p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Essentials</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {vocabModes.map((mode) => (
              <ModeCard key={mode.id} mode={mode} onSelect={onSelectMode} wordCount={wordCount} />
            ))}
          </div>
        </section>

        {/* TOEFL Mastery Section */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Academic TOEFL</h3>
                <p className="text-sm font-bold text-slate-400">실전 대비 고난도 학술적 문해력 강화</p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Academic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {toeflModes.map((mode) => (
              <ModeCard key={mode.id} mode={mode} onSelect={onSelectMode} wordCount={wordCount} />
            ))}
          </div>
        </section>
      </div>

      {/* Footer / Smart Tip */}
      <div className="bg-slate-900 rounded-[3rem] p-10 sm:p-14 relative overflow-hidden group border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-10">
          <div className="w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xl group-hover:rotate-6 transition-transform duration-700">
            <Brain className="w-10 h-10" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <h4 className="text-xl font-black text-white tracking-tight">Smart Learning Strategy</h4>
            </div>
            <p className="text-slate-400 font-bold leading-relaxed text-base max-w-2xl opacity-90">
              이미 충분히 학습한 단어보다는 <span className="text-blue-400 font-black italic">학습률이 낮은 폴더</span>를 집중적으로 선택해보세요. 
              AI 모드를 활성화하면 단순한 암기를 넘어 단어 사이의 미묘한 뉘앙스 차이까지 완벽하게 파악할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
