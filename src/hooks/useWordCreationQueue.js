import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { generateWordData } from '../services/geminiService';
import { createWord } from '../services/wordApi';
import { buildFolderIds } from '../services/vocabularyCommandHelpers';

export function useWordCreationQueue({
  onWordSaved,
  showNotification,
  userId,
}) {
  const [jobs, setJobs] = useState([]);
  const callbacksRef = useRef({ onWordSaved, showNotification });
  const mountedRef = useRef(false);
  const queueRef = useRef([]);
  const nextIdRef = useRef(1);
  const sessionGenerationRef = useRef(0);
  const workerActiveRef = useRef(false);
  callbacksRef.current = { onWordSaved, showNotification };

  const syncJobs = useCallback(() => {
    if (mountedRef.current) {
      setJobs(queueRef.current.map((job) => ({ ...job })));
    }
  }, []);

  useLayoutEffect(() => {
    mountedRef.current = true;
    sessionGenerationRef.current += 1;
    queueRef.current = [];
    setJobs([]);
    return () => {
      mountedRef.current = false;
      sessionGenerationRef.current += 1;
      queueRef.current = [];
    };
  }, [userId]);

  const processJob = useCallback(async (job) => {
    try {
      const analysisResult = await generateWordData(job.word, job.aiConfig);
      if (job.sessionGeneration !== sessionGenerationRef.current) return;

      const createdWord = await createWord({
        ...analysisResult,
        folder_id: job.folderId,
        folder_ids: buildFolderIds(job.folderId),
      });
      if (job.sessionGeneration !== sessionGenerationRef.current) return;

      callbacksRef.current.onWordSaved(createdWord);
      callbacksRef.current.showNotification(`'${analysisResult.word || job.word}' ${job.folderName ? `→ ${job.folderName}` : ''} 추가 완료!`);
    } catch (error) {
      if (job.sessionGeneration === sessionGenerationRef.current) {
        callbacksRef.current.showNotification(`'${job.word}' 생성 실패: ${error.message}`, 'error');
      }
    }
  }, []);

  const startWorker = useCallback(() => {
    if (workerActiveRef.current || queueRef.current.length === 0) return;
    workerActiveRef.current = true;

    void (async () => {
      try {
        while (queueRef.current.length > 0) {
          const job = queueRef.current[0];
          job.status = 'processing';
          syncJobs();
          await processJob(job);
          if (queueRef.current[0]?.id === job.id) {
            queueRef.current.shift();
          }
          syncJobs();
        }
      } finally {
        workerActiveRef.current = false;
        if (queueRef.current.length > 0) {
          startWorker();
        }
      }
    })();
  }, [processJob, syncJobs]);

  const enqueue = useCallback(({
    aiConfig,
    folderId,
    folderName = null,
    word,
  }) => {
    const job = {
      id: nextIdRef.current,
      word,
      folderId,
      folderName,
      aiConfig: { ...aiConfig },
      sessionGeneration: sessionGenerationRef.current,
      status: 'queued',
    };
    nextIdRef.current += 1;
    queueRef.current.push(job);
    syncJobs();
    startWorker();
    return job;
  }, [startWorker, syncJobs]);

  const hasPendingJobs = useCallback(() => queueRef.current.length > 0, []);

  return {
    enqueue,
    hasPendingJobs,
    isBusy: jobs.length > 0,
    jobs,
  };
}
