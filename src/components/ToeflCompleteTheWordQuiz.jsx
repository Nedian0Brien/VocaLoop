import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Settings, X, Save, Check } from './Icons';
import {
  generateCompleteTheWordSet,
  generateCompleteTheWordFeedback,
  generateCompleteTheWordSummary,
} from '../services/toeflService';
import { generateWordData } from '../services/geminiService';
import { createWord } from '../services/wordApi';
import { playSound } from '../utils/soundEffects';
import { Button } from '../design-system';
import { useToeflQuizSession } from '../hooks/useToeflQuizSession';
import { formatToeflDifficultyLabel } from '../services/toefl/difficulty';
import {
  buildCompleteQuestionResults,
  buildCompleteUserAnswers,
  formatCompleteResultsPayload,
  getBlankResults,
  getBlankSegments,
  getEditableIndices,
  getFilledBlankCount,
  getQuestionCorrectness,
  initializeCompleteAnswers,
  isBlankCorrect,
  prepareCompleteQuestions,
} from '../services/toefl/completeWordEngine';

const FONT_SCALE_STORAGE_KEY = 'vocaloop_toefl_complete_font_scale';

const FONT_SCALE_STYLES = {
  1: { paragraph: 'text-lg leading-[1.9] md:text-xl',          cell: 'w-6 h-6 text-base md:w-8 md:h-8 md:text-lg' },
  2: { paragraph: 'text-xl leading-[1.9] md:text-2xl',         cell: 'w-7 h-7 text-lg md:w-9 md:h-9 md:text-xl' },
  3: { paragraph: 'text-2xl leading-[1.9] md:text-[1.75rem]',  cell: 'w-8 h-8 text-xl md:w-10 md:h-10 md:text-2xl' },
  4: { paragraph: 'text-[1.8rem] leading-[1.9] md:text-[2rem]',cell: 'w-9 h-9 text-2xl md:w-11 md:h-11 md:text-[1.7rem]' },
  5: { paragraph: 'text-[2rem] leading-[1.9] md:text-[2.2rem]',cell: 'w-10 h-10 text-2xl md:w-12 md:h-12 md:text-[2rem]' },
};

