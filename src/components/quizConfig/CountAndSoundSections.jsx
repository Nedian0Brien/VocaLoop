import React from 'react';
import { Hash, Volume2 } from '../Icons';
import { Badge } from '../../design-system';
import { SectionHead, ToggleCard } from './QuizConfigControls';

export function CountAndSoundSections({
  countBadge,
  countSubtitle,
  countTitle,
  countValue,
  isMixed,
  isToefl,
  maxQuestions,
  maxStudySetSize,
  setQuestionCount,
  setSoundEnabled,
  setStudySetSize,
  soundEnabled,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <section className="space-y-6">
        <SectionHead icon={Hash} title={countTitle} subtitle={countSubtitle} />

        <div className="space-y-6 px-1 pt-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <span className="text-5xl font-black text-surface-900 tracking-tighter">{countValue}</span>
              <Badge tone="brand" size="xs" className="absolute -top-4 -right-12">{countBadge}</Badge>
            </div>
            <div className="text-right">
              <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-1">
                {isMixed ? 'Total Words' : 'Max Questions'}
              </p>
              <p className="text-sm font-black text-surface-600">{isMixed ? maxStudySetSize : maxQuestions}</p>
            </div>
          </div>

          <div className="relative py-2">
            <input
              type="range"
              min={1}
              max={isMixed ? maxStudySetSize : maxQuestions}
              value={countValue}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (isMixed) setStudySetSize(next);
                else setQuestionCount(next);
              }}
              aria-label={countTitle}
              className="w-full h-3 bg-surface-100 rounded-pill appearance-none cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between mt-4 text-2xs font-black text-surface-300 uppercase tracking-widest">
              <span>{isMixed ? '1 Word' : '1 Unit'}</span>
              <span>{isMixed ? 'Set Size' : isToefl ? 'Limit 10' : 'Adaptive Max'}</span>
            </div>
          </div>
          {isMixed && (
            <p className="text-xs font-bold text-surface-500 leading-relaxed">
              전체 단어를 {countValue}개씩 묶어 세트별로 진행합니다. 각 세트가 끝나면 잠깐 멈추고 다음 학습으로 넘어갈 수 있습니다.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHead
          icon={Volume2}
          title="사운드 설정"
          subtitle="효과음 및 자동 발음 제어"
          tone="brand"
        />

        <ToggleCard
          on={soundEnabled}
          onChange={() => setSoundEnabled(v => !v)}
          title={`사운드 ${soundEnabled ? '활성화' : '비활성화'}`}
          desc={`발음 자동 재생 및 정답 효과음이 ${soundEnabled ? '들립니다.' : '나오지 않습니다.'}`}
          tone="brand"
          activeIcon={Volume2}
        />
      </section>
    </div>
  );
}
