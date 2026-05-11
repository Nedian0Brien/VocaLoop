import React from 'react';

/**
 * Button — VocaLoop의 모든 액션 버튼.
 *
 * variant   : primary | secondary | ghost | danger | dark
 * size      : sm | md | lg
 * loading   : true 면 스피너 + 비활성화
 * fullWidth : 부모 너비 100%
 * leftIcon / rightIcon : 아이콘 컴포넌트 (Icons.jsx)
 *
 * 새 변형이 필요하면 토큰 위에서 합성하세요. 색을 직접 박지 마세요.
 */
const variantClasses = {
  primary:
    'bg-brand-600 text-white shadow-[var(--shadow-glow-brand)] ' +
    'hover:bg-brand-700 active:bg-brand-800 ' +
    'disabled:bg-surface-200 disabled:text-surface-400 disabled:shadow-none',
  secondary:
    'bg-surface-100 text-surface-900 ' +
    'hover:bg-surface-200 active:bg-surface-300 ' +
    'disabled:bg-surface-50 disabled:text-surface-400',
  ghost:
    'bg-transparent text-surface-600 ' +
    'hover:bg-surface-100 hover:text-surface-900 ' +
    'disabled:text-surface-300',
  danger:
    'bg-danger-500 text-white ' +
    'hover:bg-danger-600 active:bg-danger-700 ' +
    'disabled:bg-surface-200 disabled:text-surface-400',
  dark:
    'bg-surface-900 text-white ' +
    'hover:bg-surface-800 active:bg-surface-700 ' +
    'disabled:bg-surface-200 disabled:text-surface-400',
};

const sizeClasses = {
  sm: 'h-9  px-4 text-sm  rounded-sm gap-1.5',
  md: 'h-11 px-5 text-sm  rounded-md gap-2',
  lg: 'h-14 px-7 text-base rounded-lg gap-2.5',
};

const Spinner = ({ className = 'w-4 h-4' }) => (
  <span
    aria-hidden="true"
    className={`${className} inline-block border-2 border-current border-t-transparent rounded-full animate-spin`}
  />
);

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center font-bold tracking-tight',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{children}</span>
        </>
      ) : (
        <>
          {LeftIcon && <LeftIcon className="w-4 h-4" aria-hidden="true" />}
          <span>{children}</span>
          {RightIcon && <RightIcon className="w-4 h-4" aria-hidden="true" />}
        </>
      )}
    </button>
  );
}
