import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronRight, Clock, FileText, RotateCw } from './Icons';
import { TOEFL_MODE_TITLES } from './quizModeRegistry';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'saved', label: 'Saved' },
  { id: 'mastered', label: 'Mastered' },
];

const statusCopy = {
  new: 'Needs review',
  reviewing: 'In rotation',
  mastered: 'Mastered',
};

const statusClasses = {
  new: 'border-danger-200 bg-danger-50 text-danger-700',
  reviewing: 'border-warning-200 bg-warning-50 text-warning-700',
  mastered: 'border-success-200 bg-success-50 text-success-700',
};

const statusAccentClasses = {
  new: 'bg-danger-400',
  reviewing: 'bg-warning-400',
  mastered: 'bg-success-400',
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
      'group relative w-full overflow-hidden rounded-xl border border-surface-200 bg-white px-4 py-4 text-left',
      'shadow-[var(--shadow-soft)] transition-all duration-300',
      'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    ].join(' ')}
  >
    <span className={`absolute inset-y-0 left-0 w-1 ${statusAccentClasses[item?.status] || 'bg-surface-300'}`} aria-hidden="true" />
    <div className="flex items-start gap-3 pl-2">
      <RotateCw className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-md border px-2 py-1 font-semibold ${statusClasses[item?.status] || 'border-surface-200 bg-surface-50 text-surface-600'}`}>
            {statusCopy[item?.status] || 'Review'}
          </span>
          <span className="font-medium text-surface-500">
            Due {formatDate(item?.dueAt)}
          </span>
        </div>
        <p className="text-base font-semibold leading-snug text-surface-900">{item?.title || modeLabel(item?.mode)}</p>
        <p className="mt-2 truncate text-sm font-medium text-surface-500">
          {modeLabel(item?.mode)}{item?.skillTag ? ` / ${item.skillTag}` : ''}
        </p>
      </div>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-surface-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-500" aria-hidden="true" />
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
        'group relative w-full overflow-hidden rounded-xl border border-surface-200 bg-white px-4 py-4 text-left',
        'shadow-[var(--shadow-soft)] transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
      ].join(' ')}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-brand-400" aria-hidden="true" />
      <div className="flex items-start gap-3 pl-2">
        <FileText className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 font-semibold text-brand-700">Saved</span>
            <span className="font-medium text-surface-500">{formatDate(createdAt)}</span>
          </div>
          <p className="text-base font-semibold leading-snug text-surface-900">{asset?.title || modeLabel(asset?.mode)}</p>
          <p className="mt-2 text-sm font-medium text-surface-500">{modeLabel(asset?.mode)}</p>
        </div>
        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-surface-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-500" aria-hidden="true" />
      </div>
    </button>
  );
};

const EmptyState = ({ tab }) => {
  const state = {
    today: {
      title: '오늘 복습할 TOEFL 오답이 없습니다.',
      hint: '새 오답이 생기거나 due 날짜가 돌아오면 이곳에 표시됩니다.',
    },
    mistakes: {
      title: '아직 활성화된 오답 노트가 없습니다.',
      hint: 'TOEFL 문제를 풀고 틀린 항목이 생기면 자동으로 큐에 들어옵니다.',
    },
    saved: {
      title: '아직 저장된 TOEFL 문제가 없습니다.',
      hint: '문제를 생성한 뒤 저장하면 다시 풀 수 있는 세트가 이곳에 쌓입니다.',
    },
    mastered: {
      title: '마스터한 복습 항목이 아직 없습니다.',
      hint: '이해 완료로 처리한 항목은 여기에 보관됩니다.',
    },
  }[tab];

  return (
    <div className="rounded-xl border border-dashed border-surface-300 bg-white p-8">
      <p className="text-base font-semibold text-surface-800">{state.title}</p>
      <p className="mt-2 max-w-[46ch] text-sm leading-6 text-surface-500">{state.hint}</p>
    </div>
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
    <section className="overflow-hidden rounded-2xl border border-surface-200 bg-surface-50 shadow-[var(--shadow-card)]">
      <div className="border-b border-surface-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <RotateCw className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div>
              <h3 className="text-2xl font-semibold text-surface-900">Review workspace</h3>
              <p className="mt-1 text-sm font-medium text-surface-500">
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
                    'h-10 rounded-lg border px-4 text-sm font-semibold transition-all duration-200 active:scale-[0.98]',
                    selected
                      ? 'border-surface-900 bg-surface-900 text-white shadow-[var(--shadow-soft)]'
                      : 'border-surface-200 bg-white text-surface-500 hover:border-brand-200 hover:text-brand-700',
                  ].join(' ')}
                >
                  {tab.label} {counts[tab.id] > 0 ? counts[tab.id] : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="border-b border-surface-200 bg-white/60 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2">
            <ActiveIcon className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-surface-700">
              {TABS.find((tab) => tab.id === activeTab)?.label}
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {TABS.map((tab) => (
              <div key={tab.id} className="rounded-lg border border-surface-200 bg-white px-3 py-3">
                <p className="text-sm font-medium text-surface-500">{tab.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-surface-900">{counts[tab.id]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
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
