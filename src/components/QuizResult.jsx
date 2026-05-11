import React, { useEffect } from 'react';
import { Trophy, RotateCw, ArrowLeft, TrendingUp, CheckCircle, XCircle, BarChart3, Zap, Star, Target, Heart } from './Icons';
import { Card, Button, Badge, Stat } from '../design-system';

const STAT_STORAGE_KEY = 'vocaloop_quiz_history';

export default function QuizResult({ stats, onRestart, onBackToDashboard, modeTitle = "Quiz Session" }) {
  const { correct, wrong, total } = stats;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem(STAT_STORAGE_KEY) || '[]');
      const newEntry = {
        date: new Date().toISOString(),
        correct,
        total,
        percentage,
        mode: modeTitle,
      };
      const updatedHistory = [newEntry, ...history].slice(0, 20);
      localStorage.setItem(STAT_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save quiz history:', e);
    }
  }, []);

  const getResultInfo = () => {
    if (percentage >= 90) return {
      grade: 'Excellent', message: '완벽한 마스터! 🎉',
      desc: '당신의 암기력은 정말 놀랍군요. 이제 다음 레벨로 넘어갈 시간입니다!',
      heroBg: 'bg-gradient-to-br from-success-500 to-success-700',
      barBg:  'bg-gradient-to-r  from-success-500 to-success-700',
      text:   'text-success-600', icon: Trophy,
    };
    if (percentage >= 80) return {
      grade: 'Great', message: '훌륭한 실력이에요! 👏',
      desc: '조금만 더 집중하면 완벽해질 수 있습니다. 틀린 단어들만 다시 훑어보세요.',
      heroBg: 'bg-gradient-to-br from-brand-500 to-indigo-pair-600',
      barBg:  'bg-gradient-to-r  from-brand-500 to-indigo-pair-600',
      text:   'text-brand-600', icon: Target,
    };
    if (percentage >= 70) return {
      grade: 'Good', message: '잘 해내셨어요! 💪',
      desc: '안정적인 실력을 보여주고 계시네요. 꾸준함이 가장 큰 무기입니다.',
      heroBg: 'bg-gradient-to-br from-accent-500 to-indigo-pair-600',
      barBg:  'bg-gradient-to-r  from-accent-500 to-indigo-pair-600',
      text:   'text-accent-600', icon: Zap,
    };
    return {
      grade: 'Practice', message: '좋은 시도였어요! 🔥',
      desc: '실패는 성공의 어머니입니다. 오늘 배운 단어들이 내일의 실력이 될 거예요.',
      heroBg: 'bg-gradient-to-br from-warning-500 to-danger-600',
      barBg:  'bg-gradient-to-r  from-warning-500 to-danger-600',
      text:   'text-danger-600', icon: Heart,
    };
  };

  const res = getResultInfo();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Hero Result Section */}
      <div className="relative bg-white rounded-hero shadow-[var(--shadow-floating)] border border-surface-100 overflow-hidden ring-1 ring-black/[0.02]">
        <div className={`${res.heroBg} p-12 sm:p-16 text-white text-center relative overflow-hidden`}>
          <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-white/10 rounded-pill blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-black/10 rounded-pill blur-[80px] pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-pill border border-white/20">
              <res.icon className="w-4 h-4 text-white" aria-hidden="true" />
              <span className="text-2xs font-black uppercase tracking-[0.2em]">{res.grade} Achievement</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight">{res.message}</h2>
              <p className="text-white/80 font-bold text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
                {res.desc}
              </p>
            </div>

            <div className="flex flex-col items-center pt-4">
              <div className="relative">
                <div className="text-8xl sm:text-9xl font-black tracking-tighter opacity-20 absolute inset-0 blur-sm select-none" aria-hidden="true">{percentage}%</div>
                <div className="text-8xl sm:text-9xl font-black tracking-tighter relative z-10">{percentage}%</div>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.4em] opacity-60 mt-2">Overall Accuracy</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-8 sm:p-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <Stat title="Total Questions" value={total}   subValue="Answered"      icon={BarChart3}   tone="neutral" />
            <Stat title="Correct Items"   value={correct} subValue="Great job!"    icon={CheckCircle} tone="success" />
            <Stat title="Wrong Items"     value={wrong}   subValue="Needs review"  icon={XCircle}     tone="danger"  />
          </div>

          {/* Detailed Progress Bar */}
          <div className="bg-surface-50 rounded-card p-8 border border-surface-100 mb-12">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${res.text}`} aria-hidden="true" />
                <span className="text-xs font-black text-surface-700 uppercase tracking-widest">Accuracy Level</span>
              </div>
              <span className={`text-sm font-black ${res.text}`}>{percentage}% Mastery</span>
            </div>
            <div className="w-full bg-surface-200/50 rounded-pill h-4 relative overflow-hidden border border-surface-100">
              <div
                className={`h-full rounded-pill transition-all duration-[1500ms] ease-out relative ${res.barBg}`}
                style={{ width: `${percentage}%` }}
              >
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
              </div>
            </div>
            <div className="flex justify-between mt-3 px-1 text-2xs font-black text-surface-400 uppercase tracking-widest">
              <span>Novice</span>
              <span>Professional</span>
              <span>Master</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-5">
            <Button variant="dark" size="lg" fullWidth onClick={onRestart} leftIcon={RotateCw} className="!h-16 !text-lg">
              다시 도전하기
            </Button>
            <Button variant="secondary" size="lg" fullWidth onClick={onBackToDashboard} leftIcon={ArrowLeft} className="!h-16 !text-lg">
              대시보드로 이동
            </Button>
          </div>
        </div>
      </div>

      {/* Pro Tip Section */}
      <Card variant="elevated" radius="card" padding="lg" className="!bg-brand-600 !border-brand-700 text-white relative overflow-hidden group !p-10 shadow-[var(--shadow-glow-brand)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-pill blur-[60px] pointer-events-none transition-transform duration-1000 group-hover:scale-150" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-[var(--shadow-card)] group-hover:rotate-6 transition-transform">
            <TrendingUp className="w-8 h-8" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black tracking-tight">Smart Review Tip</h4>
            <p className="text-brand-100 font-bold leading-relaxed text-sm opacity-90">
              오늘 틀린 <span className="text-white font-black underline underline-offset-4">{wrong}개</span>의 단어들은 학습 알고리즘에 의해 <span className="text-white">우선 순위</span>가 높아졌습니다.
              내일 다시 퀴즈를 풀면 자동으로 이 단어들이 먼저 출제되어 완벽한 암기를 도와드립니다.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
