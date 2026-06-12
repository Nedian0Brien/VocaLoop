import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Sparkles, XCircle } from './Icons';
import { generateReadingTaskSet } from '../services/toeflService';
import { playSound } from '../utils/soundEffects';
import { recordToeflReadingAttempt } from '../services/toeflReadingStats';
import { Button } from '../design-system';
import { useToeflQuizSession } from '../hooks/useToeflQuizSession';
import ToeflQuestionSetNavigator from './ToeflQuestionSetNavigator';
import ToeflReadingReport from './ToeflReadingReport';
import {
  useToeflVocabularyCapture,
  VocabularyCaptureText,
} from './ToeflVocabularyCapture';
import { buildToeflReadingReport } from '../utils/toeflReadingReport';
import { formatToeflDifficultyLabel } from '../services/toefl/difficulty';

const TASK_LABELS = {
  'daily-life': {
    title: 'Read in Daily Life',
    subtitle: '공지, 이메일, 일정표 같은 실생활 텍스트를 빠르게 읽고 핵심 정보를 찾습니다.',
  },
  'academic-passage': {
    title: 'Read an Academic Passage',
    subtitle: '학술 지문에서 중심 생각, 세부 정보, 추론, 어휘 맥락을 확인합니다.',
  },
};

const normalizeQuestion = (question, index) => ({
  id: question?.id || index + 1,
  prompt: String(question?.prompt || ''),
  options: Array.isArray(question?.options) ? question.options.slice(0, 4) : [],
  answerIndex: Number.isInteger(question?.answerIndex) ? question.answerIndex : 0,
  skillTag: question?.skillTag || 'general-reading',
  explanationKo: question?.explanationKo || '정답 근거를 다시 확인해보세요.',
  saveableWords: Array.isArray(question?.saveableWords) ? question.saveableWords : [],
});

const normalizeSet = (data, taskType) => ({
  taskType: data?.taskType || taskType,
  title: data?.title || TASK_LABELS[taskType]?.title || 'TOEFL Reading',
  stimulusLabel: data?.stimulusLabel || 'Reading text',
  stimulus: data?.stimulus || '',
  topicTags: Array.isArray(data?.topicTags) ? data.topicTags : [],
  questions: (Array.isArray(data?.questions) ? data.questions : [])
    .map(normalizeQuestion)
    .filter((question) => question.prompt && question.options.length >= 2),
});

const resolveQuestionCount = (taskType, questionCount) =>
  taskType === 'academic-passage' ? 5 : questionCount;

