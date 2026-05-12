import React, { useState, useEffect } from 'react';
import { CheckCircle, Edit3, Brain, Sparkles, BookOpen, Target, Award, Zap, ChevronRight, Clock, BarChart3, Mail, Quote, FileText, RotateCw } from './Icons';
import { Stat, SectionHeading, Card, Badge } from '../design-system';
import { summarizeToeflReadingStats } from '../services/toeflReadingStats';

const HIST_STORAGE_KEY = 'vocaloop_quiz_history';
const GOAL_STORAGE_KEY = 'vocaloop_weekly_goal';
const DEFAULT_WEEKLY_GOAL = 50;
const MIN_WEEKLY_GOAL = 5;
const MAX_WEEKLY_GOAL = 500;

const readWeeklyGoal = () => {
  try {
    const raw = localStorage.getItem(GOAL_STORAGE_KEY);
    if (!raw) return DEFAULT_WEEKLY_GOAL;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_WEEKLY_GOAL;
    return Math.max(MIN_WEEKLY_GOAL, Math.min(MAX_WEEKLY_GOAL, Math.round(n)));
  } catch {
    return DEFAULT_WEEKLY_GOAL;
  }
};

const writeWeeklyGoal = (n) => {
  try { localStorage.setItem(GOAL_STORAGE_KEY, String(n)); } catch { /* ignore */ }
};

const TOEFL_READING_LABELS = {
  'complete-words': 'Complete the Words',
  'daily-life': 'Read in Daily Life',
  'academic-passage': 'Read an Academic Passage',
  'toefl-complete': 'Complete the Words',
};

const TOEFL_MODE_LABELS = {
  'toefl-complete': 'Complete the Words',
  'toefl-build': 'Build a Sentence',
  'toefl-daily-life': 'Read in Daily Life',
  'toefl-academic-passage': 'Read an Academic Passage',
  'toefl-reading-mock': 'TOEFL Reading Mock Test',
  'toefl-writing-email': 'Write an Email',
  'toefl-writing-discussion': 'Write for an Academic Discussion',
  'toefl-writing-mock': 'TOEFL Writing Mock Test',
};

/**
 * 모드 카드 — Vocabulary / TOEFL 진입점.
 * 디자인 시스템 토큰 + 독자적 호버 강조 (border + glow shadow).
 */
const ModeCard = ({ mode, onSelect, wordCount }) => {
  const Icon = mode.icon;
  const isDisabled = (mode.id === 'multiple' || mode.id === 'short' || mode.id === 'mixed') && wordCount === 0;
  const locked = isDisabled || mode.disabled;

  const accent = mode.color === 'blue' ? 'brand' : 'accent';
  const accentClasses = {
    brand:  { iconBg: 'bg-brand-50  text-brand-600  shadow-sm shadow-brand-100',  arrow: 'text-brand-600',  borderHover: 'hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10' },
    accent: { iconBg: 'bg-accent-50 text-accent-600 shadow-sm shadow-accent-100', arrow: 'text-accent-600', borderHover: 'hover:border-accent-500 hover:shadow-2xl hover:shadow-accent-500/10' },
  };
  const a = accentClasses[accent];

  return (
    <button
      onClick={() => !locked && onSelect(mode)}
      disabled={locked}
      className={[
        'group relative flex flex-col p-6 rounded-card border-2 text-left overflow-hidden',
        'transition-all duration-500',
        locked
          ? 'bg-surface-50 border-surface-100 opacity-60 cursor-not-allowed grayscale'
          : `bg-white border-surface-100 ${a.borderHover} hover:-translate-y-1 active:scale-[0.98]`,
      ].join(' ')}
    >
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 ${accent === 'brand' ? 'text-brand-600' : 'text-accent-600'}`}>
        <Icon className="w-full h-full" aria-hidden="true" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 ${
          locked ? 'bg-surface-200 text-surface-500' : a.iconBg
        }`}>
          <Icon className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="mb-2">
          {mode.recommended && !locked && (
            <Badge tone="success" size="sm" className="mb-3">Recommended</Badge>
          )}
          <h3 className="text-xl font-black text-surface-900 tracking-tight">{mode.title}</h3>
        </div>

        <p className="text-surface-500 text-xs leading-relaxed font-bold mb-8 flex-1 opacity-80">{mode.description}</p>

        <div className={`inline-flex items-center gap-2 text-2xs font-black tracking-widest uppercase ${
          locked ? 'text-surface-400' : a.arrow
        }`}>
          {mode.disabled ? 'Coming Soon' : 'Configure Mode'}
          <span className="text-base leading-none transition-transform duration-500 group-hover:translate-x-1.5" aria-hidden="true">→</span>
        </div>
      </div>
    </button>
  );
};

