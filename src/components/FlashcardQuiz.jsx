import React, { useEffect, useState } from 'react';
import WordCard from './WordCard';
import { Check, X } from './Icons';
import { Button, Card } from '../design-system';

const noop = () => {};

export default function FlashcardQuiz({
  word,
  onAnswer,
  progress,
  stats,
  folders = [],
  onDeleteWord = noop,
  onMoveWord = noop,
  onToggleWordFlag = noop,
  onRegenerateWord,
  soundEnabled = true,
}) {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    setIsRevealed(false);
  }, [word?.id, word?.word]);

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-700">
      <div className="mb-6 px-1">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="mb-0.5 text-2xs font-black uppercase tracking-widest text-surface-400">Flashcard</p>
            <h4 className="text-xl font-black tracking-tight text-surface-900">
              Q. <span className="text-brand-600">{progress.current}</span>
              <span className="mx-1.5 font-light text-surface-300">/</span>
              <span className="text-sm font-bold text-surface-400">{progress.total}</span>
            </h4>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="mb-0.5 text-2xs font-black uppercase tracking-widest text-success-500">Correct</p>
              <p className="text-lg font-black leading-none text-success-600">{stats.correct}</p>
            </div>
            <div className="border-l border-surface-100 pl-4 text-right">
              <p className="mb-1 text-2xs font-black uppercase tracking-widest text-danger-400">Wrong</p>
              <p className="text-lg font-black leading-none text-danger-500">{stats.wrong}</p>
            </div>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-100">
          <div
            className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-indigo-pair-600 transition-all duration-1000 ease-out"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      <Card
        variant="elevated"
        radius="card"
        padding="none"
        data-testid="flashcard-quiz-card"
        className="overflow-visible ring-1 ring-black/[0.03] shadow-[var(--shadow-elevated)]"
      >
        <div className="rounded-t-card bg-gradient-to-br from-surface-800 to-surface-900 px-6 py-5 text-white sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-2xs font-black uppercase tracking-widest text-brand-200/70">Flashcard</p>
            <p className="text-2xs font-black uppercase tracking-widest text-white/40">
              {progress.current}/{progress.total}
            </p>
          </div>
        </div>

        <div className="rounded-b-card bg-white p-5 sm:p-8">
          <div className="mx-auto max-w-md" data-testid="flashcard-word-card">
            <WordCard
              key={word?.id ?? word?.word}
              item={word}
              handleDeleteWord={onDeleteWord}
              folders={folders}
              onMoveWord={onMoveWord}
              onToggleFlag={onToggleWordFlag}
              onRegenerateWord={onRegenerateWord}
              onFlipChange={setIsRevealed}
              soundEnabled={soundEnabled}
            />
          </div>

          {isRevealed && (
            <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-3" data-testid="flashcard-review-actions">
              <Button variant="secondary" size="md" onClick={() => onAnswer(false)} leftIcon={X} fullWidth className="!px-3 sm:!px-5">
                다시 볼래요
              </Button>
              <Button variant="primary" size="md" onClick={() => onAnswer(true)} rightIcon={Check} fullWidth className="!px-3 sm:!px-5">
                알고 있어요
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