export default function ToeflReadingTaskQuiz({
  aiConfig,
  taskType,
  questionCount,
  targetScore,
  vocabSource,
  topicSelection,
  onExit,
  existingWords = [],
  onSaveVocabularyWord,
  onExplainVocabularyWord,
  reviewAsset = null,
  onAssetCreated,
  onAttemptRecorded,
}) {
  const taskCopy = TASK_LABELS[taskType] || TASK_LABELS['daily-life'];
  const difficultyLabel = formatToeflDifficultyLabel(targetScore);
  const effectiveQuestionCount = resolveQuestionCount(taskType, questionCount);
  const [setData, setSetData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState([]);
  const vocabCapture = useToeflVocabularyCapture({
    existingWords,
    onSaveVocabularyWord,
    onExplainVocabularyWord,
  });

  const currentQuestion = setData?.questions?.[currentIndex];
  const totalQuestions = setData?.questions?.length || 0;
  const selectedIndex = selectedAnswers[currentIndex] ?? null;
  const answeredStates = useMemo(
    () => Array.from({ length: totalQuestions }, (_, index) => selectedAnswers[index] !== null && selectedAnswers[index] !== undefined),
    [selectedAnswers, totalQuestions]
  );
  const answeredCount = useMemo(
    () => answeredStates.filter(Boolean).length,
    [answeredStates]
  );
  const allQuestionsAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const resultStates = useMemo(
    () => Array.from({ length: totalQuestions }, (_, index) => {
      if (!checked || !results[index]) return null;
      return Boolean(results[index].correct);
    }),
    [checked, results, totalQuestions]
  );

  const { activeAsset, error, reload: loadQuestions, sessionContext, setStatus, status } = useToeflQuizSession({
    reviewAsset,
    vocabSource,
    topicSelection,
    onAssetCreated,
    resetSession: () => {
      setSetData(null);
      setCurrentIndex(0);
      setSelectedAnswers([]);
      setChecked(false);
      setResults([]);
    },
    loadReview: (asset) => {
      const normalized = normalizeSet(asset.payload, asset.taskType || taskType);
      if (normalized.questions.length === 0 || !normalized.stimulus) {
        throw new Error('저장된 문제 데이터가 비어 있습니다.');
      }
      return normalized;
    },
    generateNew: ({ vocabularyWords, pickedTopics }) =>
      generateReadingTaskSet({
        aiConfig,
        taskType,
        questionCount: effectiveQuestionCount,
        targetScore,
        vocabularyWords,
        pickedTopics,
      }).then((data) => {
        const normalized = normalizeSet(data, taskType);
        if (normalized.questions.length === 0 || !normalized.stimulus) {
          throw new Error('문제 데이터가 비어 있습니다.');
        }
        return normalized;
      }),
    buildAsset: (normalized, { vocabularyWords, pickedTopics }) => ({
      mode: taskType === 'academic-passage' ? 'toefl-academic-passage' : 'toefl-daily-life',
      taskType,
      title: normalized.title,
      payload: normalized,
      metadata: {
        targetScore,
        questionCount: effectiveQuestionCount,
        vocabSampleCount: vocabularyWords.length,
        pickedTopics: pickedTopics.map((topic) => ({ id: topic.id, label: topic.label })),
      },
    }),
    onReady: (normalized) => {
      setSetData(normalized);
      setCurrentIndex(0);
      setSelectedAnswers(new Array(normalized.questions.length).fill(null));
      setChecked(false);
      setResults([]);
    },
    errorMessage: reviewAsset ? '저장된 Reading 문제를 불러오지 못했습니다.' : 'Reading 문제 생성 중 오류가 발생했습니다.',
    dependencies: [taskType, effectiveQuestionCount, targetScore, reviewAsset?.id],
  });

  const correctCount = useMemo(
    () => results.filter((result) => Boolean(result?.correct)).length,
    [results]
  );

  const buildResults = () =>
    (setData?.questions || []).map((question, index) => {
      const answerIndex = selectedAnswers[index];
      return {
        questionId: question.id,
        correct: answerIndex === question.answerIndex,
        selectedIndex: answerIndex,
        answerIndex: question.answerIndex,
        skillTag: question.skillTag,
      };
    });

  const handleSelectAnswer = (answerIndex) => {
    if (checked) return;
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = answerIndex;
      return next;
    });
  };

  const handleNavigate = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= totalQuestions) return;
    setCurrentIndex(nextIndex);
  };

  const handleCheck = () => {
    if (!currentQuestion || checked || !allQuestionsAnswered) return;
    const finalResults = buildResults();
    setResults(finalResults);
    setChecked(true);
    playSound(finalResults.every((result) => result.correct) ? 'SUCCESS' : 'FAIL');
  };

  const handleNextQuestion = () => {
    if (selectedIndex === null || currentIndex >= totalQuestions - 1) return;
    handleNavigate(currentIndex + 1);
  };

  const handleReport = () => {
    if (!checked) return;
    const finalResults = results.length > 0 ? results.filter(Boolean) : buildResults();
    const finalCorrect = finalResults.filter((result) => Boolean(result?.correct)).length;
    const finalTotal = finalResults.length;
    const reportItems = (setData?.questions || []).map((question) => ({
      ...question,
      title: setData?.title,
      taskType,
      topicTags: setData?.topicTags || sessionContext.pickedTopics.map((topic) => topic.label),
    }));
    const report = buildToeflReadingReport({
      items: reportItems,
      results: finalResults,
      correctCount: finalCorrect,
      totalCount: finalTotal,
      targetScore,
      topicTags: setData?.topicTags || sessionContext.pickedTopics.map((topic) => topic.label),
    });
    recordToeflReadingAttempt({
      taskType,
      topicTags: setData?.topicTags || sessionContext.pickedTopics.map((topic) => topic.label),
      results: finalResults,
    });
    onAttemptRecorded?.(activeAsset, {
      answers: {
        selectedOptions: finalResults.map((result) => ({
          questionId: result.questionId,
          selectedIndex: result.selectedIndex,
        })),
      },
      results: { items: finalResults, report },
      correctCount: finalCorrect,
      totalCount: finalTotal,
      score: {
        accuracy: finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0,
      },
    });
    setStatus('summary');
    playSound('COMPLETE');
  };

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-brand-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <Sparkles className="w-10 h-10 text-brand-400 mx-auto mb-4 animate-pulse" aria-hidden="true" />
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">Reading 문제를 생성 중입니다</h3>
        <p className="text-sm font-bold text-surface-500">{taskCopy.title} 세트를 준비하고 있어요.</p>
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

  if (status === 'summary') {
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const reportItems = (setData?.questions || []).map((question) => ({
      ...question,
      title: setData?.title,
      taskType,
      topicTags: setData?.topicTags || sessionContext.pickedTopics.map((topic) => topic.label),
    }));
    return (
      <ToeflReadingReport
        title="Reading 학습 리포트"
        subtitle={`${taskCopy.title} · 정답 ${correctCount}/${totalQuestions} · 정답률 ${accuracy}%`}
        taskLabel={taskCopy.title}
        items={reportItems}
        results={results}
        correctCount={correctCount}
        totalCount={totalQuestions}
        targetScore={targetScore}
        topicTags={setData?.topicTags || sessionContext.pickedTopics.map((topic) => topic.label)}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-surface-900 tracking-tight">{taskCopy.title}</h2>
          <p className="text-sm font-bold text-surface-500">{taskCopy.subtitle} (문항 {currentIndex + 1}/{totalQuestions})</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-2xs uppercase tracking-widest">
            {difficultyLabel}
          </span>
          {sessionContext.vocabSampleCount > 0 && (
            <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-2xs uppercase tracking-widest">
              내 단어 {sessionContext.vocabSampleCount}개 활용
            </span>
          )}
        </div>
      </div>

      <section className="rounded-md border border-surface-100 bg-surface-50 p-5 md:p-7">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-600" aria-hidden="true" />
          <p className="text-xs font-black uppercase tracking-widest text-surface-400">{setData?.stimulusLabel}</p>
        </div>
        <h3 className="text-xl font-black text-surface-900 mb-3 tracking-tight">{setData?.title}</h3>
        <VocabularyCaptureText
          text={setData?.stimulus}
          activeWordKey={vocabCapture.activeWord}
          underlinedWordKeys={vocabCapture.underlinedKeys}
          savingKeys={vocabCapture.savingKeys}
          savedKeys={vocabCapture.savedKeys}
          explainingKeys={vocabCapture.explainingKeys}
          existingWordKeys={vocabCapture.existingWordKeys}
          explanations={vocabCapture.explanations}
          errors={vocabCapture.errors}
          canExplain={checked}
          onSelectWord={vocabCapture.selectWord}
          onSaveWord={vocabCapture.saveWord}
          onExplainWord={vocabCapture.explainWord}
          onToggleUnderline={vocabCapture.toggleUnderline}
          onClearSelection={vocabCapture.clearActiveWord}
          buildMetadata={() => ({
            source: 'toefl-reading-task',
            sourceLabel: taskCopy.title,
            taskType,
            questionId: currentQuestion?.id,
            title: setData?.title,
            contextText: setData?.stimulus,
          })}
          className="whitespace-pre-line text-base leading-8 font-semibold text-surface-700"
        />
      </section>

      <ToeflQuestionSetNavigator
        answeredStates={answeredStates}
        currentIndex={currentIndex}
        isRevealed={checked}
        onNavigate={handleNavigate}
        resultStates={resultStates}
        totalQuestions={totalQuestions}
      />

      {currentQuestion && (
        <section className="space-y-4">
          <div>
            <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">
              {currentQuestion.skillTag}
            </p>
            <h3 className="text-lg font-black text-surface-900 tracking-tight">{currentQuestion.prompt}</h3>
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedIndex === index;
              const isCorrect = checked && index === currentQuestion.answerIndex;
              const isWrong = checked && isSelected && !isCorrect;
              return (
                <button
                  key={`${currentQuestion.id}-${option}`}
                  type="button"
                  data-selected={isSelected ? 'true' : 'false'}
                  aria-pressed={isSelected}
                  disabled={checked}
                  onClick={() => handleSelectAnswer(index)}
                  className={[
                    'w-full text-left rounded-md border px-4 py-3 font-bold transition-all',
                    isCorrect
                      ? 'border-success-400 bg-success-50 text-success-800'
                      : isWrong
                        ? 'border-danger-400 bg-danger-50 text-danger-700'
                        : isSelected
                          ? 'border-brand-400 bg-brand-50 text-brand-800'
                          : 'border-surface-200 bg-white text-surface-700 hover:border-brand-300',
                  ].join(' ')}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {checked && (
            <div className="rounded-md border border-surface-200 bg-white p-4">
              <div className="flex items-center gap-2 font-black text-surface-900">
                {results[currentIndex]?.correct ? (
                  <Check className="w-5 h-5 text-success-600" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-danger-500" aria-hidden="true" />
                )}
                {results[currentIndex]?.correct ? '정답입니다' : '오답입니다'}
              </div>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-surface-600">
                {currentQuestion.explanationKo}
              </p>
            </div>
            )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-bold text-surface-500">
              {checked
                ? '전체 문항의 정답과 해설을 확인할 수 있습니다.'
                : allQuestionsAnswered
                  ? '모든 문항을 풀었습니다. 이제 한 번에 정답을 확인하세요.'
                  : `남은 문항 ${totalQuestions - answeredCount}개를 풀면 정답 확인이 열립니다.`}
            </p>
            {!checked ? (
              currentIndex < totalQuestions - 1 ? (
                <Button variant="primary" size="md" onClick={handleNextQuestion} disabled={selectedIndex === null}>
                  다음 문항
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={handleCheck} disabled={!allQuestionsAnswered}>
                  정답 확인
                </Button>
              )
            ) : (
              <Button variant="primary" size="md" onClick={handleReport}>
                리포트 보기
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
