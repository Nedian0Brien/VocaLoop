import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Quote, Volume2, X } from './Icons';
import { Badge, Button } from '../design-system';
import { speakEnglishWord } from '../utils/speechSynthesis';

export default function FlashcardQuiz({
  word,
  onAnswer,
  progress,
  stats,
  soundEnabled = true,
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const contentRef = useRef(null);
  const [backHeight, setBackHeight] = useState('34rem');

  const speakWord = useCallback(() => {
    if (!word?.word || !soundEnabled) return;
    speakEnglishWord(word.word, word.pronunciationAudioUrl);
  }, [soundEnabled, word?.pronunciationAudioUrl, word?.word]);

  useEffect(() => {
    setIsRevealed(false);
  }, [word?.id, word?.word]);

  useEffect(() => {
    speakWord();
  }, [speakWord]);

  useEffect(() => {
    if (isRevealed && contentRef.current) {
      setBackHeight(`${Math.max(contentRef.current.scrollHeight, 544)}px`);
    }
  }, [isRevealed, word]);

  const currentHeight = isRevealed ? backHeight : '34rem';
  const frontClass = isRevealed ? 'absolute inset-0' : 'relative';
  const backClass = isRevealed ? 'relative' : 'absolute inset-0';

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-700">
      <div className="mb-8 px-1">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-0.5">Flashcard</p>
            <h4 className="text-xl font-black text-surface-900 tracking-tight">
              Q. <span className="text-brand-600">{progress.current}</span>
              <span className="text-surface-300 mx-1.5 font-light">/</span>
              <span className="text-surface-400 text-sm font-bold">{progress.total}</span>
            </h4>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-2xs font-black text-success-500 uppercase tracking-widest mb-0.5">Correct</p>
              <p className="text-lg font-black text-success-600 leading-none">{stats.correct}</p>
            </div>
            <div className="text-right border-l border-surface-100 pl-4">
              <p className="text-2xs font-black text-danger-400 uppercase tracking-widest mb-1">Wrong</p>
              <p className="text-lg font-black text-danger-500 leading-none">{stats.wrong}</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-surface-100 rounded-pill h-2 overflow-hidden">
          <div
            className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-indigo-pair-600 transition-all duration-1000 ease-out"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      <div
        className="overflow-visible w-full"
        style={{ height: currentHeight, transition: 'height 0.7s var(--ease-spring)' }}
      >
        <div
          data-testid="flashcard-flip-surface"
          className={`card-flip w-full h-full relative ${isRevealed ? 'flipped' : ''}`}
        >
          <div className="card-inner word-card-radius-shell" data-testid="flashcard-shell">
            <div
              data-testid="flashcard-front-face"
              aria-hidden={isRevealed || undefined}
              className={`card-front overflow-hidden bg-gradient-to-br from-surface-800 to-surface-900 p-8 text-white ring-1 ring-black/[0.03] shadow-[var(--shadow-elevated)] sm:p-10 ${frontClass}`}
            >
              <div className="flex h-full min-h-[34rem] flex-col">
                <button
                  type="button"
                  onClick={() => setIsRevealed(true)}
                  aria-label={`${word?.word || ''} 카드 뒤집기`}
                  tabIndex={isRevealed ? -1 : undefined}
                  className="flex min-h-[28rem] flex-1 items-center justify-center rounded-xl px-2 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-300"
                >
                  <h2 className="font-serif text-5xl font-black tracking-tight sm:text-6xl">{word?.word}</h2>
                </button>
              </div>
            </div>

            {isRevealed && (
              <div
                ref={contentRef}
                data-testid="flashcard-back-face"
                className={`card-back overflow-hidden bg-white ring-1 ring-black/[0.03] shadow-[var(--shadow-elevated)] ${backClass}`}
              >
                <div className="custom-scrollbar flex max-h-[calc(100vh-9rem)] min-h-[34rem] flex-col overflow-y-auto bg-white">
                  <div className="border-b border-surface-100 bg-surface-900 p-6 text-white sm:p-8">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <Badge tone="dark" style="tag" size="sm" className="!border-white/10 !bg-white/5 !text-brand-100">
                        <BookOpen className="h-3 w-3" aria-hidden="true" />
                        Flashcard
                      </Badge>
                      <button
                        type="button"
                        onClick={speakWord}
                        disabled={!soundEnabled}
                        aria-label="발음 듣기"
                        className={`h-10 w-10 rounded-md border border-white/10 bg-white/5 text-white/80 transition-all hover:bg-white/10 active:scale-90 ${!soundEnabled ? 'cursor-not-allowed opacity-30' : ''}`}
                      >
                        <Volume2 className="mx-auto h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <h2 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">{word?.word}</h2>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {word?.pronunciation && (
                        <p className="font-serif text-base italic text-brand-200/70 sm:text-lg">{word.pronunciation}</p>
                      )}
                      {word?.pos && (
                        <span className="rounded-xs border border-brand-400/10 bg-brand-500/10 px-2.5 py-0.5 text-2xs font-black uppercase tracking-wider text-brand-300">
                          {word.pos}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
                    <div>
                      <p className="mb-2 text-2xs font-black uppercase tracking-widest text-surface-400">뜻</p>
                      <p className="text-2xl font-black tracking-tight text-surface-900">{word?.meaning_ko || '-'}</p>
                    </div>

                    {word?.definitions?.[0] && (
                      <div className="rounded-xl border border-surface-100 bg-surface-50 p-5">
                        <p className="mb-2 text-2xs font-black uppercase tracking-widest text-surface-400">정의</p>
                        <p className="text-sm font-bold leading-relaxed text-surface-700">{word.definitions[0]}</p>
                        {word?.definitions_ko?.[0] && (
                          <p className="mt-2 text-xs font-bold leading-relaxed text-surface-500">{word.definitions_ko[0]}</p>
                        )}
                      </div>
                    )}

                    {word?.nuance && (
                      <div className="rounded-xl border border-brand-500/10 bg-brand-50/60 p-5">
                        <p className="mb-2 text-2xs font-black uppercase tracking-widest text-brand-500">뉘앙스</p>
                        <p className="text-sm font-bold leading-relaxed text-surface-700">{word.nuance}</p>
                      </div>
                    )}

                    {word?.examples?.[0] && (
                      <div className="rounded-xl border border-indigo-pair-500/10 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                          <Quote className="h-4 w-4 text-indigo-pair-500" aria-hidden="true" />
                          <p className="text-2xs font-black uppercase tracking-widest text-surface-400">예문</p>
                        </div>
                        <p className="text-sm font-black leading-snug text-surface-900">"{word.examples[0].en}"</p>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-surface-500">{word.examples[0].ko}</p>
                      </div>
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-3 pt-1">
                      <Button variant="secondary" size="md" onClick={() => onAnswer(false)} leftIcon={X} fullWidth className="!px-3 sm:!px-5">
                        다시 볼래요
                      </Button>
                      <Button variant="primary" size="md" onClick={() => onAnswer(true)} rightIcon={Check} fullWidth className="!px-3 sm:!px-5">
                        알고 있어요
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
