import React from 'react';
import { ArrowLeft, CheckCircle, FileText, RotateCw, XCircle } from './Icons';
import { Badge, Button, Card, SectionHeading } from '../design-system';
import { TOEFL_MODE_TITLES } from './quizModeRegistry';

const statusTone = {
  new: 'danger',
  reviewing: 'warning',
  mastered: 'success',
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
    tone === 'danger' ? 'bg-danger-50 border-danger-100' : '',
    tone === 'success' ? 'bg-success-50 border-success-100' : '',
    tone === 'surface' ? 'bg-surface-50 border-surface-100' : '',
  ].join(' ')}>
    <p className="text-2xs font-black uppercase tracking-widest text-surface-400 mb-2">{label}</p>
    <p className="text-sm font-bold text-surface-800 leading-relaxed whitespace-pre-wrap">{value || '-'}</p>
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <Button variant="secondary" size="md" onClick={onBack} leftIcon={ArrowLeft}>
          {backLabel}
        </Button>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[item.status] || 'neutral'} size="sm">{item.status}</Badge>
          <Badge tone="neutral" size="sm">Due {formatDate(item.dueAt)}</Badge>
        </div>
      </div>

      <SectionHeading
        icon={RotateCw}
        tone="brand"
        title="TOEFL Review"
        subtitle={`${modeLabel(item.mode)} · ${item.title}`}
      />

      <Card variant="elevated" radius="card" padding="lg" className="space-y-6">
        <div>
          <p className="text-2xs font-black uppercase tracking-widest text-brand-500 mb-3">Review Prompt</p>
          <h2 className="text-2xl font-black text-surface-900 tracking-tight leading-snug">{item.prompt || item.title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextBlock label="Your Answer" value={item.userAnswer} tone="danger" />
          <TextBlock label="Target Answer" value={item.correctAnswer} tone="success" />
        </div>

        <TextBlock label="Explanation" value={item.explanation || '저장된 문제를 다시 풀며 근거를 확인하세요.'} />

        {item.sourceSnapshot?.stimulus && (
          <TextBlock label={item.sourceSnapshot?.stimulusLabel || 'Source'} value={item.sourceSnapshot.stimulus} />
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} tone="brand" style="tag" size="sm">{tag}</Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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

        <div className="grid grid-cols-3 gap-3 pt-2 text-center">
          <div className="rounded-md bg-surface-50 border border-surface-100 p-3">
            <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Reviews</p>
            <p className="mt-1 text-lg font-black text-surface-900">{item.reviewCount || 0}</p>
          </div>
          <div className="rounded-md bg-surface-50 border border-surface-100 p-3">
            <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Streak</p>
            <p className="mt-1 text-lg font-black text-surface-900">{item.successStreak || 0}</p>
          </div>
          <div className="rounded-md bg-surface-50 border border-surface-100 p-3">
            <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Last</p>
            <p className="mt-1 text-lg font-black text-surface-900">{item.lastResult || '-'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
