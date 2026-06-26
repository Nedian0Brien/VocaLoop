import React, { useCallback, useMemo, useState } from 'react';
import { Edit3, Mail, Quote, Sparkles } from './Icons';
import BuildSentenceFrame from './BuildSentenceFrame';
import {
  estimateWritingBand,
  evaluateWritingMockSection,
  generateWritingMockSection,
} from '../services/toeflService';
import { playSound } from '../utils/soundEffects';
import { Button } from '../design-system';
import { serializePickedTopics, useToeflQuizSession } from '../hooks/useToeflQuizSession';
import { useBuildSentenceDrag } from '../hooks/useBuildSentenceDrag';
import { formatToeflDifficultyLabel } from '../services/toefl/difficulty';
import {
  buildSentenceAttempt,
  countSentenceFrameBlanks,
  getBuildSentenceRequiredTokenCount,
  hasBuildSentenceFrame,
} from '../services/toefl/buildSentenceUtils';

const SENTENCE_COUNT = 10;

const normalizeSentenceItem = (item, index) => ({
  id: item?.id || index + 1,
  target: String(item?.target || ''),
  words: Array.isArray(item?.words) ? item.words.map(String).filter(Boolean) : [],
  answer: Array.isArray(item?.answer) ? item.answer.map(String).filter(Boolean) : [],
  context: item?.context || '',
  sentenceFrame: item?.sentenceFrame || '',
  hint: item?.hint || '',
});

const normalizeEmailTask = (task) => ({
  taskType: 'email',
  title: task?.title || 'Write an Email',
  situation: task?.situation || '',
  requirements: Array.isArray(task?.requirements) ? task.requirements : [],
  recipient: task?.recipient || 'Recipient',
  timeLimitMinutes: task?.timeLimitMinutes || 7,
  wordTarget: task?.wordTarget || 'Answer completely and politely.',
});

const normalizeDiscussionTask = (task) => ({
  taskType: 'academic-discussion',
  title: task?.title || 'Write for an Academic Discussion',
  course: task?.course || 'Academic seminar',
  professorQuestion: task?.professorQuestion || '',
  studentPosts: Array.isArray(task?.studentPosts) ? task.studentPosts.slice(0, 2) : [],
  timeLimitMinutes: task?.timeLimitMinutes || 10,
  wordTarget: task?.wordTarget || 'Write at least 100 words.',
});

const normalizeSection = (data) => {
  const sentenceItems = (Array.isArray(data?.sentenceItems) ? data.sentenceItems : [])
    .map(normalizeSentenceItem)
    .filter((item) => item.target && item.words.length > 0)
    .slice(0, SENTENCE_COUNT);
  return {
    sentenceItems,
    emailTask: normalizeEmailTask(data?.emailTask),
    discussionTask: normalizeDiscussionTask(data?.discussionTask),
  };
};

const normalizeText = (text) => String(text || '')
  .trim()
  .replace(/[.,;:!?]/g, '')
  .replace(/\s+/g, ' ')
  .toLowerCase();

const countWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

