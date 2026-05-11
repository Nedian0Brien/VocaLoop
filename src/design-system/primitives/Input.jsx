import React, { forwardRef, useId } from 'react';

/**
 * Input — 라벨/아이콘/에러 메시지를 토큰 기반으로 통일.
 *
 * size       : sm | md | lg
 * leftIcon   : 좌측 아이콘 컴포넌트 (Icons.jsx)
 * rightSlot  : 우측 노드 (예: 비밀번호 토글 버튼)
 * error      : 에러 메시지(있으면 빨간 보더 + 메시지 표시)
 * hint       : 보조 설명 텍스트 (error 가 있으면 숨겨짐)
 *
 * 표준 <input> 모든 props 그대로 전달됩니다.
 */
const sizeClasses = {
  sm: { wrap: 'h-10', input: 'pl-9 pr-3 text-sm',  icon: 'left-3 w-4 h-4' },
  md: { wrap: 'h-12', input: 'pl-10 pr-4 text-sm', icon: 'left-3 w-5 h-5' },
  lg: { wrap: 'h-14', input: 'pl-12 pr-5 text-base', icon: 'left-4 w-5 h-5' },
};

const Input = forwardRef(function Input(
  {
    label,
    size = 'md',
    leftIcon: LeftIcon,
    rightSlot,
    error,
    hint,
    id,
    className = '',
    disabled,
    ...rest
  },
  ref
) {
  const reactId = useId();
  const inputId = id ?? `vl-input-${reactId}`;
  const helpId  = `${inputId}-help`;
  const sz = sizeClasses[size];

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-surface-700 mb-2"
        >
          {label}
        </label>
      )}

      <div className={`relative ${sz.wrap}`}>
        {LeftIcon && (
          <LeftIcon
            aria-hidden="true"
            className={`absolute top-1/2 -translate-y-1/2 text-surface-400 ${sz.icon}`}
          />
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={(error || hint) ? helpId : undefined}
          className={[
            'w-full h-full rounded-md border bg-white outline-none transition-all',
            'placeholder:text-surface-400 text-surface-900',
            sz.input,
            rightSlot ? 'pr-12' : '',
            error
              ? 'border-danger-500 focus:ring-2 focus:ring-danger-500/30'
              : 'border-surface-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            disabled ? 'bg-surface-50 text-surface-400 cursor-not-allowed' : '',
            className,
          ].join(' ')}
          {...rest}
        />

        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>

      {(error || hint) && (
        <p
          id={helpId}
          className={`mt-1.5 text-xs ${error ? 'text-danger-600' : 'text-surface-500'}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});

export default Input;