const renderParagraphWithInputs = ({
  paragraph, blanks, answers, onChange, onKeyDown, onBlankClick,
  isChecked, questionIndex, inputRefs, fontScaleLevel, blankResults,
}) => {
  const parts = [];
  const regex = /{{(\d+)}}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(paragraph)) !== null) {
    const matchIndex = match.index;
    const blankId = Number(match[1]);
    const blankIndex = blanks.findIndex((blank) => blank.id === blankId);
    if (blankIndex === -1) {
      parts.push(match[0]);
      lastIndex = matchIndex + match[0].length;
      continue;
    }

    parts.push(paragraph.slice(lastIndex, matchIndex));

    const blankAnswer = blanks[blankIndex].answer || '';
    const blankSegments = blanks[blankIndex].segments || getBlankSegments(blankAnswer);
    const blankAnswers = answers[blankIndex] || new Array(blankAnswer.length).fill('');

    const editableIndices = blankSegments
      .filter((segment) => segment.type === 'editable')
      .map((segment) => segment.inputIndex);

    const blankResult = blankResults?.[blankIndex];
    const isWordCorrect = Boolean(blankResult?.isCorrect);
    const hasWordResult = Boolean(blankResult);
    const isBlankFilled =
      editableIndices.length > 0 &&
      editableIndices.every((inputIndex) => (blankAnswers[inputIndex] || '').trim().length > 0);

    parts.push(
      <span
        key={`blank-${blankId}`}
        className={`inline-flex items-stretch mx-1 align-middle overflow-hidden rounded-md border shadow-sm cursor-text transition-colors duration-200 ${
          isChecked && hasWordResult
            ? isWordCorrect
              ? 'border-success-400 bg-success-50/70'
              : 'border-danger-400  bg-danger-50/70'
            : isChecked
              ? 'border-surface-300 bg-white'
              : isBlankFilled
                ? 'border-brand-300 bg-brand-50/40'
                : 'border-surface-300 bg-white'
        }`}
        role="button"
        tabIndex={isChecked ? -1 : 0}
        onClick={(event) => {
          if (isChecked) return;
          if (event.target instanceof HTMLInputElement) return;
          onBlankClick(blankIndex);
        }}
        onKeyDown={(event) => {
          if (isChecked) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onBlankClick(blankIndex);
          }
        }}
        aria-label={`빈칸 ${blankIndex + 1} 입력 시작`}
      >
        {blankSegments.map((segment, segmentIndex) => {
          const isLastSegment = segmentIndex === blankSegments.length - 1;
          const baseCellClass = `inline-flex items-center justify-center ${FONT_SCALE_STYLES[fontScaleLevel]?.cell || FONT_SCALE_STYLES[3].cell} font-medium leading-none ${
            isLastSegment ? '' : 'border-r border-surface-200'
          }`;

          if (segment.type === 'fixed') {
            return (
              <span
                key={`fixed-${blankId}-${segmentIndex}`}
                className={`${baseCellClass} bg-surface-50 text-surface-800`}
              >
                {segment.value}
              </span>
            );
          }

          const answerValue = blankAnswers[segment.inputIndex] || '';
          const expectedLetter = blankAnswer[segment.inputIndex] || '';
          const displayValue = isChecked && !isWordCorrect ? expectedLetter : answerValue;
          const isCorrect = isChecked && answerValue.toLowerCase() === expectedLetter.toLowerCase();
          const isWrongLetter = isChecked && !isWordCorrect && !isCorrect;

          return (
            <input
              key={`blank-${blankId}-${segmentIndex}`}
              ref={(node) => {
                if (!node) return;
                inputRefs.current[`${questionIndex}-${blankIndex}-${segment.inputIndex}`] = node;
              }}
              value={displayValue}
              onChange={(event) => onChange(blankIndex, segment.inputIndex, event.target.value)}
              onKeyDown={(event) => onKeyDown(event, blankIndex, segment.inputIndex)}
              maxLength={1}
              disabled={isChecked}
              inputMode="latin"
              lang="en"
              aria-label={`빈칸 ${blankIndex + 1}의 ${segmentIndex + 1}번째 철자`}
              className={`${baseCellClass} bg-white text-center transition-colors duration-200 focus:outline-none focus:bg-brand-50/70 ${
                isChecked
                  ? isWordCorrect
                    ? 'bg-success-50 text-success-700'
                    : isWrongLetter
                      ? 'bg-danger-50 text-danger-600'
                      : 'bg-danger-50 text-danger-600'
                  : isBlankFilled
                    ? 'text-brand-700'
                    : 'text-surface-700'
              }`}
            />
          );
        })}
      </span>
    );

    lastIndex = matchIndex + match[0].length;
  }

  parts.push(paragraph.slice(lastIndex));
  return parts;
};

