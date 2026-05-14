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
  <Card
    variant="elevated"
    radius="xl"
    padding="sm"
    hover
    as="button"
    onClick={() => onSelect?.(item)}
    aria-label={`${item?.title || 'TOEFL review'} 오답 복습`}
    className="group !p-5 w-full text-left"
  >
    <div className="flex items-center justify-between gap-3 mb-3">
      <Badge tone={statusTone[item?.status] || 'neutral'} size="xs">{item?.status || 'review'}</Badge>
      <span className="text-2xs font-black uppercase tracking-widest text-surface-400">
        Due {formatDate(item?.dueAt)}
      </span>
    </div>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-black text-surface-800 truncate">{item?.title || modeLabel(item?.mode)}</p>
        <p className="mt-1 text-2xs font-black uppercase tracking-widest text-surface-400 truncate">
          {modeLabel(item?.mode)}{item?.skillTag ? ` · ${item.skillTag}` : ''}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 group-hover:text-brand-500 transition-all shrink-0" aria-hidden="true" />
    </div>
  </Card>
);

const SavedAssetItem = ({ asset, onSelect }) => {
  const createdAt = asset?.createdAt || asset?.created_at;
  return (
    <Card
      variant="elevated"
      radius="xl"
      padding="sm"
      hover
      as="button"
      onClick={() => onSelect?.(asset)}
      aria-label={`${asset?.title || modeLabel(asset?.mode)} 복습하기`}
      className="group !p-5 w-full text-left"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xs font-black text-surface-400 uppercase tracking-widest">{formatDate(createdAt)}</span>
        <Badge tone="brand" size="xs">Saved</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-surface-800 truncate">{asset?.title || modeLabel(asset?.mode)}</p>
          <p className="mt-1 text-2xs font-black uppercase tracking-widest text-surface-400">{modeLabel(asset?.mode)}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 group-hover:text-brand-500 transition-all shrink-0" aria-hidden="true" />
      </div>
    </Card>
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
}) {
  const [activeTab, setActiveTab] = useState('today');
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
    <section>
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-10 h-10 rounded-md bg-brand-50 grid place-items-center text-brand-600 shadow-[var(--shadow-soft)]">
          <RotateCw className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl font-black text-surface-900 tracking-tight">TOEFL Review</h3>
          <p className="text-2xs font-black uppercase tracking-widest text-surface-400">
            {counts.today} due today
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5" role="tablist" aria-label="TOEFL review views">
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
                'h-10 rounded-md border text-2xs font-black uppercase tracking-widest transition-all',
                selected
                  ? 'bg-surface-900 text-white border-surface-900 shadow-[var(--shadow-soft)]'
                  : 'bg-white text-surface-500 border-surface-100 hover:border-brand-200 hover:text-brand-700',
              ].join(' ')}
            >
              {tab.label} {counts[tab.id] > 0 ? counts[tab.id] : ''}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-4 px-2">
        <ActiveIcon className="w-4 h-4 text-brand-600" aria-hidden="true" />
        <p className="text-xs font-black uppercase tracking-widest text-surface-500">{TABS.find((tab) => tab.id === activeTab)?.label}</p>
      </div>

      <div className="space-y-4">
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
    </section>
  );
}