/**
 * 최근 세션 항목.
 */
const HistoryItem = ({ entry, onSelect }) => {
  const success = entry.percentage >= 80;
  const tone = success ? 'success' : 'brand';
  const toneBg = {
    success: 'bg-success-50 text-success-500',
    brand:   'bg-brand-50   text-brand-500',
  }[tone];
  const isClickable = Boolean(onSelect);

  return (
    <Card
      variant="elevated"
      radius="xl"
      padding="sm"
      hover
      as={isClickable ? 'button' : 'div'}
      onClick={isClickable ? onSelect : undefined}
      aria-label={isClickable ? `${entry.mode} 다시 시작` : undefined}
      className={`group !p-5 w-full text-left ${isClickable ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xs font-black text-surface-400 uppercase tracking-widest">
          {new Date(entry.date).toLocaleDateString()}
        </span>
        <Badge tone={tone} size="xs">{entry.percentage}% Accuracy</Badge>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${toneBg}`}>
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
          </div>
          <p className="text-sm font-black text-surface-700">{entry.mode}</p>
        </div>
        {isClickable && (
          <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 group-hover:text-brand-500 transition-all" aria-hidden="true" />
        )}
      </div>
    </Card>
  );
};

const ToeflAssetItem = ({ asset, onSelect }) => {
  const createdAt = asset?.createdAt || asset?.created_at;
  const dateText = createdAt ? new Date(createdAt).toLocaleDateString() : 'Saved';
  const modeLabel = TOEFL_MODE_LABELS[asset?.mode] || asset?.mode || 'TOEFL';

  return (
    <Card
      variant="elevated"
      radius="xl"
      padding="sm"
      hover
      as="button"
      onClick={() => onSelect?.(asset)}
      aria-label={`${asset?.title || modeLabel} 복습하기`}
      className="group !p-5 w-full text-left"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xs font-black text-surface-400 uppercase tracking-widest">{dateText}</span>
        <Badge tone="brand" size="xs">Review</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-surface-800 truncate">{asset?.title || modeLabel}</p>
          <p className="mt-1 text-2xs font-black uppercase tracking-widest text-surface-400">{modeLabel}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 group-hover:text-brand-500 transition-all shrink-0" aria-hidden="true" />
      </div>
    </Card>
  );
};

