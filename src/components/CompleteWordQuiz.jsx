import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Sparkles, X } from './Icons';
import { Badge, Button, Card } from '../design-system';
import { playSound } from '../utils/soundEffects';
import {
  getBlankSegments,
  getEditableIndices,
  isBlankCorrect,
} from '../services/toefl/completeWordEngine';

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSingleSentenceQuestion = (word, { prefixRevealCount } = {}) => {
  const target = String(word?.word || '').trim();
  const blank = {
    id: 1,
    answer: target,
    segments: getBlankSegments(target, { prefixRevealCount }),
  };
  if (!target) return { paragraph: '{{1}}.', blank };

  const pattern = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i');
  const examples = Array.isArray(word?.examples) ? word.examples : [];
  const example = examples
    .map((item) => item?.en || '')
    .find((sentence) => pattern.test(sentence));

  if (example) {
    return {
      paragraph: example.replace(pattern, '{{1}}'),
      blank,
    };
  }

  return {
    paragraph: 'The passage uses {{1}} as the missing vocabulary word.',
    blank,
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
  const inputRefs = useRef({});
  const [answers, setAnswers] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const question = useMemo(() => buildSingleSentenceQuestion(word, {
    prefixRevealCount: showHint ? 2 : 0,
  }), [word, showHint]);
  const editableIndices = useMemo(() => getEditableIndices(question.blank), [question.blank]);
  const isFilled = editableIndices.every((inputIndex) => (answers[inputIndex] || '').trim().length > 0);

  useEffect(() => {
    setAnswers(new Array(String(word?.word || '').length).fill(''));
    setIsAnswered(false);
    setIsCorrect(false);
    setShowHint(false);
  }, [word]);

  const submit = () => {
    if (!isFilled || isAnswered) return;
    const correct = isBlankCorrect(question.blank, answers);
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

  const focusEditableInput = (inputIndex) => {
    inputRefs.current[inputIndex]?.focus();
  };

  const focusNextInput = (inputIndex) => {
    const nextInputIndex = editableIndices.find((index) => index > inputIndex);
    if (nextInputIndex !== undefined) focusEditableInput(nextInputIndex);
  };

  const focusPreviousInput = (inputIndex) => {
    const previousInputIndex = [...editableIndices].reverse().find((index) => index < inputIndex);
    if (previousInputIndex !== undefined) focusEditableInput(previousInputIndex);
  };

  const handleAnswerChange = (inputIndex, value) => {
    if (isAnswered) return;
    const sanitized = String(value || '').replace(/[^a-zA-Z]/g, '').slice(-1);
    setAnswers((current) => {
      const nextAnswers = [...current];
      nextAnswers[inputIndex] = sanitized;
      return nextAnswers;
    });
    if (sanitized) focusNextInput(inputIndex);
  };

  const handleInputKeyDown = (event, inputIndex) => {
    if (event.key === 'Backspace' && !(answers[inputIndex] || '')) {
      event.preventDefault();
      focusPreviousInput(inputIndex);
      return;
    }
    handleKeyDown(event);
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
              TOEFL Complete Word
            </Badge>
            {aiMode && (
              <Badge tone="warning" style="tag" size="sm" className="shadow-lg shadow-warning-700/20">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI Sequence
              </Badge>
            )}
          </div>

          <div className="relative z-10 space-y-4">
            <p className="text-2xs font-black uppercase tracking-[0.3em] text-brand-200/60">One-Sentence Task</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Complete the missing word.</h2>
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
            <button
              type="button"
              onClick={() => setShowHint(true)}
              disabled={isAnswered || showHint}
              className="ml-auto text-2xs font-black text-brand-600 uppercase tracking-widest hover:underline disabled:opacity-30 disabled:no-underline"
            >
              Hint
            </button>
          </div>

          <p className="mb-8 rounded-xl border border-surface-100 bg-surface-50 p-5 text-xl sm:text-2xl font-bold leading-relaxed text-surface-900">
            {question.paragraph.split(/(\{\{1\}\})/g).map((part, partIndex) => {
              if (part !== '{{1}}') return <span key={`text-${partIndex}`}>{part}</span>;
              return (
                <span
                  key="blank-1"
                  className={`inline-flex items-stretch mx-1 align-middle overflow-hidden rounded-md border shadow-sm ${
                    isAnswered
                      ? isCorrect
                        ? 'border-success-400 bg-success-50/70'
                        : 'border-danger-400 bg-danger-50/70'
                      : isFilled
                        ? 'border-brand-300 bg-brand-50/40'
                        : 'border-surface-300 bg-white'
                  }`}
                >
                  {question.blank.segments.map((segment, segmentIndex) => {
                    const isLastSegment = segmentIndex === question.blank.segments.length - 1;
                    const baseCellClass = `inline-flex h-9 w-9 items-center justify-center text-xl font-black leading-none ${
                      isLastSegment ? '' : 'border-r border-surface-200'
                    }`;

                    if (segment.type === 'fixed') {
                      return (
                        <span
                          key={`fixed-${segmentIndex}`}
                          className={`${baseCellClass} bg-surface-50 text-surface-800`}
                        >
                          {segment.value}
                        </span>
                      );
                    }

                    const answerValue = answers[segment.inputIndex] || '';
                    const expectedLetter = question.blank.answer[segment.inputIndex] || '';
                    const displayValue = isAnswered && !isCorrect ? expectedLetter : answerValue;

                    return (
                      <input
                        key={`input-${segment.inputIndex}`}
                        ref={(node) => {
                          if (!node) return;
                          inputRefs.current[segment.inputIndex] = node;
                        }}
                        value={displayValue}
                        onChange={(event) => handleAnswerChange(segment.inputIndex, event.target.value)}
                        onKeyDown={(event) => handleInputKeyDown(event, segment.inputIndex)}
                        maxLength={1}
                        disabled={isAnswered}
                        autoFocus={segment.inputIndex === editableIndices[0]}
                        inputMode="latin"
                        lang="en"
                        aria-label={`빈칸 1의 ${segment.inputIndex + 1}번째 철자`}
                        className={`${baseCellClass} bg-white text-center text-brand-700 outline-none transition-colors focus:bg-brand-50/70 disabled:opacity-100 ${
                          isAnswered
                            ? isCorrect
                              ? 'bg-success-50 text-success-700'
                              : 'bg-danger-50 text-danger-600'
                            : ''
                        }`}
                      />
                    );
                  })}
                </span>
              );
            })}
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
            <Button variant="dark" size="lg" fullWidth onClick={submit} disabled={!isFilled}>
              정답 확인
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
