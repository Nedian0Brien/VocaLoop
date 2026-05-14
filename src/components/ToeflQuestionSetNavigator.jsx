import React from 'react';
import { ChevronLeft, ChevronRight } from './Icons';
import { Button } from '../design-system';

const normalizeAnsweredStates = (states, totalQuestions) =>
  Array.from({ length: totalQuestions }, (_, index) => Boolean(states?.[index]));

export default function ToeflQuestionSetNavigator({
  answeredStates = [],
  className = '',
  currentIndex,
  isRevealed = false,
  onNavigate,
  totalQuestions,
}) {
  if (!totalQuestions || totalQuestions <= 1) return null;

  const states = normalizeAnsweredStates(answeredStates, totalQuestions);
  const answeredCount = states.filter(Boolean).length;
  const navigateTo = (index) => {
    if (index < 0 || index >= totalQuestions || index === currentIndex) return;
    onNavigate?.(index);
  };

  return (
    <section
      className={[
        'rounded-md border border-surface-100 bg-surface-50 p-4 space-y-3',
        className,
      ].join(' ')}
      aria-label="문항 진행"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xs font-black uppercase tracking-widest text-surface-400">문항 진행</p>
          <p className="text-sm font-black text-surface-900">
            풀이 {answeredCount}/{totalQuestions}
            {isRevealed ? <span className="text-surface-400"> · 채점 완료</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={ChevronLeft}
            onClick={() => navigateTo(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            이전 문항
          </Button>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={ChevronRight}
            onClick={() => navigateTo(currentIndex + 1)}
            disabled={currentIndex >= totalQuestions - 1}
          >
            다음 문항
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="문항 풀이 바 차트">
        {states.map((isAnswered, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={`question-progress-${index}`}
              type="button"
              aria-current={isActive ? 'step' : undefined}
              aria-label={`문항 ${index + 1}로 이동`}
              data-answered={isAnswered ? 'true' : 'false'}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => navigateTo(index)}
              className={[
                'h-8 min-w-10 flex-1 rounded-sm border px-2 text-xs font-black transition-all',
                isActive ? 'ring-2 ring-brand-300 ring-offset-1 ring-offset-surface-50' : '',
                isAnswered
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-surface-200 bg-white text-surface-400 hover:border-brand-200 hover:text-brand-600',
              ].join(' ')}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </section>
  );
}
