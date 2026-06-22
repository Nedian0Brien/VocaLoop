import React from 'react';
import { Sparkles, Target } from '../Icons';
import { SectionHead, ToggleCard } from './QuizConfigControls';
import { TOEFL_DIFFICULTY_LEVELS } from '../../services/toefl/difficulty';

export function AiDifficultySections({ aiMode, isToefl, setAiMode, setTargetScore, targetScore }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4 border-t border-surface-50">
      <section className="space-y-6">
        <SectionHead
          icon={Sparkles}
          title="AI 학습 모드"
          subtitle="지능형 채점 및 문맥 기반 생성"
          tone="warning"
        />

        <ToggleCard
          on={aiMode}
          onChange={() => setAiMode(v => !v)}
          title={`AI Assistant ${aiMode ? 'ON' : 'OFF'}`}
          desc="단어의 미세한 뉘앙스를 파악하고 지능형 문제를 생성합니다."
          tone="warning"
          activeIcon={Sparkles}
        />
      </section>

      {isToefl && (
        <section className="space-y-6">
          <SectionHead
            icon={Target}
            title="난이도"
            subtitle="문제의 지문 길이와 추론 밀도를 고릅니다"
            tone="accent"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TOEFL_DIFFICULTY_LEVELS.map((level) => {
              const selected = targetScore === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setTargetScore(level.id)}
                  aria-pressed={selected}
                  className={[
                    'min-h-[104px] rounded-card border p-4 text-left transition-all',
                    selected
                      ? 'border-accent-300 bg-accent-50 text-accent-900 shadow-sm ring-2 ring-accent-100'
                      : 'border-surface-100 bg-white text-surface-700 hover:border-accent-200',
                  ].join(' ')}
                >
                  <span className="block text-sm font-black">{level.label}</span>
                  <span className="mt-2 block text-xs font-bold leading-relaxed text-surface-500">{level.caption}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
