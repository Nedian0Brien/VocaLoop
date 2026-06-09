import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Sparkles, X } from './Icons';
import { Badge, Button, Card } from '../design-system';
import { playSound } from '../utils/soundEffects';

const normalizeAnswer = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, '');

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSentencePrompt = (word) => {
  const target = String(word?.word || '').trim();
  if (!target) return { before: '', after: '' };

  const pattern = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i');
  const examples = Array.isArray(word?.examples) ? word.examples : [];
  const example = examples
    .map((item) => item?.en || '')
    .find((sentence) => pattern.test(sentence));

  if (example) {
    const match = example.match(pattern);
    return {
      before: example.slice(0, match.index),
      after: example.slice(match.index + match[0].length),
    };
  }

  return {
    before: `This word means ${word?.meaning_ko || 'the given meaning'}: `,
    after: '.',
  };
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
  const sentencePrompt = useMemo(() => buildSentencePrompt(word), [word]);

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
    event.stopPropagation();
    if (isAnswered) next();
    else submit();
  };

  useEffect(() => {
    if (!isAnswered) return;
    const handleNextKey = (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      next();
    };
    window.addEventListener('keydown', handleNextKey);
    return () => window.removeEventListener('keydown', handleNextKey);
  }, [isAnswered, next]);

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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-7 bg-brand-600 rounded-pill shadow-sm shadow-brand-200" aria-hidden="true" />
            <h3 className="text-lg font-black text-surface-800 tracking-tight">문장의 빈칸에 들어갈 단어를 입력하세요</h3>
          </div>

          <p className="mb-8 rounded-xl border border-surface-100 bg-surface-50 p-5 text-xl sm:text-2xl font-bold leading-relaxed text-surface-900">
            <span>{sentencePrompt.before}</span>
            <input
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAnswered}
              placeholder="____"
              autoFocus
              inputMode="latin"
              lang="en"
              style={{ width: `${Math.max(8, String(word?.word || '').length + 2)}ch` }}
              className={[
                'mx-1 inline-block h-12 rounded-md border-2 px-3 text-center font-black text-brand-700 placeholder-surface-300 outline-none transition-all align-baseline',
                isAnswered
                  ? isCorrect
                    ? 'border-success-500 bg-success-50 text-success-700'
                    : 'border-danger-500 bg-danger-50 text-danger-700'
                  : 'border-brand-200 bg-white focus:border-brand-500 focus:shadow-xl focus:shadow-brand-500/10',
              ].join(' ')}
              aria-label="문장 빈칸에 들어갈 영어 단어"
            />
            <span>{sentencePrompt.after}</span>
          </p>

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
