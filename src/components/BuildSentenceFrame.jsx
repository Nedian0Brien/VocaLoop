import React from 'react';
import { splitSentenceFrame } from '../services/toefl/buildSentenceUtils';

const getSlotTone = ({ active, feedback, filled }) => {
  if (feedback?.isCorrect) {
    return filled
      ? 'border-success-300 bg-white text-success-700'
      : 'border-success-300 bg-success-50 text-success-700';
  }
  if (feedback && !feedback.isCorrect) {
    return filled
      ? 'border-danger-300 bg-white text-danger-700'
      : 'border-danger-300 bg-danger-50 text-danger-700';
  }
  if (active) {
    return 'border-brand-500 bg-brand-50 text-brand-800 shadow-[0_0_0_3px_rgb(59_130_246/0.12)]';
  }
  return filled
    ? 'border-brand-300 bg-white text-brand-700 hover:border-brand-500 hover:bg-brand-50'
    : 'border-surface-300 bg-white text-surface-400';
};

export default function BuildSentenceFrame({
  arrangement,
  containerRef,
  disabled,
  drag,
  dropAtIdx,
  feedback = null,
  onTokenClick,
  onTokenPointerDown,
  question,
}) {
  const words = Array.isArray(question?.words) ? question.words : [];
  const parts = splitSentenceFrame(question?.sentenceFrame);

  return (
    <div
      ref={containerRef}
      data-testid="build-sentence-frame"
      className={`rounded-md border-2 border-dashed p-4 md:p-5 transition-colors ${
        feedback?.isCorrect
          ? 'border-success-400 bg-success-50/40'
          : feedback && !feedback.isCorrect
            ? 'border-danger-400 bg-danger-50/40'
            : drag
              ? 'border-brand-400 bg-brand-50/40'
              : arrangement.length > 0
                ? 'border-brand-300 bg-brand-50/30'
                : 'border-surface-200 bg-white'
      }`}
    >
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-base md:text-lg font-black text-surface-900 leading-[2.35]">
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <span key={`text-${index}`} className="whitespace-pre-wrap">
                {part.text}
              </span>
            );
          }

          const wordIndex = arrangement[part.index];
          const token = words[wordIndex];
          const filled = token != null;
          const active = dropAtIdx === part.index;
          const tone = getSlotTone({ active, feedback, filled });

          if (!filled) {
            return (
              <span
                key={`blank-${part.index}`}
                data-drop-slot={part.index}
                aria-hidden="true"
                className={`inline-flex min-h-9 min-w-20 items-center justify-center rounded-sm border-2 border-dashed px-3 align-middle transition-colors ${tone}`}
              />
            );
          }

          return (
            <button
              key={`blank-${part.index}-${wordIndex}`}
              type="button"
              data-arr-word={part.index}
              data-drop-slot={part.index}
              onPointerDown={onTokenPointerDown('arr', part.index, wordIndex)}
              onClick={() => onTokenClick(wordIndex)}
              disabled={disabled}
              aria-label={`${token}: 클릭으로 제거하거나 드래그로 위치 변경`}
              style={{ touchAction: 'none' }}
              className={`inline-flex min-h-9 items-center justify-center rounded-sm border px-3 text-sm font-bold align-middle transition-colors disabled:cursor-default ${tone}`}
            >
              {token}
            </button>
          );
        })}
      </p>
    </div>
  );
}
