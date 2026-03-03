import React, { useEffect } from 'react';
import { Trophy, RotateCw, ArrowLeft, TrendingUp, CheckCircle, XCircle, BarChart3, Zap, Star, Award, Heart } from './Icons';

const STAT_STORAGE_KEY = 'vocaloop_quiz_history';

const StatBox = ({ title, value, subValue, icon: Icon, color }) => (
  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3 relative overflow-hidden group">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-sm transition-transform duration-500 group-hover:scale-110`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <div className="flex flex-col">
        <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4>
        {subValue && <span className="text-[10px] font-bold text-slate-400 mt-0.5">{subValue}</span>}
      </div>
    </div>
    <div className={`absolute -right-2 -bottom-2 w-16 h-16 rounded-full blur-3xl opacity-10 ${color.split(' ')[1]}`} />
  </div>
);

export default function QuizResult({ stats, onRestart, onBackToDashboard, modeTitle = "Quiz Session" }) {
  const { correct, wrong, total } = stats;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Save history on mount
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem(STAT_STORAGE_KEY) || '[]');
      const newEntry = {
        date: new Date().toISOString(),
        correct,
        total,
        percentage,
        mode: modeTitle
      };
      const updatedHistory = [newEntry, ...history].slice(0, 20); // Keep last 20 entries
      localStorage.setItem(STAT_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save quiz history:', e);
    }
  }, []);

  const getResultInfo = () => {
    if (percentage >= 90) return {
      grade: 'Excellent', message: '완벽한 마스터! 🎉',
      desc: '당신의 암기력은 정말 놀랍군요. 이제 다음 레벨로 넘어갈 시간입니다!',
      color: 'bg-gradient-to-br from-green-500 to-emerald-600', text: 'text-green-600', icon: Trophy, emoji: '🏆'
    };
    if (percentage >= 80) return {
      grade: 'Great', message: '훌륭한 실력이에요! 👏',
      desc: '조금만 더 집중하면 완벽해질 수 있습니다. 틀린 단어들만 다시 훑어보세요.',
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600', text: 'text-blue-600', icon: Target, emoji: '🎯'
    };
    if (percentage >= 70) return {
      grade: 'Good', message: '잘 해내셨어요! 💪',
      desc: '안정적인 실력을 보여주고 계시네요. 꾸준함이 가장 큰 무기입니다.',
      color: 'bg-gradient-to-br from-purple-500 to-indigo-600', text: 'text-purple-600', icon: Zap, emoji: '✨'
    };
    return {
      grade: 'Practice', message: '좋은 시도였어요! 🔥',
      desc: '실패는 성공의 어머니입니다. 오늘 배운 단어들이 내일의 실력이 될 거예요.',
      color: 'bg-gradient-to-br from-orange-500 to-red-600', text: 'text-red-600', icon: Heart, emoji: '💡'
    };
  };

  const res = getResultInfo();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Hero Result Section */}
      <div className="relative bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden ring-1 ring-black/[0.02]">
        <div className={`${res.color} p-12 sm:p-16 text-white text-center relative overflow-hidden`}>
          <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-black/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <res.icon className="w-4 h-4 text-white" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{res.grade} Achievement</span>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight">{res.message}</h2>
              <p className="text-white/80 font-bold text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
                {res.desc}
              </p>
            </div>

            <div className="flex flex-col items-center pt-4">
              <div className="relative">
                <div className="text-8xl sm:text-9xl font-black tracking-tighter opacity-20 absolute inset-0 blur-sm select-none">{percentage}%</div>
                <div className="text-8xl sm:text-9xl font-black tracking-tighter relative z-10">{percentage}%</div>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.4em] opacity-60 mt-2">Overall Accuracy</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-8 sm:p-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <StatBox 
              title="Total Questions" 
              value={total} 
              icon={BarChart3} 
              color="bg-slate-50 text-slate-600"
              subValue="Answered"
            />
            <StatBox 
              title="Correct Items" 
              value={correct} 
              icon={CheckCircle} 
              color="bg-green-50 text-green-600"
              subValue="Great job!"
            />
            <StatBox 
              title="Wrong Items" 
              value={wrong} 
              icon={XCircle} 
              color="bg-red-50 text-red-600"
              subValue="Needs review"
            />
          </div>

          {/* Detailed Progress Bar */}
          <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 mb-12">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${res.text}`} />
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Accuracy Level</span>
              </div>
              <span className={`text-sm font-black ${res.text}`}>{percentage}% Mastery</span>
            </div>
            <div className="w-full bg-slate-200/50 rounded-full h-4 relative overflow-hidden border border-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-[1500ms] ease-out relative ${res.color.replace('bg-gradient-to-br', 'bg-gradient-to-r')}`}
                style={{ width: `${percentage}%` }}
              >
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
              </div>
            </div>
            <div className="flex justify-between mt-3 px-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>Novice</span>
              <span>Professional</span>
              <span>Master</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-5">
            <button
              onClick={onRestart}
              className="flex-1 flex items-center justify-center gap-3 bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] group"
            >
              <RotateCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
              <span className="text-lg tracking-tight">다시 도전하기</span>
            </button>
            <button
              onClick={onBackToDashboard}
              className="flex-1 flex items-center justify-center gap-3 bg-white text-slate-600 font-black py-5 rounded-2xl border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="w-6 h-6" />
              <span className="text-lg tracking-tight">대시보드로 이동</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pro Tip Section */}
      <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-blue-200/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[60px] pointer-events-none transition-transform duration-1000 group-hover:scale-150" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-6 transition-transform">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black tracking-tight">Smart Review Tip</h4>
            <p className="text-blue-100 font-bold leading-relaxed text-sm opacity-90">
              오늘 틀린 <span className="text-white font-black underline underline-offset-4">{wrong}개</span>의 단어들은 학습 알고리즘에 의해 <span className="text-white">우선 순위</span>가 높아졌습니다. 
              내일 다시 퀴즈를 풀면 자동으로 이 단어들이 먼저 출제되어 완벽한 암기를 도와드립니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
