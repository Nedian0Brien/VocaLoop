import React from 'react';
import { ArrowLeft, CheckCircle, FileText, RotateCw, XCircle } from './Icons';
import { Button } from '../design-system';
import { TOEFL_MODE_TITLES } from './quizModeRegistry';

const statusLabel = {
  new: 'Needs review',
  reviewing: 'In rotation',
  mastered: 'Mastered',
};

const statusClass = {
  new: 'border-danger-200 bg-danger-50 text-danger-700',
  reviewing: 'border-warning-200 bg-warning-50 text-warning-700',
  mastered: 'border-success-200 bg-success-50 text-success-700',
};

const modeLabel = (mode) => TOEFL_MODE_TITLES[mode] || mode || 'TOEFL';

const formatDate = (value) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString();
};

const TextBlock = ({ label, value, tone = 'surface' }) => (
  <div className={[
    'rounded-xl border p-4',
    tone === 'danger' ? 'border-danger-100 bg-danger-50' : '',
    tone === 'success' ? 'border-success-100 bg-success-50' : '',
    tone === 'surface' ? 'border-surface-200 bg-surface-50' : '',
  ].join(' ')}>
    <p className="mb-2 text-sm font-semibold text-surface-500">{label}</p>
    <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-surface-800">{value || '-'}</p>
  </div>
);

const DetailMetric = ({ label, value }) => (
  <div className="rounded-lg border border-surface-200 bg-white p-3">
    <p className="text-sm font-medium text-surface-500">{label}</p>
    <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-surface-900">{value}</p>
  </div>
);

export default function ToeflReviewDetail({
  item,
  onBack,
  onMark,
  onOpenAsset,
  updating = false,
  backLabel = 'Review Queue로',
}) {
  if (!item) return null;
  const tags = [item.skillTag, ...(Array.isArray(item.topicTags) ? item.topicTags : [])].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <Button variant="secondary" size="md" onClick={onBack} leftIcon={ArrowLeft}>
          {backLabel}
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          <span className={`rounded-md border px-2.5 py-1 font-semibold ${statusClass[item.status] || 'border-surface-200 bg-surface-50 text-surface-600'}`}>
            {statusLabel[item.status] || item.status || 'Review'}
          </span>
          <span className="rounded-md border border-surface-200 bg-white px-2.5 py-1 font-medium text-surface-600">
            Due {formatDate(item.dueAt)}
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-surface-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-col gap-4 border-b border-surface-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-sm italic text-brand-600">TOEFL review</p>
            <h2 className="mt-3 text-2xl font-semibold leading-snug text-surface-900 text-balance">{item.prompt || item.title}</h2>
            <p className="mt-2 text-sm font-medium text-surface-500">
              {modeLabel(item.mode)} / {item.title}
            </p>
          </div>
          <RotateCw className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextBlock label="Your Answer" value={item.userAnswer} tone="danger" />
          <TextBlock label="Target Answer" value={item.correctAnswer} tone="success" />
        </div>

        <div className="mt-4">
          <TextBlock label="Explanation" value={item.explanation || '저장된 문제를 다시 풀며 근거를 확인하세요.'} />
        </div>

        {item.sourceSnapshot?.stimulus && (
          <div className="mt-4">
            <TextBlock label={item.sourceSnapshot?.stimulusLabel || 'Source'} value={item.sourceSnapshot.stimulus} />
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button variant="secondary" size="lg" onClick={() => onOpenAsset?.(item)} leftIcon={FileText} fullWidth>
            전체 다시 풀기
          </Button>
          <Button variant="danger" size="lg" loading={updating} onClick={() => onMark?.(item, 'wrong')} leftIcon={XCircle} fullWidth>
            아직 어려움
          </Button>
          <Button variant="primary" size="lg" loading={updating} onClick={() => onMark?.(item, 'correct')} leftIcon={CheckCircle} fullWidth>
            이해 완료
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <DetailMetric label="Reviews" value={item.reviewCount || 0} />
          <DetailMetric label="Streak" value={item.successStreak || 0} />
          <DetailMetric label="Last" value={item.lastResult || '-'} />
        </div>
      </section>
    </div>
  );
}
