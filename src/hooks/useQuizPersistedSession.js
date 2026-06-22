import { useEffect, useRef } from 'react';

import {
  loadPersistedQuizSession,
  persistQuizSession,
} from '../services/quizSessionStorage';

const load = ({ quizModeById }) => {
  const restoredSessionRef = useRef(undefined);
  if (restoredSessionRef.current === undefined) {
    restoredSessionRef.current = loadPersistedQuizSession({ quizModeById });
  }
  return restoredSessionRef.current;
};

const syncAiMode = ({ aiMode, restoredSession, setAiMode }) => {
  useEffect(() => {
    if (restoredSession && typeof restoredSession.aiMode === 'boolean' && restoredSession.aiMode !== aiMode) {
      setAiMode(restoredSession.aiMode);
    }
    // 마운트 시 복원 상태를 부모 AI 모드에 1회만 반영한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const persist = ({
  adaptiveSession,
  aiMode,
  currentIndex,
  queue,
  quizState,
  selectedMode,
  soundEnabled,
  stats,
  studySetSummaries,
  wordQuizTracker,
}) => {
  useEffect(() => {
    persistQuizSession({
      adaptiveSession,
      aiMode,
      currentIndex,
      modeId: selectedMode?.id,
      queue,
      quizState,
      soundEnabled,
      stats,
      studySetSummaries,
      wordQuizTracker: wordQuizTracker.current,
    });
  }, [quizState, selectedMode, queue, currentIndex, adaptiveSession, studySetSummaries, stats, soundEnabled, aiMode, wordQuizTracker]);
};

export const useQuizPersistedSession = {
  load,
  persist,
  syncAiMode,
};
