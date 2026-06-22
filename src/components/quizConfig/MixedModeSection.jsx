import React from 'react';
import { BookOpen, CheckCircle, Edit3, Sparkles } from '../Icons';
import { Badge } from '../../design-system';
import { SectionHead } from './QuizConfigControls';

const MIXED_MODE_OPTIONS = [
  { id: 'flashcard', title: '플래시카드', desc: '단어와 뜻을 먼저 확인', icon: BookOpen },
  { id: 'multiple', title: '객관식', desc: '뜻 선택으로 빠르게 확인', icon: CheckCircle },
  { id: 'short-en-ko', title: '주관식 영→한', desc: '영어 단어를 보고 한국어 뜻 입력', icon: Edit3 },
  { id: 'short-ko-en', title: '주관식 한→영', desc: '한국어 뜻을 보고 영어 단어 입력', icon: Edit3 },
  { id: 'complete-word', title: 'Complete word', desc: '힌트로 영어 철자 완성', icon: Sparkles },
];

export function MixedModeSection({ mixedModeIds, toggleMixedMode }) {
  return (
    <section className="space-y-5 border-t border-surface-50 pt-2 sm:space-y-6 sm:pt-4">
      <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
        <SectionHead
          icon={Sparkles}
          title="복합 단계 구성"
          subtitle="선택한 단계 순서대로 정답 시 난이도가 올라갑니다"
          tone="warning"
        />
        <Badge tone="warning" size="xs" className="shrink-0">{mixedModeIds.length} Steps</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {MIXED_MODE_OPTIONS.map((option, index) => {
          const selected = mixedModeIds.includes(option.id);
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleMixedMode(option.id)}
              aria-pressed={selected}
              className={[
                'relative min-h-[104px] rounded-card border-2 p-4 text-left transition-all sm:min-h-[132px] sm:p-5',
                selected
                  ? 'bg-warning-50/60 border-warning-300 shadow-xl shadow-warning-500/10'
                  : 'bg-white border-surface-100 hover:border-warning-200',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selected ? 'bg-warning-500 text-white' : 'bg-surface-100 text-surface-500'
                }`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <Badge tone={selected ? 'warning' : 'neutral'} size="xs">
                  {index + 1}
                </Badge>
              </div>
              <p className={`text-sm font-black tracking-tight ${selected ? 'text-warning-900' : 'text-surface-700'}`}>
                {option.title}
              </p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-surface-400">
                {option.desc}
              </p>
            </button>
          );
        })}
      </div>

      <div className="bg-surface-50/70 border border-surface-100 rounded-card p-5">
        <p className="text-xs font-bold text-surface-500 leading-relaxed">
          정답이면 다음 단계로 이동하고, 오답이면 같은 문제가 뒤로 재출제됩니다. 같은 단계에서 연속 오답이면 한 단계 쉬운 문제로 되돌아갑니다.
        </p>
      </div>
    </section>
  );
}
