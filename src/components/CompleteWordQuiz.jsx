import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Edit3, Sparkles, X } from './Icons';
import { Badge, Button, Card } from '../design-system';
import { playSound } from '../utils/soundEffects';

const normalizeAnswer = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, '');

const buildMask = (word = '') => {
  const chars = String(word).split('');
  const letters = chars
    .map((char, index) => (/^[a-zA-Z]$/.test(char) ? index : null))
    .filter((index) => index !== null);

  if (letters.length <= 2) {
    return chars.map((char, index) => ({ char, hidden: /^[a-zA-Z]$/.test(char), index }));
  }

  const revealCount = letters.length <= 5 ? 1 : 2;
  const revealed = new Set([
    ...letters.slice(0, revealCount),
    letters[letters.length - 1],
  ]);

  return chars.map((char, index) => ({
    char,
    hidden: /^[a-zA-Z]$/.test(char) && !revealed.has(index),
    index,
  }));
};

export default function CompleteWordQuiz({
  word,
  onAnswer,
  progress,
  stats,
  aiMode,
  soundEnabled = true,
}) {
  const [answer, setAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const mask = useMemo(() => buildMask(word?.word), [word?.word]);

  useEffect(() => {
    setAnswer('');
    setIsAnswered(false);
    setIsCorrect(false);
  }, [word]);

  const submit = () => {
    if (!answer.trim() || isAnswered) return;
    const correct = normalizeAnswer(answer) === normalizeAnswer(word?.word);
    setIsCorrect(correct);
    setIsAnswered(true);
    if (soundEnabled) playSound(correct ? 'SUCCESS' : 'FAIL');
  };

  const next = () => {
    if (!isAnswered) return;
    onAnswer(isCorrect);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (isAnswered) next();
    else submit();
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-700">
      <div className="mb-8 px-1">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-0.5">Adaptive Session</p>
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
        <div className="w-full bg-surface-100 rounded-pill h-2 relative overflow-hidden">
          <div
            className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-indigo-pair-600 transition-all duration-1000 ease-out"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      <Card variant="elevated" radius="card" padding="none" className="overflow-hidden ring-1 ring-black/[0.03] shadow-[var(--shadow-elevated)]">
        <div className="bg-gradient-to-br from-surface-800 to-surface-900 text-white p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-accent-500/10 rounded-pill blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between mb-6">
            <Badge tone="dark" style="tag" size="sm" className="!bg-white/5 !text-brand-100 !border-white/10">
              Complete Word
            </Badge>
            {aiMode && (
              <Badge tone="warning" style="tag" size="sm" className="shadow-lg shadow-warning-700/20">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI Sequence
              </Badge>
            )}
          </div>

          <div className="relative z-10 space-y-4">
            <p className="text-2xs font-black uppercase tracking-[0.3em] text-brand-200/60">Meaning</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{word?.meaning_ko}</h2>
            {word?.pos && (
              <Badge tone="brand" style="tag" size="xs" className="!bg-brand-500/10 !text-brand-200 !border-brand-400/10">
                {word.pos}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-7 bg-brand-600 rounded-pill shadow-sm shadow-brand-200" aria-hidden="true" />
            <h3 className="text-lg font-black text-surface-800 tracking-tight">빈칸의 영어 단어를 완성하세요</h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-8" aria-label="단어 힌트">
            {mask.map((cell) => (
              <span
                key={`${cell.char}-${cell.index}`}
                className={[
                  'w-11 h-12 rounded-md border-2 inline-flex items-center justify-center text-xl font-black font-serif',
                  cell.hidden
                    ? 'bg-surface-50 border-surface-200 text-surface-300'
                    : 'bg-brand-50 border-brand-100 text-brand-700',
                ].join(' ')}
              >
                {cell.hidden ? '' : cell.char}
              </span>
            ))}
          </div>

          <label className="block space-y-3 mb-8">
            <span className="text-2xs font-black text-surface-400 uppercase tracking-widest">Your Answer</span>
            <div className="relative">
              <Edit3 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-300" aria-hidden="true" />
              <input
                type="text"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isAnswered}
                placeholder="영어 단어 입력"
                autoFocus
                className={[
                  'w-full h-16 pl-14 pr-5 rounded-xl border-2 bg-surface-50 text-xl font-black tracking-tight outline-none transition-all',
                  isAnswered
                    ? isCorrect
                      ? 'border-success-500 bg-success-50 text-success-700'
                      : 'border-danger-500 bg-danger-50 text-danger-700'
                    : 'border-surface-100 focus:border-brand-500 focus:bg-white focus:shadow-xl focus:shadow-brand-500/5',
                ].join(' ')}
                aria-label="완성할 영어 단어"
              />
            </div>
          </label>

          <div className={`transition-all duration-300 overflow-hidden ${isAnswered ? 'max-h-48 opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
            <div className={`p-5 rounded-xl flex items-center gap-4 border-2 ${
              isCorrect ? 'bg-success-50/70 border-success-200 text-success-700' : 'bg-danger-50/70 border-danger-200 text-danger-700'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isCorrect ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
              }`}>
                {isCorrect ? <Check className="w-7 h-7 stroke-[3px]" aria-hidden="true" /> : <AlertCircle className="w-7 h-7 stroke-[3px]" aria-hidden="true" />}
              </div>
              <div>
                <h4 className="text-lg font-black tracking-tight">{isCorrect ? 'Correct!' : 'Try Again Soon'}</h4>
                <p className="text-sm font-bold opacity-75">
                  {isCorrect ? '가장 어려운 단계를 통과했어요.' : <>정답은 <span className="font-black">{word?.word}</span> 입니다.</>}
                </p>
              </div>
            </div>
          </div>

          {isAnswered ? (
            <Button variant={isCorrect ? 'primary' : 'dark'} size="lg" fullWidth onClick={next} rightIcon={isCorrect ? Check : X}>
              다음 문제
            </Button>
          ) : (
            <Button variant="dark" size="lg" fullWidth onClick={submit} disabled={!answer.trim()}>
              정답 확인
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