const SummaryList = ({ title, items }) => (
  <div className="rounded-md bg-surface-50 border border-surface-100 p-4">
    <h4 className="font-black text-surface-900 mb-2 tracking-tight">{title}</h4>
    <ul className="text-sm text-surface-600 space-y-1 list-disc list-inside">
      {(items || []).map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
    </ul>
  </div>
);

export default function ToeflWritingMockTest({
  aiConfig,
  targetScore,
  vocabSource,
  topicSelection,
  onExit,
  reviewAsset = null,
  onAssetCreated,
  onAttemptRecorded,
}) {
  const difficultyLabel = formatToeflDifficultyLabel(targetScore);
  const [section, setSection] = useState(null);
  const [step, setStep] = useState(0);
  const [banks, setBanks] = useState([]);
  const [arrangements, setArrangements] = useState([]);
  const [emailResponse, setEmailResponse] = useState('');
  const [discussionResponse, setDiscussionResponse] = useState('');
  const [summary, setSummary] = useState(null);

  const sentenceItems = section?.sentenceItems || [];
  const activeSentence = sentenceItems[step];
  const isEmailStep = step === sentenceItems.length;
  const isDiscussionStep = step === sentenceItems.length + 1;
  const activeBank = banks[step] || [];
  const activeArrangement = arrangements[step] || [];
  const activeRequiredTokenCount = getBuildSentenceRequiredTokenCount(activeSentence);
  const activeIsFramedQuestion = hasBuildSentenceFrame(activeSentence);
  const activeHasVisibleFrame = countSentenceFrameBlanks(activeSentence?.sentenceFrame) > 0;
  const activeSentenceIncomplete = activeSentence && (
    activeIsFramedQuestion
      ? activeArrangement.length !== activeRequiredTokenCount
      : activeArrangement.length === 0
  );

  const emailWordCount = useMemo(() => countWords(emailResponse), [emailResponse]);
  const discussionWordCount = useMemo(() => countWords(discussionResponse), [discussionResponse]);
  const setActiveBank = useCallback((updater) => {
    setBanks((prev) => prev.map((bank, index) => (
      index === step ? (typeof updater === 'function' ? updater(bank) : updater) : bank
    )));
  }, [step]);
  const setActiveArrangement = useCallback((updater) => {
    setArrangements((prev) => prev.map((arrangement, index) => (
      index === step ? (typeof updater === 'function' ? updater(arrangement) : updater) : arrangement
    )));
  }, [step]);
  const { activeAsset, error, reload: loadSection, sessionContext, setError, setStatus, status } = useToeflQuizSession({
    reviewAsset,
    vocabSource,
    topicSelection,
    onAssetCreated,
    resetSession: () => {
      setSection(null);
      setStep(0);
      setBanks([]);
      setArrangements([]);
      setEmailResponse('');
      setDiscussionResponse('');
      setSummary(null);
    },
    loadReview: (asset) => {
      const savedSection = asset.payload.section || asset.payload;
      const normalized = normalizeSection(savedSection);
      if (normalized.sentenceItems.length === 0 || !normalized.emailTask.situation || !normalized.discussionTask.professorQuestion) {
        throw new Error('저장된 Writing 모의고사 데이터가 비어 있습니다.');
      }
      return normalized;
    },
    generateNew: ({ vocabularyWords, pickedTopics }) =>
      generateWritingMockSection({
        aiConfig,
        targetScore,
        sentenceCount: SENTENCE_COUNT,
        vocabularyWords,
        pickedTopics,
      }).then((data) => {
        const normalized = normalizeSection(data);
        if (normalized.sentenceItems.length === 0 || !normalized.emailTask.situation || !normalized.discussionTask.professorQuestion) {
          throw new Error('Writing 모의고사 데이터가 비어 있습니다.');
        }
        return normalized;
      }),
    buildAsset: (normalized, { vocabularyWords, pickedTopics }) => ({
      mode: 'toefl-writing-mock',
      taskType: 'writing-mock',
      title: 'TOEFL Writing Mock Test',
      payload: { section: normalized },
      metadata: {
        targetScore,
        sentenceCount: SENTENCE_COUNT,
        vocabSampleCount: vocabularyWords.length,
        pickedTopics: serializePickedTopics(pickedTopics),
      },
    }),
    onReady: (normalized) => {
      setSection(normalized);
      setBanks(normalized.sentenceItems.map((item) => item.words.map((_, index) => index)));
      setArrangements(normalized.sentenceItems.map(() => []));
    },
    errorMessage: 'Writing 모의고사 생성 중 오류가 발생했습니다.',
    dependencies: [targetScore, reviewAsset?.id],
  });
  const {
    arrContainerRef,
    drag,
    dropAtIdx,
    handlePointerDown,
  } = useBuildSentenceDrag({
    currentQuestion: activeSentence,
    setArrangement: setActiveArrangement,
    setBank: setActiveBank,
    status,
  });

  const resetAndReload = () => {
    setSection(null);
    setStep(0);
    setBanks([]);
    setArrangements([]);
    setEmailResponse('');
    setDiscussionResponse('');
    setSummary(null);
    loadSection();
  };

  const moveToArrangement = (wordIndex) => {
    if (status !== 'ready' || !activeSentence) return;
    setBanks((prev) => prev.map((bank, index) => (
      index === step ? bank.filter((item) => item !== wordIndex) : bank
    )));
    setArrangements((prev) => prev.map((arrangement, index) => (
      index === step ? [...arrangement, wordIndex] : arrangement
    )));
  };

  const moveToBank = (wordIndex) => {
    if (status !== 'ready' || !activeSentence) return;
    setArrangements((prev) => prev.map((arrangement, index) => (
      index === step ? arrangement.filter((item) => item !== wordIndex) : arrangement
    )));
    setBanks((prev) => prev.map((bank, index) => (
      index === step ? [...bank, wordIndex] : bank
    )));
  };

  const resetSentence = () => {
    if (!activeSentence) return;
    setBanks((prev) => prev.map((bank, index) => (
      index === step ? activeSentence.words.map((_, wordIndex) => wordIndex) : bank
    )));
    setArrangements((prev) => prev.map((arrangement, index) => (
      index === step ? [] : arrangement
    )));
  };

  const getSentenceResults = () => sentenceItems.map((item, index) => {
    const attempt = buildSentenceAttempt(item, arrangements[index] || []);
    return {
      id: item.id,
      target: item.target,
      attempt,
      correct: normalizeText(attempt) === normalizeText(item.target),
    };
  });

  const handleNext = async () => {
    if (isEmailStep && !emailResponse.trim()) return;
    if (isDiscussionStep && !discussionResponse.trim()) return;

    if (!isDiscussionStep) {
      setStep((current) => current + 1);
      return;
    }

    setStatus('checking');
    try {
      const sentenceResults = getSentenceResults();
      const sentenceCorrect = sentenceResults.filter((result) => result.correct).length;
      const evaluation = await evaluateWritingMockSection({
        aiConfig,
        emailTask: section.emailTask,
        discussionTask: section.discussionTask,
        emailResponse,
        discussionResponse,
        sentenceCorrect,
        sentenceTotal: sentenceResults.length,
        targetScore,
      });
      const emailScore = Number.isFinite(Number(evaluation?.emailScore)) ? Math.max(0, Math.min(5, Number(evaluation.emailScore))) : 0;
      const discussionScore = Number.isFinite(Number(evaluation?.discussionScore)) ? Math.max(0, Math.min(5, Number(evaluation.discussionScore))) : 0;
      const summaryReport = {
        sentenceCorrect,
        sentenceTotal: sentenceResults.length,
        emailScore,
        discussionScore,
        band: estimateWritingBand({
          sentenceCorrect,
          sentenceTotal: sentenceResults.length,
          emailScore,
          discussionScore,
        }),
        feedbackKo: evaluation?.feedbackKo || 'Writing 모의고사 피드백을 생성했습니다.',
        strengths: Array.isArray(evaluation?.strengths) ? evaluation.strengths : [],
        improvements: Array.isArray(evaluation?.improvements) ? evaluation.improvements : [],
        nextSteps: Array.isArray(evaluation?.nextSteps) ? evaluation.nextSteps : [],
      };
      setSummary(summaryReport);
      if (activeAsset && typeof onAttemptRecorded === 'function') {
        await onAttemptRecorded(activeAsset, {
          answers: {
            sentenceArrangements: arrangements,
            emailResponse,
            discussionResponse,
          },
          results: {
            sentenceResults,
            feedback: summaryReport,
          },
          correctCount: sentenceCorrect,
          totalCount: sentenceResults.length,
          score: {
            band: summaryReport.band,
            emailScore,
            discussionScore,
          },
        });
      }
      setStatus('summary');
      playSound('COMPLETE');
    } catch (err) {
      setError(err.message || 'Writing 모의고사 채점 중 오류가 발생했습니다.');
      setStatus('error');
      playSound('FAIL');
    }
  };

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-brand-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <Sparkles className="w-10 h-10 text-brand-400 mx-auto mb-4 animate-pulse" aria-hidden="true" />
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">TOEFL Writing 모의고사를 생성 중입니다</h3>
        <p className="text-sm font-bold text-surface-500">10개 문장, 이메일, Academic Discussion 과제를 준비하고 있어요.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-xl border border-danger-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">모의고사 생성 실패</h3>
        <p className="text-sm font-bold text-danger-500 mb-6">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" size="md" onClick={resetAndReload}>다시 시도</Button>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
      </div>
    );
  }

  if (status === 'summary' && summary) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-surface-900 tracking-tight">TOEFL Writing Mock Test Report</h2>
            <p className="text-sm font-bold text-surface-500">
              Build a Sentence {summary.sentenceCorrect}/{summary.sentenceTotal} · Email {summary.emailScore}/5 · Discussion {summary.discussionScore}/5
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-6">
            <p className="text-2xs font-black uppercase tracking-widest text-brand-500">Estimated Writing Band</p>
            <p className="mt-2 text-5xl font-black text-brand-700 tracking-tight">{summary.band}</p>
          </div>
          <div className="rounded-xl bg-surface-50 border border-surface-100 p-6">
            <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Constructed Response</p>
            <p className="mt-2 text-5xl font-black text-surface-900 tracking-tight">
              {summary.emailScore + summary.discussionScore}/10
            </p>
          </div>
        </div>
        <div className="rounded-md bg-brand-50 border border-brand-100 p-5">
          <p className="text-sm font-bold text-brand-900 leading-relaxed">{summary.feedbackKo}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryList title="강점" items={summary.strengths} />
          <SummaryList title="개선점" items={summary.improvements} />
          <SummaryList title="다음 학습" items={summary.nextSteps} />
        </div>
        <p className="text-xs font-bold text-surface-500">
          Estimated band는 앱 내 연습용 추정치이며 공식 ETS 점수가 아닙니다.
        </p>
      </div>
    );
  }

  const progressLabel = isEmailStep
    ? 'Write an Email'
    : isDiscussionStep
      ? 'Write for an Academic Discussion'
      : `Build a Sentence ${step + 1}/${sentenceItems.length}`;

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-surface-900 tracking-tight">TOEFL Writing Mock Test</h2>
          <p className="text-sm font-bold text-surface-500">{progressLabel}</p>
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

      {activeSentence && (
        <>
          <section className="rounded-md border border-surface-100 bg-surface-50 p-5 md:p-7">
            <div className="mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand-600" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-widest text-surface-400">Build a Sentence</p>
            </div>
            <p className="text-base md:text-lg font-bold text-surface-800 leading-relaxed">
              {activeSentence.context || activeSentence.hint || 'Arrange the words into a complete sentence.'}
            </p>
            {activeSentence.sentenceFrame && !activeHasVisibleFrame && (
              <p className="mt-4 text-base md:text-lg font-black text-surface-900 leading-relaxed">
                {activeSentence.sentenceFrame}
              </p>
            )}
          </section>

          <section className="space-y-4">
            {activeHasVisibleFrame ? (
              <div>
                <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">Sentence Frame</p>
                <BuildSentenceFrame
                  arrangement={activeArrangement}
                  containerRef={arrContainerRef}
                  disabled={status !== 'ready'}
                  drag={drag}
                  dropAtIdx={dropAtIdx}
                  onTokenClick={moveToBank}
                  onTokenPointerDown={handlePointerDown}
                  question={activeSentence}
                />
              </div>
            ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-2xs font-black text-surface-400 uppercase tracking-widest">Your Sentence</p>
                {activeArrangement.length > 0 && (
                  <button
                    type="button"
                    onClick={resetSentence}
                    className="text-2xs font-black text-surface-500 hover:text-brand-600 uppercase tracking-widest transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="min-h-[5rem] rounded-md p-4 border-2 border-dashed border-brand-300 bg-brand-50/30 flex flex-wrap items-center gap-2">
                {activeArrangement.length === 0 ? (
                  <span className="text-sm font-semibold text-surface-400">아래 단어를 클릭해 배치하세요.</span>
                ) : (
                  activeArrangement.map((wordIndex, index) => (
                    <button
                      key={`arr-${wordIndex}-${index}`}
                      type="button"
                      onClick={() => moveToBank(wordIndex)}
                      className="px-3 py-1.5 rounded-sm border border-brand-300 bg-white text-brand-700 font-bold text-sm hover:border-brand-500"
                    >
                      {activeSentence.words[wordIndex]}
                    </button>
                  ))
                )}
              </div>
              {activeIsFramedQuestion && (
                <p className="mt-2 text-2xs font-black uppercase tracking-widest text-surface-400">
                  Slots {activeArrangement.length}/{activeRequiredTokenCount}
                </p>
              )}
            </div>
            )}

            <div>
              <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">Word Bank</p>
              <div className="rounded-md p-4 border border-surface-200 bg-white flex flex-wrap gap-2 min-h-[4rem]">
                {activeBank.map((wordIndex, index) => (
                  <button
                    key={`bank-${wordIndex}-${index}`}
                    type="button"
                    onClick={() => moveToArrangement(wordIndex)}
                    className="px-3 py-1.5 rounded-sm border bg-surface-50 border-surface-200 text-surface-800 font-bold text-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {activeSentence.words[wordIndex]}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {isEmailStep && (
        <section className="space-y-5">
          <div className="rounded-md border border-surface-100 bg-surface-50 p-5 md:p-7 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-brand-600" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-widest text-surface-400">{section.emailTask.title}</p>
            </div>
            <p className="text-base leading-8 font-semibold text-surface-700">{section.emailTask.situation}</p>
            <ul className="list-disc list-inside space-y-2 text-sm font-bold text-surface-700">
              {section.emailTask.requirements.map((requirement, index) => (
                <li key={`email-req-${index}`}>{requirement}</li>
              ))}
            </ul>
          </div>
          <textarea
            value={emailResponse}
            onChange={(event) => setEmailResponse(event.target.value)}
            autoComplete="off"
            rows={10}
            placeholder="Write your email here."
            className="w-full rounded-md border border-surface-200 bg-white p-4 text-base font-semibold leading-7 text-surface-800 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <p className="text-xs font-bold text-surface-500">{emailWordCount} words · 7 min target</p>
        </section>
      )}

      {isDiscussionStep && (
        <section className="space-y-5">
          <div className="rounded-md border border-surface-100 bg-surface-50 p-5 md:p-7 space-y-4">
            <div className="flex items-center gap-2">
              <Quote className="w-5 h-5 text-brand-600" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-widest text-surface-400">{section.discussionTask.course}</p>
            </div>
            <p className="text-base leading-8 font-semibold text-surface-700">{section.discussionTask.professorQuestion}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.discussionTask.studentPosts.map((post, index) => (
                <div key={`${post.name}-${index}`} className="rounded-md bg-white border border-surface-200 p-4">
                  <p className="text-sm font-black text-surface-900 mb-2">{post.name || `Student ${index + 1}`}</p>
                  <p className="text-sm font-semibold leading-relaxed text-surface-600">{post.text}</p>
                </div>
              ))}
            </div>
          </div>
          <textarea
            value={discussionResponse}
            onChange={(event) => setDiscussionResponse(event.target.value)}
            rows={12}
            placeholder="Write your academic discussion response here."
            className="w-full rounded-md border border-surface-200 bg-white p-4 text-base font-semibold leading-7 text-surface-800 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <p className="text-xs font-bold text-surface-500">{discussionWordCount} words · 100+ words recommended</p>
        </section>
      )}

      {status === 'checking' && (
        <div className="rounded-md border border-brand-100 bg-brand-50 p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-brand-600 animate-pulse" aria-hidden="true" />
          <p className="text-sm font-black text-brand-900">Writing 응답을 채점 중입니다.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleNext}
          disabled={
            status === 'checking'
            || activeSentenceIncomplete
            || (isEmailStep && !emailResponse.trim())
            || (isDiscussionStep && !discussionResponse.trim())
          }
        >
          {isDiscussionStep ? '리포트 보기' : '다음 문항'}
        </Button>
      </div>
    </div>
  );
}
