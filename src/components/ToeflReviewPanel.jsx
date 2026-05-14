import React, { useMemo, useState } from 'react';
import { TOEFL_MODE_TITLES } from './quizModeRegistry';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'saved', label: 'Saved' },
  { id: 'mastered', label: 'Mastered' },
];

const statusClasses = {
  new: 'text-danger-700',
  reviewing: 'text-warning-700',
  mastered: 'text-success-700',
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

const metadataLine = (item) => [modeLabel(item?.mode), item?.skillTag].filter(Boolean).join(' / ');

const ReviewItem = ({ item, onSelect }) => (
  <button
    onClick={() => onSelect?.(item)}
    aria-label={`${item?.title || 'TOEFL review'} 오답 복습`}
    className={[
      'grid w-full grid-cols-1 gap-3 border-b border-surface-100 px-4 py-4 text-left',
      'transition-colors duration-150 last:border-b-0 hover:bg-surface-50',
      'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-surface-900',
      'md:grid-cols-[minmax(0,1fr)_132px_104px_72px] md:items-center',
    ].join(' ')}
  >
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-surface-900">{item?.title || modeLabel(item?.mode)}</p>
      <p className="mt-1 truncate text-sm text-surface-500">{metadataLine(item)}</p>
    </div>
    <p className="text-sm text-surface-600 md:text-right">{formatDate(item?.dueAt)}</p>
    <p className={`text-sm font-medium ${statusClasses[item?.status] || 'text-surface-600'}`}>
      {item?.status || 'review'}
    </p>
    <p className="text-sm font-medium text-surface-900 md:text-right">Open</p>
  </button>
);

const SavedAssetItem = ({ asset, onSelect }) => {
  const createdAt = asset?.createdAt || asset?.created_at;
  return (
    <button
      onClick={() => onSelect?.(asset)}
      aria-label={`${asset?.title || modeLabel(asset?.mode)} 복습하기`}
      className={[
        'grid w-full grid-cols-1 gap-3 border-b border-surface-100 px-4 py-4 text-left',
        'transition-colors duration-150 last:border-b-0 hover:bg-surface-50',
        'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-surface-900',
        'md:grid-cols-[minmax(0,1fr)_132px_104px_72px] md:items-center',
      ].join(' ')}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-surface-900">{asset?.title || modeLabel(asset?.mode)}</p>
        <p className="mt-1 truncate text-sm text-surface-500">{modeLabel(asset?.mode)}</p>
      </div>
      <p className="text-sm text-surface-600 md:text-right">{formatDate(createdAt)}</p>
      <p className="text-sm font-medium text-surface-600">saved</p>
      <p className="text-sm font-medium text-surface-900 md:text-right">Open</p>
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
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-surface-500">{copy}</p>
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

  return (
    <section className="overflow-hidden rounded-lg border border-surface-200 bg-white">
      <div className="border-b border-surface-200 px-4">
        <div className="flex gap-5 overflow-x-auto" role="tablist" aria-label="TOEFL review views">
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
                  'h-12 shrink-0 border-b-2 text-sm font-medium transition-colors duration-150',
                  selected
                    ? 'border-surface-900 text-surface-900'
                    : 'border-transparent text-surface-500 hover:text-surface-900',
                ].join(' ')}
              >
                {tab.label} {counts[tab.id] > 0 ? counts[tab.id] : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(0,1fr)_132px_104px_72px] border-b border-surface-100 bg-surface-50 px-4 py-2 text-sm font-medium text-surface-600 md:grid">
        <p>Item</p>
        <p className="text-right">{activeTab === 'saved' ? 'Created' : 'Due'}</p>
        <p>Status</p>
        <p className="text-right">Action</p>
      </div>

      <div>
        {activeTab === 'saved' ? (
          toeflAssets.length > 0
            ? toeflAssets.slice(0, 12).map((asset) => (
              <SavedAssetItem key={asset.id} asset={asset} onSelect={onSelectToeflAsset} />
            ))
            : <EmptyState tab="saved" />
        ) : (
          grouped[activeTab]?.length > 0
            ? grouped[activeTab].slice(0, 12).map((item) => (
              <ReviewItem key={item.id} item={item} onSelect={onSelectReviewItem} />
            ))
            : <EmptyState tab={activeTab} />
        )}
      </div>
    </section>
  );
}
