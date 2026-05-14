import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, FileText, Loader2, RotateCw } from './Icons';
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <section className="relative overflow-hidden rounded-3xl bg-surface-900 text-white shadow-[var(--shadow-elevated)]">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-pill bg-brand-500/20 blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-pill bg-accent-500/15 blur-[80px]" />

        <div className="relative grid grid-cols-1 gap-8 p-7 sm:p-9 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-10">
          <div className="max-w-3xl">
            <Badge tone="brand" style="dot" size="md" className="mb-5">Review System</Badge>
            <div className="flex items-start gap-5">
              <div className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-brand-100 ring-1 ring-white/10 sm:grid">
                <RotateCw className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Review Queue
                </h2>
                <p className="mt-4 max-w-2xl text-base font-bold leading-relaxed text-surface-300">
                  오늘 볼 오답, 아직 진행 중인 약점, 저장해둔 TOEFL 세트를 한 화면에서 정리합니다.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="primary"
                size="lg"
                leftIcon={RotateCw}
                disabled={!metrics.nextItem}
                onClick={() => metrics.nextItem && setSelectedReviewItem(metrics.nextItem)}
              >
                오늘 복습 시작
              </Button>
              <Button
                variant="secondary"
                size="lg"
                leftIcon={FileText}
                onClick={() => setActiveTab('saved')}
                disabled={metrics.saved === 0}
                className="!bg-white/10 !text-white hover:!bg-white/15"
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

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-2xs font-black uppercase tracking-widest text-brand-100">Today's load</p>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-6xl font-black tracking-tight tabular-nums text-white">{metrics.due}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-widest text-surface-300">due items</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black tabular-nums text-white">{metrics.masteryRate}%</p>
                <p className="mt-1 text-2xs font-black uppercase tracking-widest text-surface-400">mastery</p>
              </div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-pill bg-black/25">
              <div
                className="h-full rounded-pill bg-brand-400 transition-all duration-700"
                style={{ width: `${Math.min(metrics.masteryRate, 100)}%` }}
              />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black tabular-nums">{metrics.active}</p>
                <p className="text-2xs font-black uppercase tracking-widest text-surface-400">active</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black tabular-nums">{metrics.saved}</p>
                <p className="text-2xs font-black uppercase tracking-widest text-surface-400">saved</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black tabular-nums">{metrics.mastered}</p>
                <p className="text-2xs font-black uppercase tracking-widest text-surface-400">done</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <Card variant="outlined" radius="card" padding="md" className="!border-danger-200 bg-danger-50">
          <p className="text-sm font-bold text-danger-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
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
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
            />
          )}
        </div>

        <aside className="space-y-5">
          <Card variant="elevated" radius="card" padding="lg" className="!p-6">
            <SectionHeading
              icon={Clock}
              tone="indigo"
              title="Review rhythm"
              subtitle="복습 큐 상태"
              className="!mb-6 !px-0"
            />
            <div className="space-y-3">
              <div className="rounded-2xl border border-surface-100 bg-surface-50 p-4">
                <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Priority</p>
                <p className="mt-1 text-xl font-black text-surface-900">
                  {metrics.due > 0 ? `${metrics.due} due today` : 'No due items'}
                </p>
              </div>
              <div className="rounded-2xl border border-surface-100 bg-surface-50 p-4">
                <p className="text-2xs font-black uppercase tracking-widest text-surface-400">Queue shape</p>
                <p className="mt-1 text-sm font-bold leading-relaxed text-surface-600">
                  {metrics.active > 0
                    ? `${metrics.active} active mistakes remain before they move into mastered.`
                    : 'Active mistakes will appear here after TOEFL attempts.'}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat title="Due Today" value={metrics.due} subValue="items" icon={Clock} tone="brand" />
            <Stat title="Saved Sets" value={metrics.saved} subValue="sets" icon={FileText} tone="accent" />
          </div>

          <Card variant="outlined" radius="card" padding="lg" className="!border-dashed !p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-success-50 text-success-600">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black text-surface-900">Mastered</p>
                <p className="text-xs font-bold text-surface-400">{metrics.mastered} review items</p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
