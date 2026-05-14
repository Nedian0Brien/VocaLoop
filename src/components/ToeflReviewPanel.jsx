import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronRight, Clock, FileText, RotateCw } from './Icons';
import { Badge, Card } from '../design-system';
import { TOEFL_MODE_TITLES } from './quizModeRegistry';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'saved', label: 'Saved' },
  { id: 'mastered', label: 'Mastered' },
];

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

const isDue = (item) => {
  if (!item?.dueAt || item.status === 'mastered') return false;
  return new Date(item.dueAt).getTime() <= Date.now();
};

const ReviewItem = ({ item, onSelect }) => (
  <button
    onClick={() => onSelect?.(item)}
    aria-label={`${item?.title || 'TOEFL review'} 오답 복습`}
    className={[
      'group w-full rounded-2xl border border-surface-100 bg-white p-5 text-left',
      'shadow-[var(--shadow-soft)] transition-all duration-300',
      'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-card-hover)]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    ].join(' ')}
  >
    <div className="flex items-start gap-4">
      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <RotateCw className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[item?.status] || 'neutral'} size="xs">{item?.status || 'review'}</Badge>
          <span className="text-2xs font-black uppercase tracking-widest text-surface-400">
            Due {formatDate(item?.dueAt)}
          </span>
        </div>
        <p className="text-base font-black leading-tight text-surface-900">{item?.title || modeLabel(item?.mode)}</p>
        <p className="mt-2 truncate text-xs font-black uppercase tracking-widest text-surface-400">
          {modeLabel(item?.mode)}{item?.skillTag ? ` / ${item.skillTag}` : ''}
        </p>
      </div>
      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-surface-300 transition-all group-hover:translate-x-1 group-hover:text-brand-500" aria-hidden="true" />
    </div>
  </button>
);

const SavedAssetItem = ({ asset, onSelect }) => {
  const createdAt = asset?.createdAt || asset?.created_at;
  return (
    <button
      onClick={() => onSelect?.(asset)}
      aria-label={`${asset?.title || modeLabel(asset?.mode)} 복습하기`}
      className={[
        'group w-full rounded-2xl border border-surface-100 bg-white p-5 text-left',
        'shadow-[var(--shadow-soft)] transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-[var(--shadow-card-hover)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="brand" size="xs">Saved</Badge>
            <span className="text-2xs font-black uppercase tracking-widest text-surface-400">{formatDate(createdAt)}</span>
          </div>
          <p className="text-base font-black leading-tight text-surface-900">{asset?.title || modeLabel(asset?.mode)}</p>
          <p className="mt-2 text-xs font-black uppercase tracking-widest text-surface-400">{modeLabel(asset?.mode)}</p>
        </div>
        <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-surface-300 transition-all group-hover:translate-x-1 group-hover:text-brand-500" aria-hidden="true" />
      </div>
    </button>
  );
};

const EmptyState = ({ tab }) => {
  const copy = {
    today: '오늘 복습할 TOEFL 오답이 없습니다.',
    mistakes: '아직 활성화된 오답 노트가 없습니다.',
    saved: '아직 저장된 TOEFL 문제가 없습니다.',
    mastered: '마스터한 복습 항목이 아직 없습니다.',
  }[tab];
  return (
    <Card variant="outlined" radius="card" padding="lg" className="text-center !border-dashed">
      <p className="text-surface-400 text-sm font-bold leading-relaxed">{copy}</p>
    </Card>
  );
};

export default function ToeflReviewPanel({
  reviewItems = [],
  toeflAssets = [],
  onSelectReviewItem,
  onSelectToeflAsset,
  activeTab: controlledActiveTab,
  onActiveTabChange,
}) {
  const [internalActiveTab, setInternalActiveTab] = useState('today');
  const activeTab = controlledActiveTab || internalActiveTab;
  const setActiveTab = (tab) => {
    setInternalActiveTab(tab);
    onActiveTabChange?.(tab);
  };
  const grouped = useMemo(() => {
    const active = reviewItems.filter((item) => item.status !== 'mastered');
    return {
      today: active.filter(isDue),
      mistakes: active,
      mastered: reviewItems.filter((item) => item.status === 'mastered'),
    };
  }, [reviewItems]);

  const counts = {
    today: grouped.today.length,
    mistakes: grouped.mistakes.length,
    saved: toeflAssets.length,
    mastered: grouped.mastered.length,
  };

  const iconByTab = {
    today: Clock,
    mistakes: AlertTriangle,
    saved: FileText,
    mastered: CheckCircle,
  };
  const ActiveIcon = iconByTab[activeTab] || RotateCw;

  return (
    <section className="overflow-hidden rounded-3xl border border-surface-100 bg-surface-50/70 shadow-[var(--shadow-card)]">
      <div className="border-b border-surface-100 bg-white p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600 shadow-[var(--shadow-soft)]">
              <RotateCw className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-surface-900">Review workspace</h3>
              <p className="mt-1 text-sm font-bold text-surface-400">
                {counts.today} due today / {counts.mistakes} active / {counts.saved} saved
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="tablist" aria-label="TOEFL review views">
            {TABS.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'h-10 rounded-xl border px-4 text-2xs font-black uppercase tracking-widest transition-all',
                    selected
                      ? 'border-surface-900 bg-surface-900 text-white shadow-[var(--shadow-soft)]'
                      : 'border-surface-100 bg-white text-surface-500 hover:border-brand-200 hover:text-brand-700',
                  ].join(' ')}
                >
                  {tab.label} {counts[tab.id] > 0 ? counts[tab.id] : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border-b border-surface-100 bg-white/50 p-5 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center gap-2 lg:block">
            <ActiveIcon className="h-5 w-5 text-brand-600 lg:mb-4" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-widest text-surface-500">
              {TABS.find((tab) => tab.id === activeTab)?.label}
            </p>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 lg:grid-cols-1">
            {TABS.map((tab) => (
              <div key={tab.id} className="rounded-xl border border-surface-100 bg-white px-3 py-3">
                <p className="text-2xs font-black uppercase tracking-widest text-surface-400">{tab.label}</p>
                <p className="mt-1 text-lg font-black tabular-nums text-surface-900">{counts[tab.id]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 lg:p-7">
          <div className={activeTab === 'saved' ? 'grid grid-cols-1 xl:grid-cols-2 gap-4' : 'space-y-4'}>
            {activeTab === 'saved' ? (
              toeflAssets.length > 0
                ? toeflAssets.slice(0, 8).map((asset) => (
                  <SavedAssetItem key={asset.id} asset={asset} onSelect={onSelectToeflAsset} />
                ))
                : <EmptyState tab="saved" />
            ) : (
              grouped[activeTab]?.length > 0
                ? grouped[activeTab].slice(0, 8).map((item) => (
                  <ReviewItem key={item.id} item={item} onSelect={onSelectReviewItem} />
                ))
                : <EmptyState tab={activeTab} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
