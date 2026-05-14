import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, FileText, RotateCw } from './Icons';
import ToeflReviewDetail from './ToeflReviewDetail';
import ToeflReviewPanel from './ToeflReviewPanel';
import { Button } from '../design-system';
import { getToeflAsset, listToeflAssets } from '../services/toeflAssetApi';
import { listToeflReviewItems, updateToeflReviewItem } from '../services/toeflReviewApi';

const getAssetId = (item) => item?.assetId || item?.asset_id;

const isDue = (item) => {
  if (!item?.dueAt || item.status === 'mastered') return false;
  return new Date(item.dueAt).getTime() <= Date.now();
};

const InsightRow = ({ label, value, detail }) => (
  <div className="border-b border-surface-100 py-4 last:border-b-0">
    <div className="flex items-baseline justify-between gap-4">
      <p className="text-sm font-semibold text-surface-900">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums text-surface-700">{value}</p>
    </div>
    {detail && <p className="mt-1 max-w-[34ch] text-sm leading-6 text-surface-500">{detail}</p>}
  </div>
);

const ReviewSkeleton = () => (
  <section className="rounded-2xl border border-surface-200 bg-white p-6 shadow-[var(--shadow-card)]">
    <div className="flex items-center justify-between gap-4 border-b border-surface-100 pb-5">
      <div>
        <div className="h-4 w-36 rounded-md animate-skeleton" />
        <div className="mt-3 h-3 w-56 rounded-md animate-skeleton" />
      </div>
      <div className="hidden h-9 w-32 rounded-lg animate-skeleton sm:block" />
    </div>
    <div className="mt-6 space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-surface-100 p-4">
          <div className="h-3 w-28 rounded-md animate-skeleton" />
          <div className="mt-3 h-5 w-4/5 rounded-md animate-skeleton" />
          <div className="mt-3 h-3 w-2/5 rounded-md animate-skeleton" />
        </div>
      ))}
    </div>
  </section>
);

