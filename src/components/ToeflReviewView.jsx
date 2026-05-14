import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from './Icons';
import ToeflReviewDetail from './ToeflReviewDetail';
import ToeflReviewPanel from './ToeflReviewPanel';
import { getToeflAsset, listToeflAssets } from '../services/toeflAssetApi';
import { listToeflReviewItems, updateToeflReviewItem } from '../services/toeflReviewApi';

const getAssetId = (item) => item?.assetId || item?.asset_id;

const isDue = (item) => {
  if (!item?.dueAt || item.status === 'mastered') return false;
  return new Date(item.dueAt).getTime() <= Date.now();
};

const actionButtonClass = [
  'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium',
  'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface-900',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

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
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="border-b border-surface-200 pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-surface-900">Review</h2>
            <p className="mt-1 text-sm text-surface-600">
              TOEFL 오답과 저장 문제를 복습합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${actionButtonClass} bg-surface-900 text-white hover:bg-surface-800`}
              disabled={!metrics.nextItem}
              onClick={() => metrics.nextItem && setSelectedReviewItem(metrics.nextItem)}
            >
              오늘 복습 시작
            </button>
            <button
              type="button"
              className={`${actionButtonClass} border border-surface-300 bg-white text-surface-900 hover:bg-surface-50`}
              onClick={() => setActiveTab('saved')}
              disabled={metrics.saved === 0}
            >
              저장 문제
            </button>
            <button
              type="button"
              className={`${actionButtonClass} border border-surface-300 bg-white text-surface-900 hover:bg-surface-50`}
              onClick={() => loadReviewData()}
              disabled={isLoading}
            >
              새로고침
            </button>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 border border-surface-200 bg-white md:grid-cols-4">
          <div className="border-b border-r border-surface-200 p-4 md:border-b-0">
            <dt className="text-sm text-surface-500">Due today</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-surface-900">{metrics.due}</dd>
          </div>
          <div className="border-b border-surface-200 p-4 md:border-b-0 md:border-r">
            <dt className="text-sm text-surface-500">Active mistakes</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-surface-900">{metrics.active}</dd>
          </div>
          <div className="border-r border-surface-200 p-4">
            <dt className="text-sm text-surface-500">Saved sets</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-surface-900">{metrics.saved}</dd>
          </div>
          <div className="p-4">
            <dt className="text-sm text-surface-500">Mastered</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-surface-900">{metrics.mastered}</dd>
          </div>
        </dl>
      </div>

      {error && (
        <div className="rounded-md border border-danger-200 bg-danger-50 px-4 py-3">
          <p className="text-sm font-medium text-danger-700">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-surface-200 bg-white px-4 py-12 text-center">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-surface-500" aria-hidden="true" />
          <p className="text-sm text-surface-600">Review 데이터를 불러오는 중입니다.</p>
        </div>
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
  );
}
