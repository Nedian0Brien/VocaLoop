import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, FileText, Loader2, RotateCw } from './Icons';
import ToeflReviewDetail from './ToeflReviewDetail';
import ToeflReviewPanel from './ToeflReviewPanel';
import { Badge, Button, Card, SectionHeading, Stat } from '../design-system';
import { getToeflAsset, listToeflAssets } from '../services/toeflAssetApi';
import { listToeflReviewItems, updateToeflReviewItem } from '../services/toeflReviewApi';

const getAssetId = (item) => item?.assetId || item?.asset_id;

const isDue = (item) => {
  if (!item?.dueAt || item.status === 'mastered') return false;
  return new Date(item.dueAt).getTime() <= Date.now();
};

export default function ToeflReviewView({ onStartAssetReview }) {
  const [reviewItems, setReviewItems] = useState([]);
  const [toeflAssets, setToeflAssets] = useState([]);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
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
    return {
      due: activeItems.filter(isDue).length,
      active: activeItems.length,
      saved: toeflAssets.length,
      mastered: reviewItems.filter((item) => item.status === 'mastered').length,
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
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-4">
            <Badge tone="brand" style="dot" size="md">Review System</Badge>
            <SectionHeading
              icon={RotateCw}
              tone="brand"
              title="Review Queue"
              subtitle="TOEFL 오답과 저장 문제를 한 곳에서 다시 풀고, 이해도에 따라 복습 간격을 조정합니다."
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => loadReviewData()}
            leftIcon={RotateCw}
            disabled={isLoading}
          >
            새로고침
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat title="Due Today" value={metrics.due} subValue="items" icon={Clock} tone="brand" />
          <Stat title="Active Mistakes" value={metrics.active} subValue="items" icon={AlertTriangle} tone="warning" />
          <Stat title="Saved Problems" value={metrics.saved} subValue="sets" icon={FileText} tone="accent" />
          <Stat title="Mastered" value={metrics.mastered} subValue="items" icon={CheckCircle} tone="success" />
        </div>
      </section>

      {error && (
        <Card variant="outlined" radius="card" padding="md" className="!border-danger-200 bg-danger-50">
          <p className="text-sm font-bold text-danger-600">{error}</p>
        </Card>
      )}

      {isLoading ? (
        <Card variant="elevated" radius="card" padding="xl" className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
          <p className="text-sm font-black text-surface-500">Review 데이터를 불러오는 중입니다...</p>
        </Card>
      ) : (
        <ToeflReviewPanel
          reviewItems={reviewItems}
          toeflAssets={toeflAssets}
          onSelectReviewItem={setSelectedReviewItem}
          onSelectToeflAsset={startAssetReview}
        />
      )}
    </div>
  );
}