export default function ToeflReviewView({ onStartAssetReview }) {
  const [reviewItems, setReviewItems] = useState([]);
  const [toeflAssets, setToeflAssets] = useState([]);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingReviewItem, setIsUpdatingReviewItem] = useState(false);
  const [error, setError] = useState('');

  const loadReviewData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    setError('');

    try {
      const [assets, items] = await Promise.all([
        listToeflAssets({ limit: 50 }),
        listToeflReviewItems({ scope: 'all', limit: 200 }),
      ]);
      setToeflAssets(Array.isArray(assets) ? assets : []);
      setReviewItems(Array.isArray(items) ? items : []);
    } catch (loadError) {
      console.warn('Failed to load TOEFL review data', loadError);
      setError('복습 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      setToeflAssets([]);
      setReviewItems([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviewData();
  }, [loadReviewData]);

  const metrics = useMemo(() => {
    const activeItems = reviewItems.filter((item) => item.status !== 'mastered');
    const dueItems = activeItems.filter(isDue);
    return {
      due: dueItems.length,
      active: activeItems.length,
      saved: toeflAssets.length,
      mastered: reviewItems.filter((item) => item.status === 'mastered').length,
      masteryRate: reviewItems.length > 0
        ? Math.round((reviewItems.filter((item) => item.status === 'mastered').length / reviewItems.length) * 100)
        : 0,
      nextItem: dueItems[0] || activeItems[0] || null,
    };
  }, [reviewItems, toeflAssets]);

  const startAssetReview = useCallback(async (asset) => {
    if (!asset?.id) return;

    try {
      const loadedAsset = asset.payload ? asset : await getToeflAsset(asset.id);
      if (loadedAsset) {
        onStartAssetReview?.(loadedAsset);
      } else {
        setError('저장된 문제를 찾지 못했습니다. 목록을 새로고침해주세요.');
      }
    } catch (loadError) {
      console.warn('Failed to open TOEFL asset for review', loadError);
      setError('저장된 문제를 열지 못했습니다. 다시 시도해주세요.');
    }
  }, [onStartAssetReview]);

  const handleOpenReviewAsset = useCallback(async (item) => {
    const assetId = getAssetId(item);
    if (!assetId) return;
    const existingAsset = toeflAssets.find((asset) => asset.id === assetId);
    await startAssetReview(existingAsset || { id: assetId });
  }, [startAssetReview, toeflAssets]);

  const handleMarkReviewItem = useCallback(async (item, result) => {
    if (!item?.id) return;
    setIsUpdatingReviewItem(true);
    setError('');

    try {
      const updated = await updateToeflReviewItem(item.id, { result });
      setSelectedReviewItem(updated);
      setReviewItems((current) => current.map((candidate) => (
        candidate.id === updated.id ? updated : candidate
      )));
    } catch (updateError) {
      console.warn('Failed to update TOEFL review item', updateError);
      setError('복습 상태를 저장하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsUpdatingReviewItem(false);
    }
  }, []);

  if (selectedReviewItem) {
    return (
      <ToeflReviewDetail
        item={selectedReviewItem}
        onBack={() => setSelectedReviewItem(null)}
        onMark={handleMarkReviewItem}
        onOpenAsset={handleOpenReviewAsset}
        updating={isUpdatingReviewItem}
        backLabel="Review Queue로"
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <section className="review-hero-surface overflow-hidden rounded-3xl border border-surface-800 bg-surface-900 text-white shadow-[0_28px_60px_-32px_rgb(15_23_42_/_0.62)]">
        <div className="relative z-10 grid grid-cols-1 gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-10">
          <div className="max-w-3xl">
            <p className="font-serif text-sm italic text-brand-100">Review system</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-none text-balance text-white sm:text-5xl">
              오답과 저장 문제를 오늘의 복습 큐로 정리합니다.
            </h2>
            <p className="mt-5 max-w-[60ch] text-base font-medium leading-7 text-surface-300 text-pretty">
              Due 항목, 진행 중인 약점, 다시 풀어볼 TOEFL 세트를 한 화면에서 확인하고 바로 복습을 시작합니다.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="secondary"
                size="lg"
                leftIcon={RotateCw}
                disabled={!metrics.nextItem}
                onClick={() => metrics.nextItem && setSelectedReviewItem(metrics.nextItem)}
                className="!bg-white !text-surface-950 !shadow-none hover:!bg-surface-100"
              >
                오늘 복습 시작
              </Button>
              <Button
                variant="ghost"
                size="lg"
                leftIcon={FileText}
                onClick={() => setActiveTab('saved')}
                disabled={metrics.saved === 0}
                className="!text-surface-200 hover:!bg-white/10 hover:!text-white"
              >
                저장 문제 보기
              </Button>
              <Button
                variant="ghost"
                size="lg"
                leftIcon={RotateCw}
                onClick={() => loadReviewData()}
                disabled={isLoading}
                className="!text-surface-200 hover:!bg-white/10 hover:!text-white"
              >
                새로고침
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)]">
            <p className="text-sm font-semibold text-brand-100">Today's load</p>
            <div className="mt-5 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="font-mono text-6xl font-semibold leading-none tabular-nums text-white">{metrics.due}</p>
                <p className="mt-2 text-sm font-medium text-surface-300">due items</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold tabular-nums text-white">{metrics.masteryRate}%</p>
                <p className="mt-1 text-sm font-medium text-surface-400">mastery</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-pill bg-black/25">
              <div
                className="h-full rounded-pill bg-brand-300 transition-all duration-700"
                style={{ width: `${Math.min(metrics.masteryRate, 100)}%` }}
              />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/[0.07] p-3">
                <p className="font-mono text-lg font-semibold tabular-nums">{metrics.active}</p>
                <p className="text-xs font-medium text-surface-400">active</p>
              </div>
              <div className="rounded-xl bg-white/[0.07] p-3">
                <p className="font-mono text-lg font-semibold tabular-nums">{metrics.saved}</p>
                <p className="text-xs font-medium text-surface-400">saved</p>
              </div>
              <div className="rounded-xl bg-white/[0.07] p-3">
                <p className="font-mono text-lg font-semibold tabular-nums">{metrics.mastered}</p>
                <p className="text-xs font-medium text-surface-400">done</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 px-5 py-4">
          <p className="text-sm font-semibold text-danger-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {isLoading ? (
            <ReviewSkeleton />
          ) : (
            <ToeflReviewPanel
              reviewItems={reviewItems}
              toeflAssets={toeflAssets}
              onSelectReviewItem={setSelectedReviewItem}
              onSelectToeflAsset={startAssetReview}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
            />
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 border-b border-surface-100 pb-4">
              <Clock className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold text-surface-900">Review rhythm</h3>
                <p className="text-sm text-surface-500">복습 큐 상태</p>
              </div>
            </div>
            <InsightRow
              label="Priority"
              value={metrics.due > 0 ? `${metrics.due} due` : 'clear'}
              detail={metrics.due > 0 ? '오늘 안에 먼저 볼 오답입니다.' : '오늘 예정된 복습은 없습니다.'}
            />
            <InsightRow
              label="Active mistakes"
              value={metrics.active}
              detail={metrics.active > 0 ? '이해 완료 전까지 큐에 남아 있습니다.' : 'TOEFL 풀이 후 오답이 여기에 쌓입니다.'}
            />
            <InsightRow
              label="Saved sets"
              value={metrics.saved}
              detail="다시 풀 수 있도록 저장된 TOEFL 세트입니다."
            />
          </section>

          <section className="rounded-2xl border border-dashed border-surface-300 bg-surface-50 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-success-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-surface-900">Mastered</p>
                <p className="text-sm text-surface-500">{metrics.mastered} review items</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