export default function QuizDashboard({ onSelectMode, stats, wordCount, toeflAssets = [], onSelectToeflAsset }) {
  const [history, setHistory] = useState([]);
  const [readingSummary, setReadingSummary] = useState(() => summarizeToeflReadingStats());

  // Weekly Goal — 사용자별 localStorage. 인라인 편집 가능.
  const [weeklyGoal, setWeeklyGoal] = useState(DEFAULT_WEEKLY_GOAL);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(DEFAULT_WEEKLY_GOAL));

  useEffect(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem(HIST_STORAGE_KEY) || '[]');
      setHistory(savedHistory.slice(0, 5));
      setReadingSummary(summarizeToeflReadingStats());
    } catch (e) {
      console.error('Failed to load history:', e);
    }
    setWeeklyGoal(readWeeklyGoal());
  }, []);

  const commitGoal = () => {
    const parsed = Number(goalDraft);
    if (!Number.isFinite(parsed)) {
      setGoalDraft(String(weeklyGoal));
      setIsEditingGoal(false);
      return;
    }
    const next = Math.max(MIN_WEEKLY_GOAL, Math.min(MAX_WEEKLY_GOAL, Math.round(parsed)));
    setWeeklyGoal(next);
    setGoalDraft(String(next));
    writeWeeklyGoal(next);
    setIsEditingGoal(false);
  };

  const cancelGoalEdit = () => {
    setGoalDraft(String(weeklyGoal));
    setIsEditingGoal(false);
  };

  const startEditGoal = () => {
    setGoalDraft(String(weeklyGoal));
    setIsEditingGoal(true);
  };

  const vocabModes = [
    { id: 'mixed', title: 'AI 복합 퀴즈', description: '객관식, 주관식, Complete word를 섞어 단어별 난이도를 단계적으로 올리고 오답은 다시 출제합니다.', icon: Brain, color: 'blue', recommended: true },
    { id: 'multiple', title: '객관식 퀴즈', description: '4가지 뜻 중 올바른 정답을 선택하세요. 가장 빠르고 효과적인 학습 방식입니다.', icon: CheckCircle, color: 'blue' },
    { id: 'short', title: '주관식 퀴즈', description: '단어의 철자와 뜻을 직접 입력하여 암기 수준을 완벽하게 검증합니다.', icon: Edit3, color: 'purple' }
  ];

  const toeflReadingModes = [
    { id: 'toefl-reading-mock', title: 'TOEFL Reading Mock Test', description: 'Stage 1 결과에 따라 Stage 2 난이도가 갈리는 실전형 Reading 모의고사입니다.', icon: Target, color: 'purple', recommended: true },
    { id: 'toefl-complete', title: 'Complete the Words', description: '2026 TOEFL Reading의 단어 완성 task에 맞춰 문맥 속 빠진 철자를 완성합니다.', icon: Sparkles, color: 'blue', recommended: true },
    { id: 'toefl-daily-life', title: 'Read in Daily Life', description: '이메일, 공지, 일정표 등 실생활 텍스트에서 목적과 세부 정보를 빠르게 파악합니다.', icon: BookOpen, color: 'blue' },
    { id: 'toefl-academic-passage', title: 'Read an Academic Passage', description: '학술 지문을 읽고 중심 생각, 추론, 어휘 맥락, 수사적 관계를 풉니다.', icon: Zap, color: 'purple' }
  ];
  const toeflWritingModes = [
    { id: 'toefl-writing-mock', title: 'TOEFL Writing Mock Test', description: 'Build a Sentence 10문항, Email 1문항, Academic Discussion 1문항을 이어서 풉니다.', icon: FileText, color: 'purple', recommended: true },
    { id: 'toefl-build', title: 'Build a Sentence', description: '주어진 토큰을 TOEFL 수준의 문법과 논리 흐름에 맞게 배열해 완성 문장을 만듭니다.', icon: Edit3, color: 'purple' },
    { id: 'toefl-writing-email', title: 'Write an Email', description: '상황과 요구사항을 반영해 공손하고 목적이 분명한 이메일을 작성합니다.', icon: Mail, color: 'blue' },
    { id: 'toefl-writing-discussion', title: 'Write for an Academic Discussion', description: '교수 질문과 학생 의견을 읽고 100단어 이상으로 학술 토론에 기여합니다.', icon: Quote, color: 'purple' }
  ];
  const allToeflModes = [...toeflReadingModes, ...toeflWritingModes];

  const accuracyTrend = history.length >= 2
    ? history[0].percentage - history[1].percentage
    : 0;

  const goalProgress = weeklyGoal > 0
    ? Math.min((stats.studiedCount || 0) / weeklyGoal * 100, 100)
    : 0;
  const hasReadingStats = readingSummary.total > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-14 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header & Main Stats */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-4">
            <Badge tone="brand" style="dot" size="md">Learning Dashboard</Badge>
            <h2 className="text-4xl sm:text-5xl font-black text-surface-900 tracking-tight">
              Let's <span className="text-brand-600">Level Up</span> Your Vocab.
            </h2>
            <p className="text-surface-500 font-bold text-base max-w-lg leading-relaxed">
              당신만을 위한 지능형 학습 대시보드입니다. <br className="hidden sm:block" />
              오늘의 목표를 정하고 퀴즈를 시작해보세요.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-card border border-surface-100 shadow-[var(--shadow-soft)]">
            <div className="px-6 py-3 bg-surface-50 rounded-xl border border-surface-100/50">
              <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-1">Total Words</p>
              <p className="text-xl font-black text-brand-600 tracking-tighter">{wordCount}</p>
            </div>
            <div className="px-6 py-3 bg-surface-50 rounded-xl border border-surface-100/50">
              <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-1">Active Folders</p>
              <p className="text-xl font-black text-surface-900 tracking-tighter">{stats.folderCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Stat
            title="Avg. Mastery"
            value={stats.learningRate || '0%'}
            subValue="Mastery Level"
            icon={Target}
            tone="brand"
            trend={stats.rateTrend}
          />
          <Stat
            title="Session Accuracy"
            value={history.length > 0 ? `${history[0].percentage}%` : '0%'}
            subValue="Last Session"
            icon={Award}
            tone="accent"
            trend={accuracyTrend}
          />
          <Stat
            title="Studied This Week"
            value={stats.studiedCount || '0'}
            subValue="Words Completed"
            icon={BookOpen}
            tone="warning"
          />
        </div>
      </section>

      {/* Main Grid: Modes and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-16">
          {/* Vocabulary Power Section */}
          <section>
            <SectionHeading
              icon={BookOpen}
              tone="indigo"
              title="Vocabulary Training"
              subtitle="암기 수준에 맞춘 기초 단계 학습"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {vocabModes.map((mode) => (
                <ModeCard key={mode.id} mode={mode} onSelect={onSelectMode} wordCount={wordCount} />
              ))}
            </div>
          </section>

          {/* TOEFL Reading Section */}
          <section>
            <SectionHeading
              icon={Sparkles}
              tone="brand"
              title="TOEFL Reading"
              subtitle="2026 개정 Reading task와 실전 모의고사"
            />
            {hasReadingStats && (
              <Card variant="outlined" radius="card" padding="lg" className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <Badge tone="brand" style="dot" size="xs" className="mb-3">TOEFL Reading Mastery</Badge>
                    <div className="flex items-end gap-3">
                      <p className="text-4xl font-black text-surface-900 tracking-tight">{readingSummary.accuracy}%</p>
                      <p className="pb-1 text-xs font-black uppercase tracking-widest text-surface-400">
                        {readingSummary.correct}/{readingSummary.total}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-md bg-surface-50 border border-surface-100 p-3">
                      <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Weakest Task</p>
                      <p className="mt-1 font-black text-surface-800">
                        {TOEFL_READING_LABELS[readingSummary.weakestTask?.id] || readingSummary.weakestTask?.id || '-'}
                      </p>
                    </div>
                    <div className="rounded-md bg-surface-50 border border-surface-100 p-3">
                      <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Weakest Topic</p>
                      <p className="mt-1 font-black text-surface-800">{readingSummary.weakestTopic?.id || '-'}</p>
                    </div>
                    <div className="rounded-md bg-surface-50 border border-surface-100 p-3">
                      <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Weakest Skill</p>
                      <p className="mt-1 font-black text-surface-800">{readingSummary.weakestSkill?.id || '-'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {toeflReadingModes.map((mode) => (
                <ModeCard key={mode.id} mode={mode} onSelect={onSelectMode} wordCount={wordCount} />
              ))}
            </div>
          </section>

          {/* TOEFL Writing Section */}
          <section>
            <SectionHeading
              icon={Edit3}
              tone="accent"
              title="TOEFL Writing"
              subtitle="2026 개정 Writing 3유형과 실전형 12문항 구성"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {toeflWritingModes.map((mode) => (
                <ModeCard key={mode.id} mode={mode} onSelect={onSelectMode} wordCount={wordCount} />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: Recent Activity */}
        <aside className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="w-10 h-10 rounded-md bg-brand-50 grid place-items-center text-brand-600 shadow-[var(--shadow-soft)]">
                <RotateCw className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-black text-surface-900 tracking-tight">TOEFL Review</h3>
            </div>

            <div className="space-y-4">
              {toeflAssets.length > 0 ? (
                toeflAssets.slice(0, 5).map((asset) => (
                  <ToeflAssetItem key={asset.id} asset={asset} onSelect={onSelectToeflAsset} />
                ))
              ) : (
                <Card variant="outlined" radius="card" padding="lg" className="text-center !border-dashed">
                  <p className="text-surface-400 text-sm font-bold leading-relaxed">
                    아직 저장된 TOEFL 문제가 없습니다.<br />AI 문제를 풀면 여기에 쌓입니다.
                  </p>
                </Card>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="w-10 h-10 rounded-md bg-surface-100 grid place-items-center text-surface-600 shadow-[var(--shadow-soft)]">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-black text-surface-900 tracking-tight">Recent Activity</h3>
            </div>

            <div className="space-y-4">
              {history.length > 0 ? (
                history.map((entry, idx) => {
                  const matched = [...vocabModes, ...allToeflModes].find((m) => m.title === entry.mode);
                  const canRelaunch = matched && !matched.disabled && wordCount > 0;
                  return (
                    <HistoryItem
                      key={idx}
                      entry={entry}
                      onSelect={canRelaunch ? () => onSelectMode(matched) : undefined}
                    />
                  );
                })
              ) : (
                <Card variant="outlined" radius="card" padding="lg" className="text-center !border-dashed">
                  <p className="text-surface-400 text-sm font-bold leading-relaxed">
                    아직 활동 기록이 없습니다.<br />첫 퀴즈를 시작해보세요!
                  </p>
                </Card>
              )}
            </div>
          </section>

          {/* Weekly Goal */}
          <Card variant="gradient" radius="card" padding="lg" className="!p-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-pill blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <h4 className="text-lg font-black tracking-tight mb-4 relative z-10">Weekly Goal</h4>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end mb-1">
                <span className="text-2xs font-black text-brand-100 uppercase tracking-widest">Words Studied</span>
                <span className="text-sm font-black text-white inline-flex items-center gap-1">
                  <span>{stats.studiedCount || 0}</span>
                  <span className="text-brand-100">/</span>
                  {isEditingGoal ? (
                    <input
                      type="number"
                      value={goalDraft}
                      onChange={(e) => setGoalDraft(e.target.value)}
                      onBlur={commitGoal}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitGoal(); }
                        if (e.key === 'Escape') { e.preventDefault(); cancelGoalEdit(); }
                      }}
                      min={MIN_WEEKLY_GOAL}
                      max={MAX_WEEKLY_GOAL}
                      autoFocus
                      aria-label="주간 목표 수정"
                      className="w-16 bg-white/15 text-white rounded-sm px-1.5 py-0.5 text-center outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  ) : (
                    <button
                      onClick={startEditGoal}
                      title="주간 목표 변경"
                      aria-label="주간 목표 변경"
                      className="px-1.5 py-0.5 rounded-sm hover:bg-white/15 transition-colors flex items-center gap-1 group/edit"
                    >
                      <span>{weeklyGoal}</span>
                      <Edit3 className="w-3 h-3 opacity-50 group-hover/edit:opacity-100 transition-opacity" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
              <div className="w-full bg-black/20 rounded-pill h-2 overflow-hidden">
                <div
                  className="h-full bg-white rounded-pill transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <p className="text-2xs font-bold text-brand-100 leading-relaxed opacity-80">
                {goalProgress >= 100
                  ? '이번 주 목표를 달성했어요! 🎉'
                  : `이번 주 목표의 ${Math.round(goalProgress)}%를 달성했습니다. 조금만 더 힘내세요.`}
              </p>
            </div>
          </Card>
        </aside>
      </div>

      {/* Smart Tip — Footer Card */}
      <Card variant="dark" radius="hero" padding="xl" className="border border-surface-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-pill blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/10 rounded-pill blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-pair-600 flex items-center justify-center text-white shrink-0 shadow-xl group-hover:rotate-6 transition-transform duration-700">
            <Brain className="w-10 h-10" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-pill bg-brand-400 animate-pulse" />
              <h4 className="text-xl font-black text-white tracking-tight">Smart Learning Strategy</h4>
            </div>
            {stats.weakestFolder ? (
              <p className="text-surface-400 font-bold leading-relaxed text-base max-w-2xl opacity-90">
                <span className="text-brand-400 font-black italic">'{stats.weakestFolder.name}'</span> 폴더의 학습률이
                <span className="text-white font-black"> {stats.weakestFolder.avgRate}%</span>로 가장 낮아요
                ({stats.weakestFolder.wordCount}개 단어).
                이 폴더를 선택해 집중 학습하면 전체 정답률을 가장 빠르게 올릴 수 있습니다.
                AI 모드를 켜면 뉘앙스 차이까지 점검할 수 있어요.
              </p>
            ) : (
              <p className="text-surface-400 font-bold leading-relaxed text-base max-w-2xl opacity-90">
                폴더를 만들고 단어를 분류한 다음, 학습률이 낮은 폴더부터 집중 공략해보세요.
                AI 모드를 활성화하면 단순한 암기를 넘어 단어 사이의 미묘한 뉘앙스 차이까지 완벽하게 파악할 수 있습니다.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
