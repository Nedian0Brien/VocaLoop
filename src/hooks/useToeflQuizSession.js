import { useEffect, useState } from 'react';
import { pickRandomTopics, sampleWords } from '../utils/topicSets';

const buildGenerationContext = (vocabSource, topicSelection) => {
  const vocabularyWords =
    vocabSource && vocabSource.mode !== 'off' && Array.isArray(vocabSource.pool)
      ? sampleWords(vocabSource.pool, vocabSource.sampleSize || 12)
      : [];

  const pickedTopics =
    topicSelection?.enabled && Array.isArray(topicSelection.allTopics) && topicSelection.selectedIds?.length > 0
      ? pickRandomTopics(topicSelection.allTopics, topicSelection.selectedIds, topicSelection.pickCount || 1)
      : [];

  return {
    pickedTopics,
    vocabSampleCount: vocabularyWords.length,
    vocabularyWords,
  };
};

const getReviewContext = (reviewAsset) => ({
  pickedTopics: reviewAsset?.metadata?.pickedTopics || [],
  vocabSampleCount: reviewAsset?.metadata?.vocabSampleCount || 0,
});

export function useToeflQuizSession({
  reviewAsset,
  vocabSource,
  topicSelection,
  onAssetCreated,
  resetSession,
  loadReview,
  generateNew,
  buildAsset,
  onReady,
  errorMessage = '문제 생성 중 오류가 발생했습니다.',
  dependencies = [],
}) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [activeAsset, setActiveAsset] = useState(reviewAsset);
  const [sessionContext, setSessionContext] = useState({ pickedTopics: [], vocabSampleCount: 0 });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      setStatus('loading');
      setError('');
      setActiveAsset(reviewAsset || null);
      resetSession?.();

      if (reviewAsset) {
        try {
          const reviewData = loadReview(reviewAsset);
          const context = getReviewContext(reviewAsset);
          if (!isActive) return;
          setSessionContext(context);
          onReady(reviewData, { activeAsset: reviewAsset, context, isReview: true });
          setStatus('ready');
        } catch (err) {
          if (!isActive) return;
          setError(err.message || errorMessage);
          setStatus('error');
        }
        return;
      }

      const generationContext = buildGenerationContext(vocabSource, topicSelection);
      setSessionContext({
        pickedTopics: generationContext.pickedTopics,
        vocabSampleCount: generationContext.vocabSampleCount,
      });

      try {
        const data = await generateNew(generationContext);
        const assetPayload = buildAsset?.(data, generationContext);
        const savedAsset = assetPayload ? await onAssetCreated?.(assetPayload) : null;
        if (!isActive) return;
        if (savedAsset) setActiveAsset(savedAsset);
        onReady(data, { activeAsset: savedAsset || null, context: generationContext, isReview: false });
        setStatus('ready');
      } catch (err) {
        if (!isActive) return;
        setError(err.message || errorMessage);
        setStatus('error');
      }
    };

    loadSession();
    return () => {
      isActive = false;
    };
  }, [...dependencies, reloadKey]);

  return {
    activeAsset,
    error,
    reload: () => setReloadKey((key) => key + 1),
    sessionContext,
    setStatus,
    status,
  };
}
