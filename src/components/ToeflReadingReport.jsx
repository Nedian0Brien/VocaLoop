import React, { useMemo } from 'react';
import { AlertTriangle, BarChart3, Brain, CheckCircle, Target, XCircle } from './Icons';
import { Badge, Button } from '../design-system';
import { buildToeflReadingReport } from '../utils/toeflReadingReport';
import { formatToeflDifficultyLabel } from '../services/toefl/difficulty';

const MetricTile = ({ icon: Icon, label, value, caption, tone = 'brand' }) => {
  const toneClasses = {
    brand: 'bg-brand-50 border-brand-100 text-brand-700',
    success: 'bg-success-50 border-success-100 text-success-700',
    danger: 'bg-danger-50 border-danger-100 text-danger-700',
    surface: 'bg-surface-50 border-surface-100 text-surface-900',
  };

  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone] || toneClasses.brand}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xs font-black uppercase tracking-widest opacity-80">{label}</p>
        {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      {caption && <p className="mt-1 text-xs font-bold opacity-75">{caption}</p>}
    </div>
  );
};

const BreakdownRow = ({ bucket }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-black text-surface-800">{bucket.label}</span>
      <span className="font-black text-surface-500">{bucket.correct}/{bucket.total} · {bucket.accuracy}%</span>
    </div>
    <div className="h-2 rounded-pill bg-surface-100 overflow-hidden" aria-hidden="true">
      <div
        className={[
          'h-full rounded-pill',
          bucket.accuracy >= 70 ? 'bg-success-500' : bucket.accuracy >= 40 ? 'bg-warning-500' : 'bg-danger-500',
        ].join(' ')}
        style={{ width: `${bucket.accuracy}%` }}
      />
    </div>
  </div>
);

const ReviewItem = ({ item }) => (
  <article className="rounded-lg border border-surface-100 bg-white p-4">
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={item.correct ? 'success' : 'danger'} style="tag" size="sm">
        {item.correct ? '정답' : `오답 Q${item.number}`}
      </Badge>
      <Badge tone="neutral" style="tag" size="sm">{item.skillTag}</Badge>
    </div>
    <h4 className="mt-3 text-sm font-black leading-relaxed text-surface-900">{item.prompt}</h4>
    <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
      <p className={item.correct ? 'font-bold text-success-700' : 'font-bold text-danger-700'}>
        내 답: {item.selectedAnswer}
      </p>
      <p className="font-bold text-surface-800">
        정답: {item.correctAnswer}
      </p>
    </div>
    <div className="mt-3 rounded-md border border-brand-100 bg-brand-50 p-3">
      <p className="text-xs font-black uppercase tracking-widest text-brand-500">AI 피드백</p>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-brand-950">{item.explanationKo}</p>
    </div>
  </article>
);

export default function ToeflReadingReport({
  title,
  subtitle,
  taskLabel,
  items,
  results,
  correctCount,
  totalCount,
  targetScore,
  topicTags = [],
  score = {},
  scoreLabel,
  scoreFootnote,
  onExit,
}) {
  const report = useMemo(() => buildToeflReadingReport({
    items,
    results,
    correctCount,
    totalCount,
    targetScore,
    topicTags,
    score,
  }), [items, results, correctCount, totalCount, targetScore, topicTags, score]);

  const primaryScoreValue = scoreLabel ? (score.value ?? score.band ?? '-') : `${report.metrics.accuracy}%`;
  const difficultyLabel = formatToeflDifficultyLabel(targetScore);

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-5 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-2xs font-black uppercase tracking-widest text-brand-500">{taskLabel || 'TOEFL Reading'}</p>
          <h2 className="mt-1 text-2xl font-black text-surface-900 tracking-tight">{title}</h2>
          <p className="mt-1 text-sm font-bold text-surface-500">{subtitle}</p>
        </div>
        <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
      </div>

      <section className="space-y-4" aria-labelledby="reading-report-metrics">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-600" aria-hidden="true" />
          <h3 id="reading-report-metrics" className="text-lg font-black text-surface-900 tracking-tight">정량 지표</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile icon={Target} label="정답률" value={`${report.metrics.accuracy}%`} caption={`${report.metrics.correctCount}/${report.metrics.totalCount} 정답`} tone="brand" />
          <MetricTile icon={CheckCircle} label="맞힌 문항" value={report.metrics.correctCount} caption="누적 통계 반영" tone="success" />
          <MetricTile icon={XCircle} label="틀린 문항" value={report.metrics.wrongCount} caption="오답 리뷰 대상" tone={report.metrics.wrongCount > 0 ? 'danger' : 'surface'} />
          <MetricTile icon={Target} label={scoreLabel || '난이도'} value={scoreLabel ? primaryScoreValue : difficultyLabel} caption={scoreLabel ? scoreFootnote : '사용자 설정 난이도'} tone="surface" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="rounded-lg border border-surface-100 bg-surface-50 p-5">
          <h3 className="text-base font-black text-surface-900 tracking-tight">Skill별 정답률</h3>
          <div className="mt-4 space-y-4">
            {report.skillBreakdown.map((bucket) => (
              <BreakdownRow key={bucket.label} bucket={bucket} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-brand-100 bg-brand-50 p-5">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-700" aria-hidden="true" />
            <h3 className="text-base font-black text-brand-950 tracking-tight">AI 피드백</h3>
          </div>
          <p className="mt-3 text-sm font-black leading-relaxed text-brand-950">{report.feedback.headline}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-brand-900">{report.feedback.detail}</p>
          <ul className="mt-4 space-y-2">
            {report.feedback.nextSteps.map((step) => (
              <li key={step} className="flex gap-2 text-sm font-semibold leading-relaxed text-brand-900">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-brand-500" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="reading-report-wrong-items">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger-500" aria-hidden="true" />
            <h3 id="reading-report-wrong-items" className="text-lg font-black text-surface-900 tracking-tight">오답 리뷰</h3>
          </div>
          <Badge tone={report.wrongItems.length > 0 ? 'danger' : 'success'} style="tag" size="sm">
            {report.wrongItems.length > 0 ? `${report.wrongItems.length}개 확인` : '오답 없음'}
          </Badge>
        </div>

        {report.wrongItems.length > 0 ? (
          <div className="space-y-3">
            {report.wrongItems.map((item) => (
              <ReviewItem key={`${item.id}-${item.number}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-success-100 bg-success-50 p-5">
            <p className="text-sm font-bold leading-relaxed text-success-800">
              이번 세트에서는 틀린 문항이 없습니다. 아래 skill별 정답률을 기준으로 다음 세트 난이도를 조금 올려도 좋습니다.
            </p>
          </div>
        )}
      </section>

      {report.topicBreakdown.length > 0 && (
        <section className="space-y-3" aria-label="Topic별 정답률">
          <h3 className="text-base font-black text-surface-900 tracking-tight">Topic별 정답률</h3>
          <div className="flex flex-wrap gap-2">
            {report.topicBreakdown.map((topic) => (
              <Badge key={topic.label} tone="neutral" style="tag" size="sm">
                {topic.label} · {topic.correct}/{topic.total}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
