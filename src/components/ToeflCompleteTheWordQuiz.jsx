import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from './Icons';
import {
  generateCompleteTheWordSet,
  generateCompleteTheWordFeedback,
  generateCompleteTheWordSummary
} from '../services/toeflService';

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
  isChecked,
  questionIndex,
  inputRefs
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

    const isBlankFilled =
      editableIndices.length > 0 &&
      editableIndices.every((inputIndex) => (blankAnswers[inputIndex] || '').trim().length > 0);

    parts.push(
      <span key={`blank-${blankId}`} className="inline-flex items-center mx-1 align-middle">
        {blankSegments.map((segment, segmentIndex) => {
          if (segment.type === 'fixed') {
            return (
              <span
                key={`fixed-${blankId}-${segmentIndex}`}
                className="inline-flex items-center justify-center h-8 px-1 min-w-[1.2rem] rounded-md bg-white/70 border border-transparent text-sm font-semibold text-gray-700"
              >
                {segment.value}
              </span>
            );
          }

          const answerValue = blankAnswers[segment.inputIndex] || '';
          const expectedLetter = blankAnswer[segment.inputIndex] || '';
          const isCorrect =
            isChecked && answerValue.toLowerCase() === expectedLetter.toLowerCase();

          return (
            <input
              key={`blank-${blankId}-${segmentIndex}`}
              ref={(node) => {
                if (!node) return;
                inputRefs.current[`${questionIndex}-${blankIndex}-${segment.inputIndex}`] = node;
              }}
              value={answerValue}
              onChange={(event) =>
                onChange(blankIndex, segment.inputIndex, event.target.value)
              }
              maxLength={1}
              disabled={isChecked}
              aria-label={`빈칸 ${blankIndex + 1}의 ${segmentIndex + 1}번째 철자`}
              className={`mx-0.5 w-8 h-8 border rounded-md text-center text-sm font-semibold transition-colors duration-200 ${
                isChecked
                  ? isCorrect
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-red-400 bg-red-50 text-red-700'
                  : isBlankFilled
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none'
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

  const focusNextInput = (blankIndex, inputIndex) => {
    const blank = currentQuestion?.blanks?.[blankIndex];
    if (!blank) return;

    const editableIndices = (blank.segments || [])
      .filter((segment) => segment.type === 'editable')
      .map((segment) => segment.inputIndex);

    const nextEditableIndex = editableIndices.find((index) => index > inputIndex);

    if (nextEditableIndex === undefined) return;

    const key = `${currentIndex}-${blankIndex}-${nextEditableIndex}`;
    const nextInput = inputRefs.current[key];
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  const handleAnswerChange = (blankIndex, inputIndex, value) => {
    if (!currentQuestion) return;
    const sanitized = value.replace(/[^a-zA-Z]/g, '').slice(-1);
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
      focusNextInput(blankIndex, inputIndex);
    }
  };

  const handleCheckAnswers = async () => {
    if (!currentQuestion) return;
    const isPerfect = currentQuestion.blanks.every((blank, index) => {
      const blankAnswers = currentAnswers[index] || [];
      const editableIndices = (blank.segments || [])
        .filter((segment) => segment.type === 'editable')
        .map((segment) => segment.inputIndex);
      return editableIndices.every((inputIndex) => {
        const userAnswer = (blankAnswers[inputIndex] || '').toLowerCase();
        const targetAnswer = (blank.answer[inputIndex] || '').toLowerCase();
        return userAnswer === targetAnswer;
      });
    });
    setChecked(true);
    setFeedback('');
    if (isPerfect) {
      setStatus('feedback');
      return;
    }

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
      setStatus('feedback');
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

      <div className="bg-gray-50 rounded-xl p-6 text-gray-800 text-sm leading-relaxed">
        <p className="mb-4 text-xs text-gray-500 font-medium">
          빈칸 {currentQuestion.blanks.length}개 · 고정 철자는 수정할 수 없어요.
        </p>
        <p>
          {renderParagraphWithInputs({
            paragraph: currentQuestion.paragraph,
            blanks: currentQuestion.blanks,
            answers: currentAnswers,
            onChange: handleAnswerChange,
            isChecked: checked,
            questionIndex: currentIndex,
            inputRefs
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
            <span className="font-semibold">AI 피드백</span>
            <p className="mt-2 text-gray-600">
              {isGeneratingFeedback ? '피드백을 생성 중입니다...' : feedback}
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
