import React, { useMemo, useState } from 'react';
import { Mail, Quote, Sparkles } from './Icons';
import { evaluateWritingResponse, generateWritingTask } from '../services/toeflService';
import { playSound } from '../utils/soundEffects';
import { Button } from '../design-system';
import { serializePickedTopics, useToeflQuizSession } from '../hooks/useToeflQuizSession';

const TASK_COPY = {
  email: {
    title: 'Write an Email',
    subtitle: '상황과 요구사항을 읽고 목적이 분명한 이메일을 작성합니다.',
    icon: Mail,
  },
  'academic-discussion': {
    title: 'Write for an Academic Discussion',
    subtitle: '교수 질문과 학생 의견을 읽고 수업 토론에 기여하는 글을 작성합니다.',
    icon: Quote,
  },
};

const normalizeEmailTask = (task) => ({
  taskType: 'email',
  title: task?.title || 'Email task',
  situation: task?.situation || '',
  requirements: Array.isArray(task?.requirements) ? task.requirements : [],
  recipient: task?.recipient || 'Recipient',
  timeLimitMinutes: task?.timeLimitMinutes || 7,
  wordTarget: task?.wordTarget || 'Answer completely and politely.',
});

const normalizeDiscussionTask = (task) => ({
  taskType: 'academic-discussion',
  title: task?.title || 'Academic discussion',
  course: task?.course || 'Academic seminar',
  professorQuestion: task?.professorQuestion || '',
  studentPosts: Array.isArray(task?.studentPosts) ? task.studentPosts.slice(0, 2) : [],
  timeLimitMinutes: task?.timeLimitMinutes || 10,
  wordTarget: task?.wordTarget || 'Write at least 100 words.',
});

const normalizeTask = (task, taskType) => (
  taskType === 'email' ? normalizeEmailTask(task) : normalizeDiscussionTask(task)
);

const countWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