export default function ToeflCompleteTheWordQuiz({
  aiConfig,
  questionCount,
  targetScore,
  vocabSource,
  topicSelection,
  onExit,
  user,
  reviewAsset = null,
  onAssetCreated,
  onAttemptRecorded,
}) {
  const difficultyLabel = formatToeflDifficultyLabel(targetScore);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [summary, setSummary] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [fontScaleLevel, setFontScaleLevel] = useState(() => {
    const saved = Number(localStorage.getItem(FONT_SCALE_STORAGE_KEY));
    if (!Number.isFinite(saved)) return 3;
    return Math.max(1, Math.min(5, Math.round(saved)));
  });
  const [showSettings, setShowSettings] = useState(false);
  const [incorrectWords, setIncorrectWords] = useState(new Set());
  const [savingWords, setSavingWords] = useState(new Set());
  const [savedWords, setSavedWords] = useState(new Set());

  const blanksPerQuestion = 10;
  const inputRefs = useRef({});
  const currentQuestion = questions[currentIndex];

  const initializeAnswers = (questionList) => {
    setAnswers(initializeCompleteAnswers(questionList));
  };

  const { activeAsset, error, reload: loadQuestions, sessionContext, setStatus, status } = useToeflQuizSession({
    reviewAsset,
    vocabSource,
    topicSelection,
    onAssetCreated,
    resetSession: () => {
      setFeedback('');
      setSummary(null);
    },
    loadReview: (asset) => {
      const cleanedQuestions = prepareCompleteQuestions(asset.payload.questions, blanksPerQuestion);
      if (cleanedQuestions.length === 0) throw new Error('저장된 문제 데이터가 비어 있습니다.');
      return cleanedQuestions;
    },
    generateNew: ({ vocabularyWords, pickedTopics }) =>
      generateCompleteTheWordSet({
        aiConfig,
        questionCount,
        blanksPerQuestion,
        targetScore,
        vocabularyWords,
        pickedTopics,
      }).then((data) => prepareCompleteQuestions(data.questions, blanksPerQuestion)),
    buildAsset: (cleanedQuestions, { vocabularyWords, pickedTopics }) => ({
      mode: 'toefl-complete',
      taskType: 'complete-words',
      title: 'Complete the Words',
      payload: { questions: cleanedQuestions },
      metadata: {
        targetScore,
        questionCount,
        blanksPerQuestion,
        vocabSampleCount: vocabularyWords.length,
        pickedTopics: pickedTopics.map((topic) => ({ id: topic.id, label: topic.label })),
      },
    }),
    onReady: (cleanedQuestions) => {
      setQuestions(cleanedQuestions);
      initializeAnswers(cleanedQuestions);
      setCurrentIndex(0);
      setChecked(false);
    },
    errorMessage: reviewAsset ? '저장된 Complete the Words 문제를 불러오지 못했습니다.' : '문제 생성 중 오류가 발생했습니다.',
    dependencies: [questionCount, targetScore, aiConfig, reviewAsset?.id],
  });
  useEffect(() => { localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(fontScaleLevel)); }, [fontScaleLevel]);

  const totalQuestions = questions.length;
  const currentAnswers = answers[currentIndex] || [];

  const filledBlankCount = getFilledBlankCount(currentQuestion, currentAnswers);
  const remainingBlankCount = currentQuestion ? currentQuestion.blanks.length - filledBlankCount : 0;

  const correctness = useMemo(() => {
    if (!currentQuestion || !checked) return null;
    return getQuestionCorrectness(currentQuestion, currentAnswers);
  }, [checked, currentQuestion, currentAnswers]);

  const blankResults = useMemo(() => {
    if (!currentQuestion || !checked) return [];
    return getBlankResults(currentQuestion, currentAnswers);
  }, [checked, currentQuestion, currentAnswers]);

  const focusInputByKey = (key) => {
    const input = inputRefs.current[key];
    if (!input) return;
    input.focus();
    input.select();
  };

  const focusBlankInput = (blankIndex, preferFirstEmpty = true) => {
    const blank = currentQuestion?.blanks?.[blankIndex];
    if (!blank) return;
    const editableIndices = getEditableIndices(blank);
    if (editableIndices.length === 0) return;
    const blankAnswers = currentAnswers[blankIndex] || [];
    const targetIndex = preferFirstEmpty
      ? editableIndices.find((index) => !(blankAnswers[index] || '').trim()) ?? editableIndices[0]
      : editableIndices[0];
    focusInputByKey(`${currentIndex}-${blankIndex}-${targetIndex}`);
  };

  const focusNextIncompleteBlank = (fromBlankIndex) => {
    if (!currentQuestion) return;
    const nextBlankIndex = currentQuestion.blanks.findIndex((blank, blankIndex) => {
      if (blankIndex <= fromBlankIndex) return false;
      const editableIndices = getEditableIndices(blank);
      if (editableIndices.length === 0) return false;
      const blankAnswers = currentAnswers[blankIndex] || [];
      return editableIndices.some((index) => !(blankAnswers[index] || '').trim());
    });
    if (nextBlankIndex === -1) return;
    requestAnimationFrame(() => focusBlankInput(nextBlankIndex));
  };

  const focusNextInput = (blankIndex, inputIndex) => {
    const blank = currentQuestion?.blanks?.[blankIndex];
    if (!blank) return;
    const editableIndices = getEditableIndices(blank);
    const nextEditableIndex = editableIndices.find((index) => index > inputIndex);
    if (nextEditableIndex === undefined) return;
    focusInputByKey(`${currentIndex}-${blankIndex}-${nextEditableIndex}`);
  };

  const focusPreviousInput = (blankIndex, inputIndex) => {
    const blank = currentQuestion?.blanks?.[blankIndex];
    if (!blank) return;
    const editableIndices = getEditableIndices(blank);
    const prevInSameBlank = [...editableIndices].reverse().find((index) => index < inputIndex);
    if (prevInSameBlank !== undefined) {
      focusInputByKey(`${currentIndex}-${blankIndex}-${prevInSameBlank}`);
      return;
    }
    for (let i = blankIndex - 1; i >= 0; i -= 1) {
      const prevBlank = currentQuestion.blanks[i];
      const prevEditableIndices = getEditableIndices(prevBlank);
      if (prevEditableIndices.length === 0) continue;
      const targetIndex = prevEditableIndices[prevEditableIndices.length - 1];
      focusInputByKey(`${currentIndex}-${i}-${targetIndex}`);
      return;
    }
  };

  const handleAnswerChange = (blankIndex, inputIndex, value) => {
    if (!currentQuestion) return;
    const sanitized = value.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(-1);

    const blank = currentQuestion.blanks[blankIndex];
    const editableIndices = getEditableIndices(blank);
    const updatedBlankAnswers = [...(currentAnswers[blankIndex] || [])];
    updatedBlankAnswers[inputIndex] = sanitized;
    const isBlankFilled =
      editableIndices.length > 0 &&
      editableIndices.every((index) => (updatedBlankAnswers[index] || '').trim().length > 0);

    setAnswers((prev) => {
      const updated = [...prev];
      const questionAnswers = [...(updated[currentIndex] || [])];
      const blankAnswers = [...(questionAnswers[blankIndex] || [])];
      blankAnswers[inputIndex] = sanitized;
      questionAnswers[blankIndex] = blankAnswers;
      updated[currentIndex] = questionAnswers;
      return updated;
    });

    if (sanitized) {
      const hasNextInputInBlank = editableIndices.some((index) => index > inputIndex);
      if (hasNextInputInBlank) focusNextInput(blankIndex, inputIndex);
      else if (isBlankFilled) focusNextIncompleteBlank(blankIndex);
    }
  };

  const handleInputKeyDown = (event, blankIndex, inputIndex) => {
    if (event.key !== 'Backspace' || checked) return;
    const currentValue = (currentAnswers[blankIndex] || [])[inputIndex] || '';
    if (currentValue) return;
    event.preventDefault();
    focusPreviousInput(blankIndex, inputIndex);
  };

  const handleCheckAnswers = () => {
    if (!currentQuestion) return;
    setChecked(true);
    setFeedback('');
    setStatus('feedback');

    const newIncorrectWords = new Set(incorrectWords);
    currentQuestion.blanks.forEach((blank, index) => {
      const blankAnswers = currentAnswers[index] || [];
      if (!isBlankCorrect(blank, blankAnswers) && blank.answer) {
        newIncorrectWords.add(blank.answer.toLowerCase().trim());
      }
    });
    setIncorrectWords(newIncorrectWords);
  };

  const handleGenerateFeedback = async () => {
    if (!currentQuestion || isGeneratingFeedback || feedback) return;

    setIsGeneratingFeedback(true);
    try {
      const userAnswers = buildCompleteUserAnswers(currentQuestion, currentAnswers);

      const result = await generateCompleteTheWordFeedback({
        aiConfig, question: currentQuestion, userAnswers,
      });
      setFeedback(result.feedback || '');
    } catch (err) {
      setFeedback('AI 피드백을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      setChecked(false);
      setFeedback('');
      setStatus('ready');
      return;
    }

    setIsGeneratingSummary(true);
    const { questionResults, totalBlanks, totalCorrect } = buildCompleteQuestionResults(questions, answers);
    const resultPayload = formatCompleteResultsPayload(questionResults);

    onAttemptRecorded?.(activeAsset, {
      answers: { blanks: answers },
      results: { questions: questionResults },
      correctCount: totalCorrect,
      totalCount: totalBlanks,
      score: {
        accuracy: totalBlanks > 0 ? Math.round((totalCorrect / totalBlanks) * 100) : 0,
      },
    });

    try {
      const summaryData = await generateCompleteTheWordSummary({
        aiConfig, targetScore, results: resultPayload,
      });
      setSummary(summaryData);
    } catch (err) {
      setSummary({ summary: 'AI 종합 피드백을 불러오지 못했습니다.', strengths: [], improvements: [], nextSteps: [] });
    } finally {
      setIsGeneratingSummary(false);
      setStatus('summary');
      playSound('COMPLETE');
    }
  };

  const handleSaveWordToVocabulary = async (word) => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (savedWords.has(word)) { alert('이미 저장된 단어입니다.'); return; }

    setSavingWords(prev => new Set([...prev, word]));

    try {
      const wordData = await generateWordData(word, aiConfig);
      const payload = {
        word: wordData?.word ?? word,
        meaning_ko: wordData?.meaning_ko ?? null,
        pronunciation: wordData?.pronunciation ?? null,
        pos: wordData?.pos ?? null,
        definitions: Array.isArray(wordData?.definitions) ? wordData.definitions : [],
        definitions_ko: Array.isArray(wordData?.definitions_ko) ? wordData.definitions_ko : [],
        examples: Array.isArray(wordData?.examples) ? wordData.examples : [],
        synonyms: Array.isArray(wordData?.synonyms) ? wordData.synonyms : [],
        nuance: wordData?.nuance ?? null,
        folder_id: null,
        learning_rate: 0,
        status: 'new',
        stats: { wrong_count: 0, review_count: 0 },
      };
      await createWord(payload);
      setSavedWords(prev => new Set([...prev, word]));
      alert(`'${word}' 단어를 단어장에 저장했습니다!`);
    } catch (error) {
      console.error(`Failed to save word: ${word}`, error);
      alert(`'${word}' 저장에 실패했습니다: ${error.message}`);
    } finally {
      setSavingWords(prev => {
        const updated = new Set(prev);
        updated.delete(word);
        return updated;
      });
    }
  };

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-brand-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <Sparkles className="w-10 h-10 text-brand-400 mx-auto mb-4 animate-pulse" aria-hidden="true" />
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">TOEFL 문제를 생성 중입니다</h3>
        <p className="text-sm font-bold text-surface-500">학술적 문단을 준비하고 있어요. 잠시만 기다려주세요.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-xl border border-danger-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">문제 생성 실패</h3>
        <p className="text-sm font-bold text-danger-500 mb-6">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" size="md" onClick={loadQuestions}>다시 시도</Button>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
      </div>
    );
  }

  if (status === 'summary' && summary) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-surface-900 tracking-tight">학습 완료 리포트</h2>
            <p className="text-sm font-bold text-surface-500">난이도: {difficultyLabel}</p>
          </div>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6">
          <p className="text-sm font-bold text-brand-900">{summary.summary}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-50 rounded-xl p-4">
            <h4 className="font-black text-surface-900 mb-2 tracking-tight">강점</h4>
            <ul className="text-sm text-surface-600 space-y-1 list-disc list-inside">
              {(summary.strengths || []).map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
            </ul>
          </div>
          <div className="bg-surface-50 rounded-xl p-4">
            <h4 className="font-black text-surface-900 mb-2 tracking-tight">개선점</h4>
            <ul className="text-sm text-surface-600 space-y-1 list-disc list-inside">
              {(summary.improvements || []).map((item, index) => <li key={`improvement-${index}`}>{item}</li>)}
            </ul>
          </div>
          <div className="bg-surface-50 rounded-xl p-4">
            <h4 className="font-black text-surface-900 mb-2 tracking-tight">다음 학습</h4>
            <ul className="text-sm text-surface-600 space-y-1 list-disc list-inside">
              {(summary.nextSteps || []).map((item, index) => <li key={`next-${index}`}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-10 text-center">
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">문제를 불러올 수 없습니다</h3>
        <Button variant="primary" size="md" onClick={loadQuestions}>다시 생성</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-surface-900 tracking-tight">Complete-the-Word</h2>
          <p className="text-sm font-bold text-surface-500">
            학술적 문단에서 빠진 철자를 채워보세요. (문항 {currentIndex + 1}/{totalQuestions})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-w-full text-sm text-surface-600">
          <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-2xs uppercase tracking-widest">
            {difficultyLabel}
          </span>
          {sessionContext.vocabSampleCount > 0 && (
            <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-2xs uppercase tracking-widest">
              내 단어 {sessionContext.vocabSampleCount}개 활용
            </span>
          )}
          {sessionContext.pickedTopics.length > 0 && (
            <span
              title={sessionContext.pickedTopics.map((t) => t.label).join(' · ')}
              className="inline-flex items-center max-w-full px-3 py-1 rounded-pill bg-accent-50 text-accent-700 font-black text-2xs uppercase tracking-widest"
            >
              <span className="truncate">주제: {sessionContext.pickedTopics.map((t) => t.label).join(' · ')}</span>
            </span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-md hover:bg-surface-100 transition-colors shrink-0"
            aria-label="퀴즈 설정"
          >
            <Settings className="w-5 h-5 text-surface-600" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="bg-surface-50 rounded-md p-4 md:p-8 text-surface-800">
        <p className="mb-6 text-base md:text-lg font-black text-surface-900 tracking-tight">
          Fill in the missing letters in the paragraph.
        </p>
        <p className="mb-4 text-xs text-surface-500 font-bold">
          빈칸 {currentQuestion.blanks.length}개 · 일부 철자는 고정으로 제공됩니다.
        </p>
        <p className={`${FONT_SCALE_STYLES[fontScaleLevel]?.paragraph || FONT_SCALE_STYLES[3].paragraph} tracking-[-0.01em] text-surface-700`}>
          {renderParagraphWithInputs({
            paragraph: currentQuestion.paragraph,
            blanks: currentQuestion.blanks,
            answers: currentAnswers,
            onChange: handleAnswerChange,
            onKeyDown: handleInputKeyDown,
            onBlankClick: focusBlankInput,
            isChecked: checked,
            questionIndex: currentIndex,
            inputRefs,
            fontScaleLevel,
            blankResults,
          })}
        </p>
      </div>

      {checked && correctness && (
        <div className={`rounded-md p-4 ${correctness.isPerfect ? 'bg-success-50' : 'bg-warning-50'}`}>
          <p className="text-sm font-black text-surface-900">
            맞힌 개수: {correctness.correctCount} / {correctness.total}
          </p>
          {!correctness.isPerfect && (
            <p className="text-xs font-semibold text-surface-600 mt-1">
              오답은 아래의 정답 및 피드백을 확인해주세요.
            </p>
          )}
        </div>
      )}

      {checked && !correctness?.isPerfect && (
        <div className="bg-white border border-surface-200 rounded-md p-4 space-y-3">
          <div className="text-sm text-surface-700">
            <span className="font-black">정답 문단:</span>
            <p className="mt-2 text-surface-600 leading-relaxed">{currentQuestion.fullParagraph}</p>
          </div>
          <div className="text-sm text-surface-700">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-black">AI 피드백</span>
              <button
                type="button"
                onClick={handleGenerateFeedback}
                disabled={isGeneratingFeedback || Boolean(feedback)}
                className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-accent-500 via-indigo-pair-500 to-brand-500 px-4 py-2 text-xs font-black text-white shadow-sm transition-all duration-200 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingFeedback ? 'animate-pulse' : ''}`} aria-hidden="true" />
                {isGeneratingFeedback ? 'AI 피드백 생성 중...' : feedback ? 'AI 피드백 생성 완료' : 'AI 피드백 생성'}
              </button>
            </div>
            <p className="mt-2 text-surface-600">
              {feedback || '버튼을 눌러 오답 기반 AI 피드백을 생성할 수 있습니다.'}
            </p>
          </div>

          {incorrectWords.size > 0 && (
            <div className="pt-3 border-t border-surface-200">
              <div className="mb-3">
                <span className="font-black">틀린 단어 ({incorrectWords.size}개)</span>
                <p className="text-xs font-semibold text-surface-500 mt-0.5">
                  저장이 필요한 단어만 선택해서 단어장에 추가하세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(incorrectWords).map((word) => {
                  const isSaving = savingWords.has(word);
                  const isSaved = savedWords.has(word);

                  return (
                    <div
                      key={word}
                      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all ${
                        isSaved
                          ? 'bg-success-50 border-success-300'
                          : 'bg-white border-surface-200 hover:border-surface-300'
                      }`}
                    >
                      <span className={`font-bold ${isSaved ? 'text-success-700' : 'text-surface-700'}`}>
                        {word}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaveWordToVocabulary(word)}
                        disabled={isSaving || isSaved || !user}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-black transition-all ${
                          isSaved
                            ? 'bg-success-100 text-success-700 cursor-default'
                            : 'bg-gradient-to-r from-success-500 to-success-600 text-white hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed'
                        }`}
                        title={isSaved ? '저장 완료' : '단어장에 저장'}
                      >
                        {isSaving ? (
                          <>
                            <Save className="w-3 h-3 animate-pulse" aria-hidden="true" />
                            <span>저장 중...</span>
                          </>
                        ) : isSaved ? (
                          <>
                            <Check className="w-3 h-3" aria-hidden="true" />
                            <span>저장됨</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3" aria-hidden="true" />
                            <span>저장</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-sm text-surface-600 flex items-center gap-4">
          <span className="px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-xs">
            푼 문제 {filledBlankCount}개
          </span>
          <span className="px-3 py-1 rounded-pill bg-surface-100 text-surface-700 font-black text-xs">
            남은 문제 {remainingBlankCount}개
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!checked ? (
            <Button variant="primary" size="md" onClick={handleCheckAnswers}>정답 확인</Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleNextQuestion}
              disabled={isGeneratingSummary}
            >
              {currentIndex < totalQuestions - 1
                ? '다음 문항'
                : isGeneratingSummary
                  ? '리포트 생성 중...'
                  : '학습 완료'}
            </Button>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-surface-900/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSettings(false)} role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-[var(--shadow-elevated)] max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-surface-900 tracking-tight">퀴즈 설정</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-md hover:bg-surface-100 transition-colors"
                aria-label="설정 닫기"
              >
                <X className="w-5 h-5 text-surface-600" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-surface-200 bg-surface-50 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-black text-surface-700 tracking-tight">글자 크기</p>
                  <span className="text-sm font-bold text-surface-500">{fontScaleLevel}단계 / 5단계</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={fontScaleLevel}
                  onChange={(event) => setFontScaleLevel(Number(event.target.value))}
                  className="w-full accent-brand-600"
                  aria-label="문제 글자 크기"
                />
                <p className="text-xs font-semibold text-surface-500 mt-2">문단과 빈칸의 크기를 조절할 수 있습니다.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" size="md" onClick={() => setShowSettings(false)}>확인</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
