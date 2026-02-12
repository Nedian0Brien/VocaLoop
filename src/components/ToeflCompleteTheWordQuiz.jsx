import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from './Icons';
import {
  generateCompleteTheWordSet,
  generateCompleteTheWordFeedback,
  generateCompleteTheWordSummary
} from '../services/toeflService';

const FONT_SCALE_STORAGE_KEY = 'vocaloop_toefl_complete_font_scale';

const FONT_SCALE_STYLES = {
  1: {
    paragraph: 'text-lg leading-[1.9] md:text-xl',
    cell: 'w-7 h-7 text-base md:w-8 md:h-8 md:text-lg'
  },
  2: {
    paragraph: 'text-xl leading-[1.9] md:text-2xl',
    cell: 'w-8 h-8 text-lg md:w-9 md:h-9 md:text-xl'
  },
  3: {
    paragraph: 'text-2xl leading-[1.9] md:text-[1.75rem]',
    cell: 'w-9 h-9 text-xl md:w-10 md:h-10 md:text-2xl'
  },
  4: {
    paragraph: 'text-[1.8rem] leading-[1.9] md:text-[2rem]',
    cell: 'w-10 h-10 text-2xl md:w-11 md:h-11 md:text-[1.7rem]'
  },
  5: {
    paragraph: 'text-[2rem] leading-[1.9] md:text-[2.2rem]',
    cell: 'w-11 h-11 text-2xl md:w-12 md:h-12 md:text-[2rem]'
  }
};

const getBlankSegments = (answer = '') => {
  const safeAnswer = String(answer);
  if (!safeAnswer) {
    return [{ type: 'editable', value: '' }];
  }

  const chars = safeAnswer.split('');
  const editableIndexes = chars
    .map((char, index) => (/^[a-zA-Z]$/.test(char) ? index : null))
    .filter((index) => index !== null);

  if (editableIndexes.length <= 2) {
    return chars.map((char, index) => ({
      type: /^[a-zA-Z]$/.test(char) ? 'editable' : 'fixed',
      value: char,
      inputIndex: /^[a-zA-Z]$/.test(char) ? index : null
    }));
  }

  const hiddenSet = new Set();
  editableIndexes.forEach((index, order) => {
    const isEdge = order === 0 || order === editableIndexes.length - 1;
    const shouldReveal = isEdge || order % 2 === 0;
    if (!shouldReveal) {
      hiddenSet.add(index);
    }
  });

  return chars.map((char, index) => {
    const isAlphabet = /^[a-zA-Z]$/.test(char);
    if (!isAlphabet) {
      return { type: 'fixed', value: char, inputIndex: null };
    }
    if (hiddenSet.has(index)) {
      return { type: 'editable', value: '', inputIndex: index };
    }
    return { type: 'fixed', value: char, inputIndex: null };
  });
};

