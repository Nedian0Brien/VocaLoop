import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Sparkles, Target, XCircle } from './Icons';
import {
  estimateReadingBand,
  generateReadingMockModule,
  routeReadingMockDifficulty,
} from '../services/toeflService';
import { recordToeflReadingAttempt } from '../services/toeflReadingStats';
import { playSound } from '../utils/soundEffects';
import { pickRandomTopics, sampleWords } from '../utils/topicSets';
import { Button } from '../design-system';
import {
  ToeflVocabularyActionBar,
  useToeflVocabularyCapture,
  VocabularyCaptureText,
} from './ToeflVocabularyCapture';

const TASK_LABELS = {
  'complete-words': 'Complete the Words',
  'daily-life': 'Read in Daily Life',
  'academic-passage': 'Read an Academic Passage',
};

const normalizeItem = (item, index, stage) => ({
  id: item?.id || `s${stage}-${index + 1}`,
  taskType: item?.taskType || 'daily-life',
  title: item?.title || 'TOEFL Reading Item',
  stimulusLabel: item?.stimulusLabel || TASK_LABELS[item?.taskType] || 'Reading text',
  stimulus: item?.stimulus || '',
  prompt: item?.prompt || '',
  options: Array.isArray(item?.options) ? item.options.slice(0, 4) : [],
  answerIndex: Number.isInteger(item?.answerIndex) ? item.answerIndex : 0,
  skillTag: item?.skillTag || 'general-reading',
  topicTags: Array.isArray(item?.topicTags) ? item.topicTags : [],
  explanationKo: item?.explanationKo || '정답 근거를 다시 확인해보세요.',
  saveableWords: Array.isArray(item?.saveableWords) ? item.saveableWords : [],
});

const normalizeModule = (data, stage, difficulty) => ({
  stage: data?.stage || stage,
  difficulty: data?.difficulty || difficulty,
  label: data?.label || (stage === 1 ? 'Stage 1 Router' : 'Stage 2 Module'),
  items: (Array.isArray(data?.items) ? data.items : [])
    .map((item, index) => normalizeItem(item, index, stage))
    .filter((item) => item.stimulus && item.prompt && item.options.length >= 2),
});

const groupResultsByTask = (items, results) => {
  const grouped = new Map();
  results.filter(Boolean).forEach((result) => {
    const item = items.find((candidate) => candidate.id === result.itemId);
    const taskType = item?.taskType || 'mock-test';
    if (!grouped.has(taskType)) grouped.set(taskType, { topicTags: new Set(), results: [] });
    const group = grouped.get(taskType);
    (item?.topicTags || []).forEach((topic) => group.topicTags.add(topic));
    group.results.push({ correct: result.correct, skillTag: item?.skillTag || result.skillTag });
  });
  return grouped;
};

