import React, { useCallback, useEffect } from 'react';
import { BookOpen, Check, Quote, Volume2, X } from './Icons';
import { Badge, Button, Card } from '../design-system';
import { speakEnglishWord } from '../utils/speechSynthesis';

export default function FlashcardQuiz({
  word,
  onAnswer,
  progress,
  stats,
  soundEnabled = true,
}) {
  const speakWord = useCallback(() => {
    if (!word?.word || !soundEnabled) return;
    speakEnglishWord(word.word, word.pronunciationAudioUrl);
  }, [soundEnabled, word?.pronunciationAudioUrl, word?.word]);

  useEffect(() => {
    speakWord();
  }, [speakWord]);

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

      <Card variant="elevated" radius="card" padding="none" className="overflow-hidden ring-1 ring-black/[0.03] shadow-[var(--shadow-elevated)]">
        <div className="bg-gradient-to-br from-surface-800 to-surface-900 text-white p-8 sm:p-10">
          <div className="flex items-center justify-between mb-6">
            <Badge tone="dark" style="tag" size="sm" className="!bg-white/5 !text-brand-100 !border-white/10">
              <BookOpen className="w-3 h-3" aria-hidden="true" />
              Flashcard
            </Badge>
            <button
              type="button"
              onClick={speakWord}
              disabled={!soundEnabled}
              aria-label="발음 듣기"
              className={`w-11 h-11 rounded-md border border-white/10 bg-white/5 text-white/80 transition-all hover:bg-white/10 active:scale-90 ${!soundEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <Volume2 className="w-5 h-5 mx-auto" aria-hidden="true" />
            </button>
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl font-black tracking-tight">{word?.word}</h2>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {word?.pronunciation && (
              <p className="text-lg font-serif italic text-brand-200/60">{word.pronunciation}</p>
            )}
            {word?.pos && (
              <span className="rounded-xs border border-brand-400/10 bg-brand-500/10 px-2.5 py-0.5 text-2xs font-black uppercase tracking-wider text-brand-300">
                {word.pos}
              </span>
            )}
          </div>
        </div>

        <div className="p-8 sm:p-10 space-y-6">
          <div>
            <p className="mb-2 text-2xs font-black uppercase tracking-widest text-surface-400">Meaning</p>
            <p className="text-2xl font-black tracking-tight text-surface-900">{word?.meaning_ko || '-'}</p>
          </div>

          {word?.definitions?.[0] && (
            <div className="rounded-xl border border-surface-100 bg-surface-50 p-5">
              <p className="text-sm font-bold leading-relaxed text-surface-700">{word.definitions[0]}</p>
              {word?.definitions_ko?.[0] && (
                <p className="mt-2 text-xs font-bold text-surface-500">{word.definitions_ko[0]}</p>
              )}
            </div>
          )}

          {word?.examples?.[0] && (
            <div className="rounded-xl border border-indigo-pair-500/10 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Quote className="w-4 h-4 text-indigo-pair-500" aria-hidden="true" />
                <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Example</p>
              </div>
              <p className="text-sm font-black text-surface-900">"{word.examples[0].en}"</p>
              <p className="mt-1 text-xs font-bold text-surface-500">{word.examples[0].ko}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="secondary" size="lg" onClick={() => onAnswer(false)} leftIcon={X} fullWidth>
              다시 볼래요
            </Button>
            <Button variant="primary" size="lg" onClick={() => onAnswer(true)} rightIcon={Check} fullWidth>
              알고 있어요
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
