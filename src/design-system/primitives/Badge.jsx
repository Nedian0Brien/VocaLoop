import React from 'react';

/**
 * Badge — eyebrow / 라벨 / 상태 표시.
 *
 * tone   : brand | accent | success | warning | danger | neutral | dark
 * style  : pill (기본 — uppercase tracking-widest editorial 스타일)
 *        | tag  (소문자, 일반 라벨)
 *        | dot  (왼쪽 점 인디케이터)
 * size   : xs | sm | md
 */
const toneClasses = {
  brand:   'bg-brand-50  text-brand-700',
  accent:  'bg-accent-50 text-accent-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger:  'bg-danger-50  text-danger-700',
  neutral: 'bg-surface-100 text-surface-600',
  dark:    'bg-surface-900 text-white',
};

const dotToneClasses = {
  brand:   'bg-brand-500',
  accent:  'bg-accent-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  neutral: 'bg-surface-400',
  dark:    'bg-white',
};

const sizeClasses = {
  xs: 'h-5  px-2   text-2xs gap-1',
  sm: 'h-6  px-2.5 text-2xs gap-1.5',
  md: 'h-7  px-3   text-xs  gap-1.5',
};

export default function Badge({
  tone = 'brand',
  style = 'pill',
  size = 'sm',
  className = '',
  children,
  ...rest
}) {
  const isPill = style === 'pill';
  const isDot  = style === 'dot';

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-pill border',
        'border-transparent font-black',
        isPill ? 'uppercase tracking-widest' : '',
        toneClasses[tone],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {isDot && (
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-pill ${dotToneClasses[tone]} animate-pulse`}
        />
      )}
      {children}
    </span>
  );
}