const FeedbackList = ({ title, items }) => (
  <div className="rounded-md bg-surface-50 border border-surface-100 p-4">
    <h4 className="font-black text-surface-900 mb-2 tracking-tight">{title}</h4>
    <ul className="text-sm text-surface-600 space-y-1 list-disc list-inside">
      {(items || []).map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
    </ul>
  </div>
);

export default function ToeflWritingTaskQuiz({
  aiConfig,
  taskType,
  targetScore,
  vocabSource,
  topicSelection,
  onExit,
  reviewAsset = null,
  onAssetCreated,
  onAttemptRecorded,
}) {
  const copy = TASK_COPY[taskType] || TASK_COPY.email;
  const TaskIcon = copy.icon;
  const [task, setTask] = useState(null);
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState(null);

  const wordCount = useMemo(() => countWords(response), [response]);

  const { activeAsset, error, reload: loadTask, sessionContext, setError, setStatus, status } = useToeflQuizSession({
    reviewAsset,
    vocabSource,
    topicSelection,
    onAssetCreated,
    resetSession: () => {
      setTask(null);
      setResponse('');
      setFeedback(null);
    },
    loadReview: (asset) => {
      const savedTask = asset.payload.task || asset.payload;
      const normalized = normalizeTask(savedTask, asset.taskType || taskType);
      if (normalized.taskType === 'email' && !normalized.situation) throw new Error('저장된 이메일 과제 데이터가 비어 있습니다.');
      if (normalized.taskType === 'academic-discussion' && !normalized.professorQuestion) {
        throw new Error('저장된 토론 과제 데이터가 비어 있습니다.');
      }
      return normalized;
    },
    generateNew: ({ vocabularyWords, pickedTopics }) =>
      generateWritingTask({
        aiConfig,
        taskType,
        targetScore,
        vocabularyWords,
        pickedTopics,
      }).then((generated) => {
        const normalized = normalizeTask(generated, taskType);
        if (taskType === 'email' && !normalized.situation) throw new Error('이메일 과제 데이터가 비어 있습니다.');
        if (taskType === 'academic-discussion' && !normalized.professorQuestion) {
          throw new Error('토론 과제 데이터가 비어 있습니다.');
        }
        return normalized;
      }),
    buildAsset: (normalized, { vocabularyWords, pickedTopics }) => ({
      mode: taskType === 'email' ? 'toefl-writing-email' : 'toefl-writing-discussion',
      taskType,
      title: normalized.title || copy.title,
      payload: { task: normalized },
      metadata: {
        targetScore,
        vocabSampleCount: vocabularyWords.length,
        pickedTopics: serializePickedTopics(pickedTopics),
      },
    }),
    onReady: (normalized) => {
      setTask(normalized);
    },
    errorMessage: 'Writing 과제 생성 중 오류가 발생했습니다.',
    dependencies: [taskType, targetScore, reviewAsset?.id],
  });

  const resetAndReload = () => {
    setTask(null);
    setResponse('');
    setFeedback(null);
    loadTask();
  };

  const handleSubmit = async () => {
    if (!task || !response.trim() || status === 'checking') return;
    setStatus('checking');
    setFeedback(null);
    try {
      const result = await evaluateWritingResponse({
        aiConfig,
        taskType,
        task,
        userResponse: response,
        targetScore,
      });
      const normalizedFeedback = {
        score: Number.isFinite(Number(result?.score)) ? Math.max(0, Math.min(5, Number(result.score))) : 0,
        feedbackKo: result?.feedbackKo || '피드백을 불러왔습니다.',
        strengths: Array.isArray(result?.strengths) ? result.strengths : [],
        improvements: Array.isArray(result?.improvements) ? result.improvements : [],
        nextSteps: Array.isArray(result?.nextSteps) ? result.nextSteps : [],
      };
      setFeedback(normalizedFeedback);
      if (activeAsset && typeof onAttemptRecorded === 'function') {
        await onAttemptRecorded(activeAsset, {
          answers: { response },
          results: { feedback: normalizedFeedback },
          correctCount: normalizedFeedback.score >= 3 ? 1 : 0,
          totalCount: 1,
          score: {
            practiceScore: normalizedFeedback.score,
            wordCount,
          },
        });
      }
      setStatus('feedback');
      playSound('COMPLETE');
    } catch (err) {
      setError(err.message || 'Writing 채점 중 오류가 발생했습니다.');
      setStatus('error');
      playSound('FAIL');
    }
  };

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-brand-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <Sparkles className="w-10 h-10 text-brand-400 mx-auto mb-4 animate-pulse" aria-hidden="true" />
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">TOEFL Writing 과제를 생성 중입니다</h3>
        <p className="text-sm font-bold text-surface-500">{copy.title} 프롬프트를 준비하고 있어요.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-xl border border-danger-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">과제 생성 실패</h3>
        <p className="text-sm font-bold text-danger-500 mb-6">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" size="md" onClick={resetAndReload}>다시 시도</Button>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
      </div>
    );
  }

  if (status === 'feedback' && feedback) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-surface-900 tracking-tight">Writing 피드백</h2>
            <p className="text-sm font-bold text-surface-500">{copy.title} · {wordCount} words</p>
          </div>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>

        <div className="rounded-xl bg-brand-50 border border-brand-100 p-6">
          <p className="text-2xs font-black uppercase tracking-widest text-brand-500">Practice Score</p>
          <p className="mt-2 text-5xl font-black text-brand-700 tracking-tight">{feedback.score}/5</p>
          <p className="mt-3 text-sm font-bold text-brand-900 leading-relaxed">{feedback.feedbackKo}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeedbackList title="강점" items={feedback.strengths} />
          <FeedbackList title="개선점" items={feedback.improvements} />
          <FeedbackList title="다음 학습" items={feedback.nextSteps} />
        </div>
      </div>
    );
  }

  const isEmail = taskType === 'email';

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-surface-900 tracking-tight">{copy.title}</h2>
          <p className="text-sm font-bold text-surface-500">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-2xs uppercase tracking-widest">
            TOEFL {targetScore}+
          </span>
          <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-surface-50 text-surface-600 font-black text-2xs uppercase tracking-widest">
            {task?.timeLimitMinutes || (isEmail ? 7 : 10)} min
          </span>
          {sessionContext.vocabSampleCount > 0 && (
            <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-2xs uppercase tracking-widest">
              내 단어 {sessionContext.vocabSampleCount}개 활용
            </span>
          )}
        </div>
      </div>

      <section className="rounded-md border border-surface-100 bg-surface-50 p-5 md:p-7 space-y-5">
        <div className="flex items-center gap-2">
          <TaskIcon className="w-5 h-5 text-brand-600" aria-hidden="true" />
          <p className="text-xs font-black uppercase tracking-widest text-surface-400">{task?.title}</p>
        </div>

        {isEmail ? (
          <>
            <div>
              <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">Situation</p>
              <p className="text-base leading-8 font-semibold text-surface-700">{task?.situation}</p>
            </div>
            <div>
              <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">Include</p>
              <ul className="list-disc list-inside space-y-2 text-sm font-bold text-surface-700">
                {(task?.requirements || []).map((requirement, index) => (
                  <li key={`requirement-${index}`}>{requirement}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">{task?.course}</p>
              <p className="text-base leading-8 font-semibold text-surface-700">{task?.professorQuestion}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(task?.studentPosts || []).map((post, index) => (
                <div key={`${post.name}-${index}`} className="rounded-md bg-white border border-surface-200 p-4">
                  <p className="text-sm font-black text-surface-900 mb-2">{post.name || `Student ${index + 1}`}</p>
                  <p className="text-sm font-semibold leading-relaxed text-surface-600">{post.text}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs font-black text-surface-400 uppercase tracking-widest">Your Response</p>
          <p className="text-2xs font-black text-surface-500 uppercase tracking-widest">{wordCount} words</p>
        </div>
        <textarea
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          disabled={status === 'checking'}
          autoComplete="off"
          rows={12}
          placeholder={isEmail ? 'Write your email here.' : 'Write your discussion contribution here.'}
          className="w-full rounded-md border border-surface-200 bg-white p-4 text-base font-semibold leading-7 text-surface-800 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
        />
        <p className="text-xs font-bold text-surface-500">
          {task?.wordTarget || (isEmail ? 'Answer completely and politely.' : 'Write at least 100 words.')}
        </p>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={!response.trim() || status === 'checking'}
        >
          {status === 'checking' ? '채점 중...' : 'AI 피드백 받기'}
        </Button>
      </div>
    </div>
  );
}
