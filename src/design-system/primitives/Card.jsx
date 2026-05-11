import React from 'react';

/**
 * Card — VocaLoop의 모든 면(surface) 컨테이너.
 *
 * variant : elevated | flat | outlined | dark | gradient
 * padding : none | sm | md | lg | xl
 * radius  : md | lg | xl | card | hero  (의미 기반 토큰)
 * hover   : true → 호버 시 들어올림 + 그림자 강화
 *
 * 사용 가이드
 *  - 메인 콘텐츠 카드: variant="elevated" radius="card" padding="lg"
 *  - 사이드바/소형: variant="flat"     radius="xl"   padding="md"
 *  - 푸터/CTA 강조: variant="dark"     radius="hero" padding="xl"
 *  - 강조 액션:    variant="gradient" radius="card" padding="lg"
 */
const variantClasses = {
  elevated: 'bg-white border border-surface-100 shadow-[var(--shadow-card)]',
  flat:     'bg-white border border-surface-100',
  outlined: 'bg-transparent border-2 border-surface-200',
  dark:
    'bg-surface-900 border border-surface-800 text-white shadow-[var(--shadow-elevated)] ' +
    'relative overflow-hidden',
  gradient:
    'bg-gradient-to-br from-indigo-pair-600 to-brand-700 text-white ' +
    'shadow-[var(--shadow-glow-indigo)] relative overflow-hidden',
};

const paddingClasses = {
  none: 'p-0',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
  xl:   'p-10 sm:p-14',
};

const radiusClasses = {
  md:   'rounded-md',
  lg:   'rounded-lg',
  xl:   'rounded-xl',
  card: 'rounded-2xl',  // 시그니처 카드 모서리
  hero: 'rounded-3xl',  // 히어로/푸터
};

const hoverClasses =
  'transition-all duration-300 ease-out ' +
  'hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]';

export default function Card({
  variant = 'elevated',
  padding = 'lg',
  radius = 'card',
  hover = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={[
        variantClasses[variant],
        paddingClasses[padding],
        radiusClasses[radius],
        hover ? hoverClasses : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