export default function ToeflReadingMockTest({
  aiConfig,
  questionCount,
  targetScore,
  vocabSource,
  topicSelection,
  onExit,
  existingWords = [],
  onSaveVocabularyWord,
  onExplainVocabularyWord,
}) {
  const stageOneCount = Math.max(2, Math.ceil((questionCount || 6) / 2));
  const stageTwoCount = Math.max(1, (questionCount || 6) - stageOneCount);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [currentModule, setCurrentModule] = useState(null);
  const [stageTwoDifficulty, setStageTwoDifficulty] = useState(null);
  const [items, setItems] = useState([]);
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [checked, setChecked] = useState(false);
  const [band, setBand] = useState(null);
  const [sessionContext, setSessionContext] = useState({ vocabularyWords: [], pickedTopics: [] });
  const vocabCapture = useToeflVocabularyCapture({
    existingWords,
    onSaveVocabularyWord,
    onExplainVocabularyWord,
  });

  const currentItem = currentModule?.items?.[currentIndex];
  const correctCount = useMemo(() => results.filter((result) => result?.correct).length, [results]);

  const loadModule = async ({ stage, difficulty, count, context }) => {
    setStatus('loading');
    setError('');
    setSelectedIndex(null);
    setChecked(false);
    setCurrentIndex(0);

    try {
      const data = await generateReadingMockModule({
        aiConfig,
        stage,
        difficulty,
        questionCount: count,
        targetScore,
        vocabularyWords: context.vocabularyWords,
        pickedTopics: context.pickedTopics,
      });
      const normalized = normalizeModule(data, stage, difficulty);
      if (normalized.items.length === 0) throw new Error('모의고사 모듈 데이터가 비어 있습니다.');
      setCurrentModule(normalized);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Reading 모의고사 생성 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  useEffect(() => {
    const vocabularyWords =
      vocabSource && vocabSource.mode !== 'off' && Array.isArray(vocabSource.pool)
        ? sampleWords(vocabSource.pool, vocabSource.sampleSize || 12)
        : [];
    const pickedTopics =
      topicSelection?.enabled && Array.isArray(topicSelection.allTopics) && topicSelection.selectedIds?.length > 0
        ? pickRandomTopics(topicSelection.allTopics, topicSelection.selectedIds, topicSelection.pickCount || 1)
        : [];
    const context = { vocabularyWords, pickedTopics };
    setSessionContext(context);
    loadModule({ stage: 1, difficulty: 'router', count: stageOneCount, context });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionCount, targetScore]);

  const handleCheck = () => {
    if (!currentItem || selectedIndex === null || checked) return;
    const correct = selectedIndex === currentItem.answerIndex;
    setResults((prev) => [
      ...prev,
      { itemId: currentItem.id, correct, skillTag: currentItem.skillTag, stage: currentModule.stage },
    ]);
    setItems((prev) => [...prev, currentItem]);
    setChecked(true);
    playSound(correct ? 'SUCCESS' : 'FAIL');
  };

  const handleNext = () => {
    if (currentIndex < currentModule.items.length - 1) {
      setCurrentIndex((index) => index + 1);
      setSelectedIndex(null);
      setChecked(false);
      return;
    }

    if (currentModule.stage === 1) {
      const stageOneResults = [...results];
      const difficulty = routeReadingMockDifficulty({
        correct: stageOneResults.filter((result) => result.correct).length,
        total: stageOneResults.length,
      });
      setStageTwoDifficulty(difficulty);
      loadModule({
        stage: 2,
        difficulty,
        count: stageTwoCount,
        context: sessionContext,
      });
      return;
    }

    const finalItems = [...items];
    const finalResults = [...results];
    const finalBand = estimateReadingBand({
      correct: finalResults.filter((result) => result.correct).length,
      total: finalResults.length,
      difficulty: stageTwoDifficulty || 'lower',
    });
    setBand(finalBand);
    groupResultsByTask(finalItems, finalResults).forEach((group, taskType) => {
      recordToeflReadingAttempt({
        taskType,
        topicTags: Array.from(group.topicTags),
        results: group.results,
      });
    });
    setStatus('summary');
    playSound('COMPLETE');
  };

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-brand-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <Sparkles className="w-10 h-10 text-brand-400 mx-auto mb-4 animate-pulse" aria-hidden="true" />
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">TOEFL Reading 모의고사를 생성 중입니다</h3>
        <p className="text-sm font-bold text-surface-500">adaptive stage 모듈을 준비하고 있어요.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-xl border border-danger-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">모의고사 생성 실패</h3>
        <p className="text-sm font-bold text-danger-500 mb-6">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => loadModule({ stage: 1, difficulty: 'router', count: stageOneCount, context: sessionContext })}
          >
            다시 시도
          </Button>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
      </div>
    );
  }

  if (status === 'summary') {
    const total = results.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-surface-900 tracking-tight">TOEFL Reading Mock Test Report</h2>
            <p className="text-sm font-bold text-surface-500">
              정답 {correctCount}/{total} · Stage 2 {stageTwoDifficulty === 'upper' ? 'Upper' : 'Lower'} module
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-6">
            <p className="text-2xs font-black uppercase tracking-widest text-brand-500">Estimated Reading Band</p>
            <p className="mt-2 text-5xl font-black text-brand-700 tracking-tight">{band}</p>
          </div>
          <div className="rounded-xl bg-surface-50 border border-surface-100 p-6">
            <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Accuracy</p>
            <p className="mt-2 text-5xl font-black text-surface-900 tracking-tight">{accuracy}%</p>
          </div>
        </div>
        <p className="text-xs font-bold text-surface-500">
          Estimated band는 앱 내 연습용 추정치이며 공식 ETS 점수가 아닙니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-surface-900 tracking-tight">TOEFL Reading Mock Test</h2>
          <p className="text-sm font-bold text-surface-500">
            {currentModule?.label} · 문항 {currentIndex + 1}/{currentModule?.items?.length || 0}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-pill bg-brand-50 px-3 py-1 text-2xs font-black uppercase tracking-widest text-brand-700">
          <Target className="w-4 h-4" aria-hidden="true" />
          TOEFL {targetScore}+
        </div>
      </div>

      {currentItem && (
        <>
          <section className="rounded-md border border-surface-100 bg-surface-50 p-5 md:p-7">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-600" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-widest text-surface-400">
                {TASK_LABELS[currentItem.taskType] || currentItem.stimulusLabel}
              </p>
            </div>
            <h3 className="text-xl font-black text-surface-900 mb-3 tracking-tight">{currentItem.title}</h3>
            <VocabularyCaptureText
              text={currentItem.stimulus}
              activeWordKey={vocabCapture.activeWord}
              underlinedWordKeys={vocabCapture.underlinedKeys}
              onSelectWord={vocabCapture.selectWord}
              className="whitespace-pre-line text-base leading-8 font-semibold text-surface-700"
            />
          </section>

          <ToeflVocabularyActionBar
            word={vocabCapture.activeWord}
            savingKeys={vocabCapture.savingKeys}
            savedKeys={vocabCapture.savedKeys}
            explainingKeys={vocabCapture.explainingKeys}
            underlinedWordKeys={vocabCapture.underlinedKeys}
            existingWordKeys={vocabCapture.existingWordKeys}
            explanations={vocabCapture.explanations}
            errors={vocabCapture.errors}
            onSaveWord={vocabCapture.saveWord}
            onExplainWord={vocabCapture.explainWord}
            onToggleUnderline={vocabCapture.toggleUnderline}
            onClose={vocabCapture.clearActiveWord}
            canExplain={checked}
            buildMetadata={() => ({
              source: 'toefl-reading-mock',
              sourceLabel: 'TOEFL Reading Mock Test',
              taskType: currentItem.taskType,
              questionId: currentItem.id,
              title: currentItem.title,
              contextText: currentItem.stimulus,
            })}
          />

          <section className="space-y-4">
            <div>
              <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">{currentItem.skillTag}</p>
              <h3 className="text-lg font-black text-surface-900 tracking-tight">{currentItem.prompt}</h3>
            </div>
            <div className="space-y-3">
              {currentItem.options.map((option, index) => {
                const isSelected = selectedIndex === index;
                const isCorrect = checked && index === currentItem.answerIndex;
                const isWrong = checked && isSelected && !isCorrect;
                return (
                  <button
                    key={`${currentItem.id}-${option}`}
                    type="button"
                    disabled={checked}
                    onClick={() => setSelectedIndex(index)}
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
                  {results[results.length - 1]?.correct ? (
                    <Check className="w-5 h-5 text-success-600" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-5 h-5 text-danger-500" aria-hidden="true" />
                  )}
                  {results[results.length - 1]?.correct ? '정답입니다' : '오답입니다'}
                </div>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-surface-600">
                  {currentItem.explanationKo}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              {!checked ? (
                <Button variant="primary" size="md" onClick={handleCheck} disabled={selectedIndex === null}>
                  정답 확인
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={handleNext}>
                  {currentIndex < currentModule.items.length - 1
                    ? '다음 문항'
                    : currentModule.stage === 1
                      ? 'Stage 2로 이동'
                      : '리포트 보기'}
                </Button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
