import React from 'react';

/**
 * SectionHeading — 큰 섹션 시작부의 표준 헤더.
 * QuizDashboard 의 섹션 헤더 패턴을 표준화.
 *
 * icon     : 아이콘 컴포넌트
 * title    : 섹션 제목
 * subtitle : 보조 설명
 * tone     : brand | accent | indigo | dark
 * size     : md (기본) | lg
 * action   : 우측 액션 노드 (옵션)
 */
const toneClasses = {
  brand:  'bg-brand-600    text-white shadow-[var(--shadow-glow-brand)]',
  accent: 'bg-accent-600   text-white shadow-[var(--shadow-glow-accent)]',
  indigo: 'bg-indigo-pair-600 text-white shadow-[var(--shadow-glow-indigo)]',
  dark:   'bg-surface-900  text-white',
};

const sizeClasses = {
  md: { iconBox: 'w-12 h-12 rounded-lg', iconSize: 'w-6 h-6', title: 'text-2xl' },
  lg: { iconBox: 'w-14 h-14 rounded-xl', iconSize: 'w-7 h-7', title: 'text-3xl' },
};

export default function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  tone = 'indigo',
  size = 'md',
  action,
  className = '',
}) {
  const sz = sizeClasses[size];

  return (
    <div className={`flex items-center justify-between mb-8 px-2 ${className}`}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`${sz.iconBox} flex items-center justify-center ${toneClasses[tone]}`}>
            <Icon className={sz.iconSize} aria-hidden="true" />
          </div>
        )}
        <div>
          <h3 className={`${sz.title} font-black text-surface-900 tracking-tight`}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm font-bold text-surface-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