const renderParagraphWithInputs = ({
  paragraph,
  blanks,
  answers,
  onChange,
  onKeyDown,
  onBlankClick,
  isChecked,
  questionIndex,
  inputRefs,
  fontScaleLevel,
  blankResults
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
        className={`inline-flex items-stretch mx-1 align-middle overflow-hidden rounded-xl border shadow-sm cursor-text transition-colors duration-200 ${
          isChecked && hasWordResult
            ? isWordCorrect
              ? 'border-green-400 bg-green-50/70'
              : 'border-red-400 bg-red-50/70'
            : isChecked
            ? 'border-gray-300 bg-white'
            : isBlankFilled
            ? 'border-blue-300 bg-blue-50/40'
            : 'border-gray-300 bg-white'
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
            isLastSegment ? '' : 'border-r border-gray-200'
          }`;

          if (segment.type === 'fixed') {
            return (
              <span
                key={`fixed-${blankId}-${segmentIndex}`}
                className={`${baseCellClass} bg-gray-50 text-gray-800`}
              >
                {segment.value}
              </span>
            );
          }

          const answerValue = blankAnswers[segment.inputIndex] || '';
          const expectedLetter = blankAnswer[segment.inputIndex] || '';
          const displayValue = isChecked && !isWordCorrect ? expectedLetter : answerValue;
          const isCorrect =
            isChecked && answerValue.toLowerCase() === expectedLetter.toLowerCase();
          const isWrongLetter = isChecked && !isWordCorrect && !isCorrect;

          return (
            <input
              key={`blank-${blankId}-${segmentIndex}`}
              ref={(node) => {
                if (!node) return;
                inputRefs.current[`${questionIndex}-${blankIndex}-${segment.inputIndex}`] = node;
              }}
              value={displayValue}
              onChange={(event) =>
                onChange(blankIndex, segment.inputIndex, event.target.value)
              }
              onKeyDown={(event) => onKeyDown(event, blankIndex, segment.inputIndex)}
              maxLength={1}
              disabled={isChecked}
              aria-label={`빈칸 ${blankIndex + 1}의 ${segmentIndex + 1}번째 철자`}
              className={`${baseCellClass} bg-white text-center transition-colors duration-200 focus:outline-none focus:bg-blue-50/70 ${
                isChecked
                  ? isWordCorrect
                    ? 'bg-green-50 text-green-700'
                    : isWrongLetter
                    ? 'bg-red-50 text-red-600'
                    : 'bg-red-50 text-red-600'
                  : isBlankFilled
                  ? 'text-blue-700'
                  : 'text-gray-700'
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
  apiKey,
  questionCount,
  targetScore,
  onExit
}) {
  const [status, setStatus] = useState('loading'); // loading | ready | feedback | summary | error
  const [error, setError] = useState('');
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

  const blanksPerQuestion = 10;
  const inputRefs = useRef({});

  const currentQuestion = questions[currentIndex];

  const initializeAnswers = (questionList) => {
    const answerMatrix = questionList.map((question) =>
      question.blanks.map((blank) => new Array((blank.answer || '').length).fill(''))
    );
    setAnswers(answerMatrix);
  };

  const loadQuestions = async () => {
    setStatus('loading');
    setError('');
    setFeedback('');
    setSummary(null);
    try {
      const data = await generateCompleteTheWordSet({
        apiKey,
        questionCount,
        blanksPerQuestion,
        targetScore
      });
      const cleanedQuestions = (data.questions || []).map((question) => ({
        ...question,
        blanks:
          question.blanks?.slice(0, blanksPerQuestion).map((blank) => ({
            ...blank,
            segments: getBlankSegments(blank.answer || '')
          })) || []
      }));
      setQuestions(cleanedQuestions);
      initializeAnswers(cleanedQuestions);
      setCurrentIndex(0);
      setChecked(false);
      setStatus('ready');
    } catch (err) {
      setError(err.message || '문제 생성 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [questionCount, targetScore, apiKey]);

  useEffect(() => {
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(fontScaleLevel));
  }, [fontScaleLevel]);

  const totalQuestions = questions.length;

  const currentAnswers = answers[currentIndex] || [];
  const filledBlankCount = currentQuestion
    ? currentQuestion.blanks.reduce((count, blank, index) => {
        const blankAnswers = currentAnswers[index] || [];
        const editableIndices = (blank.segments || []).filter((segment) => segment.type === 'editable');
        const isFilled =
          editableIndices.length > 0 &&
          editableIndices.every((segment) => (blankAnswers[segment.inputIndex] || '').trim().length > 0);
        return count + (isFilled ? 1 : 0);
      }, 0)
    : 0;
  const remainingBlankCount = currentQuestion
    ? currentQuestion.blanks.length - filledBlankCount
    : 0;

  const getEditableIndices = (blank) =>
    (blank?.segments || [])
      .filter((segment) => segment.type === 'editable')
      .map((segment) => segment.inputIndex);

  const correctness = useMemo(() => {
    if (!currentQuestion || !checked) return null;
    const correctCount = currentQuestion.blanks.reduce((count, blank, index) => {
      const blankAnswers = currentAnswers[index] || [];
      const editableIndices = (blank.segments || [])
        .filter((segment) => segment.type === 'editable')
        .map((segment) => segment.inputIndex);

      const isCorrect = editableIndices.every((inputIndex) => {
        const userAnswer = (blankAnswers[inputIndex] || '').toLowerCase();
        const targetAnswer = (blank.answer[inputIndex] || '').toLowerCase();
        return userAnswer === targetAnswer;
      });

      return count + (isCorrect ? 1 : 0);
    }, 0);
    return {
      correctCount,
      total: currentQuestion.blanks.length,
      isPerfect: correctCount === currentQuestion.blanks.length
    };
  }, [checked, currentQuestion, currentAnswers]);

  const blankResults = useMemo(() => {
    if (!currentQuestion || !checked) return [];

    return currentQuestion.blanks.map((blank, index) => {
      const blankAnswers = currentAnswers[index] || [];
      const editableIndices = getEditableIndices(blank);
      const isCorrect = editableIndices.every((inputIndex) => {
        const userAnswer = (blankAnswers[inputIndex] || '').toLowerCase();
        const targetAnswer = (blank.answer[inputIndex] || '').toLowerCase();
        return userAnswer === targetAnswer;
      });
      return { isCorrect };
    });
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
    const targetIndex =
      preferFirstEmpty
        ? editableIndices.find((index) => !(blankAnswers[index] || '').trim()) ?? editableIndices[0]
        : editableIndices[0];

    const key = `${currentIndex}-${blankIndex}-${targetIndex}`;
    focusInputByKey(key);
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

    requestAnimationFrame(() => {
      focusBlankInput(nextBlankIndex);
    });
  };

  const focusNextInput = (blankIndex, inputIndex) => {
    const blank = currentQuestion?.blanks?.[blankIndex];
    if (!blank) return;

    const editableIndices = getEditableIndices(blank);

    const nextEditableIndex = editableIndices.find((index) => index > inputIndex);

    if (nextEditableIndex === undefined) return;

    const key = `${currentIndex}-${blankIndex}-${nextEditableIndex}`;
    focusInputByKey(key);
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
    const sanitized = value.replace(/[^a-zA-Z]/g, '').slice(-1);

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

      if (hasNextInputInBlank) {
        focusNextInput(blankIndex, inputIndex);
      } else if (isBlankFilled) {
        focusNextIncompleteBlank(blankIndex);
      }
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
  };

  const handleGenerateFeedback = async () => {
    if (!currentQuestion || isGeneratingFeedback || feedback) return;

    setIsGeneratingFeedback(true);
    try {
      const result = await generateCompleteTheWordFeedback({
        apiKey,
        question: currentQuestion,
        userAnswers: currentAnswers.map((blankAnswers) => blankAnswers.join(''))
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
    const resultPayload = questions
      .map((question, index) => {
        const questionAnswers = answers[index] || [];
        const correctCount = question.blanks.reduce((count, blank, blankIndex) => {
          const blankAnswers = questionAnswers[blankIndex] || [];
          const editableIndices = (blank.segments || [])
            .filter((segment) => segment.type === 'editable')
            .map((segment) => segment.inputIndex);

          const isCorrect = editableIndices.every((inputIndex) => {
            const userAnswer = (blankAnswers[inputIndex] || '').toLowerCase();
            const targetAnswer = (blank.answer[inputIndex] || '').toLowerCase();
            return userAnswer === targetAnswer;
          });

          return count + (isCorrect ? 1 : 0);
        }, 0);
        return `Q${index + 1}: ${correctCount}/${question.blanks.length}`;
      })
      .join(' | ');
    try {
      const summaryData = await generateCompleteTheWordSummary({
        apiKey,
        targetScore,
        results: resultPayload
      });
      setSummary(summaryData);
    } catch (err) {
      setSummary({
        summary: 'AI 종합 피드백을 불러오지 못했습니다.',
        strengths: [],
        improvements: [],
        nextSteps: []
      });
    } finally {
      setIsGeneratingSummary(false);
      setStatus('summary');
    }
  };

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-10 text-center">
        <Sparkles className="w-10 h-10 text-blue-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">TOEFL 문제를 생성 중입니다</h3>
        <p className="text-sm text-gray-500">학술적 문단을 준비하고 있어요. 잠시만 기다려주세요.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-10 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">문제 생성 실패</h3>
        <p className="text-sm text-red-500 mb-6">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={loadQuestions}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
          <button
            onClick={onExit}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            모드 선택으로
          </button>
        </div>
      </div>
    );
  }

  if (status === 'summary' && summary) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">학습 완료 리포트</h2>
            <p className="text-sm text-gray-500">목표 점수: TOEFL {targetScore}+</p>
          </div>
          <button
            onClick={onExit}
            className="px-5 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            모드 선택으로
          </button>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <p className="text-sm text-blue-900">{summary.summary}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-2">강점</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              {(summary.strengths || []).map((item, index) => (
                <li key={`strength-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-2">개선점</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              {(summary.improvements || []).map((item, index) => (
                <li key={`improvement-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-2">다음 학습</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              {(summary.nextSteps || []).map((item, index) => (
                <li key={`next-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">문제를 불러올 수 없습니다</h3>
        <button
          onClick={loadQuestions}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 생성
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Complete-the-Word</h2>
          <p className="text-sm text-gray-500">
            학술적 문단에서 빠진 철자를 채워보세요. (문항 {currentIndex + 1}/{totalQuestions})
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
            목표 점수 TOEFL {targetScore}+
          </span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 md:p-8 text-gray-800">
        <p className="mb-6 text-base md:text-lg font-semibold text-gray-900">
          Fill in the missing letters in the paragraph.
        </p>
        <div className="mb-5 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">글자 크기</p>
            <span className="text-xs text-gray-500">{fontScaleLevel}단계 / 5단계</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={fontScaleLevel}
            onChange={(event) => setFontScaleLevel(Number(event.target.value))}
            className="w-full accent-blue-600"
            aria-label="문제 글자 크기"
          />
        </div>
        <p className="mb-4 text-xs text-gray-500 font-medium">
          빈칸 {currentQuestion.blanks.length}개 · 일부 철자는 고정으로 제공됩니다.
        </p>
        <p className={`${FONT_SCALE_STYLES[fontScaleLevel]?.paragraph || FONT_SCALE_STYLES[3].paragraph} tracking-[-0.01em] text-gray-700`}>
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
            blankResults
          })}
        </p>
      </div>

      {checked && correctness && (
        <div className={`rounded-xl p-4 ${correctness.isPerfect ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <p className="text-sm font-semibold text-gray-900">
            맞힌 개수: {correctness.correctCount} / {correctness.total}
          </p>
          {!correctness.isPerfect && (
            <p className="text-xs text-gray-600 mt-1">
              오답은 아래의 정답 및 피드백을 확인해주세요.
            </p>
          )}
        </div>
      )}

      {checked && !correctness?.isPerfect && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">정답 문단:</span>
            <p className="mt-2 text-gray-600 leading-relaxed">{currentQuestion.fullParagraph}</p>
          </div>
          <div className="text-sm text-gray-700">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-semibold">AI 피드백</span>
              <button
                type="button"
                onClick={handleGenerateFeedback}
                disabled={isGeneratingFeedback || Boolean(feedback)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingFeedback ? 'animate-pulse' : ''}`} />
                {isGeneratingFeedback ? 'AI 피드백 생성 중...' : feedback ? 'AI 피드백 생성 완료' : 'AI 피드백 생성'}
              </button>
            </div>
            <p className="mt-2 text-gray-600">
              {feedback || '버튼을 눌러 오답 기반 AI 피드백을 생성할 수 있습니다.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-sm text-gray-600 flex items-center gap-4">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
            푼 문제 {filledBlankCount}개
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
            남은 문제 {remainingBlankCount}개
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!checked ? (
            <button
              onClick={handleCheckAnswers}
              className="px-6 py-2 font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              정답 확인
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              disabled={isGeneratingSummary}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {currentIndex < totalQuestions - 1
                ? '다음 문항'
                : isGeneratingSummary
                ? '리포트 생성 중...'
                : '학습 완료'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
