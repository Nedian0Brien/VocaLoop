/**
 * 학습 큐 알고리즘
 * 오답 시 뒤로 밀기, 정답 시 제거 로직
 */

/**
 * 학습 큐 초기화
 * @param {Array} words - 단어 배열
 * @returns {Object} - 초기화된 큐 상태
 */
export function initializeQueue(words) {
  return {
    queue: [...words],
    currentIndex: 0,
    answeredWords: [],
    consecutiveWrong: 0,
    consecutiveCorrect: 0,
    stats: {
      correct: 0,
      wrong: 0,
      total: 0
    }
  };
}

/**
 * 다음 문제 가져오기
 * @param {Object} state - 현재 큐 상태
 * @returns {Object|null} - 다음 단어 또는 null
 */
export function getNextQuestion(state) {
  if (state.queue.length === 0) {
    return null;
  }
  return state.queue[state.currentIndex];
}

/**
 * 정답 처리
 * @param {Object} state - 현재 큐 상태
 * @param {String} wordId - 정답 처리할 단어 ID
 * @returns {Object} - 업데이트된 큐 상태
 */
export function handleCorrect(state, wordId) {
  const currentWord = state.queue[state.currentIndex];
  const newQueue = [...state.queue];

  // 현재 단어를 큐에서 제거
  newQueue.splice(state.currentIndex, 1);

  // answeredWords에 추가
  const answeredWords = [...state.answeredWords, currentWord];

  // 통계 업데이트
  const stats = {
    correct: state.stats.correct + 1,
    wrong: state.stats.wrong,
    total: state.stats.total + 1
  };

  // 연속 정답 증가, 연속 오답 초기화
  const consecutiveCorrect = state.consecutiveCorrect + 1;
  const consecutiveWrong = 0;

  // 인덱스 조정 (큐에서 제거했으므로)
  let currentIndex = state.currentIndex;
  if (currentIndex >= newQueue.length && newQueue.length > 0) {
    currentIndex = 0;
  }

  return {
    queue: newQueue,
    currentIndex,
    answeredWords,
    consecutiveWrong,
    consecutiveCorrect,
    stats
  };
}

/**
 * 오답 처리
 * @param {Object} state - 현재 큐 상태
 * @param {String} wordId - 오답 처리할 단어 ID
 * @returns {Object} - 업데이트된 큐 상태
 */
export function handleWrong(state, wordId) {
  const currentWord = state.queue[state.currentIndex];
  const newQueue = [...state.queue];

  // 현재 단어를 큐에서 제거하고 뒤에 추가
  newQueue.splice(state.currentIndex, 1);
  newQueue.push(currentWord);

  // 통계 업데이트
  const stats = {
    correct: state.stats.correct,
    wrong: state.stats.wrong + 1,
    total: state.stats.total + 1
  };

  // 연속 오답 증가, 연속 정답 초기화
  const consecutiveWrong = state.consecutiveWrong + 1;
  const consecutiveCorrect = 0;

  // 인덱스 조정
  let currentIndex = state.currentIndex;
  if (currentIndex >= newQueue.length) {
    currentIndex = 0;
  }

  return {
    queue: newQueue,
    currentIndex,
    answeredWords: state.answeredWords,
    consecutiveWrong,
    consecutiveCorrect,
    stats
  };
}

/**
 * Study Break 필요 여부 확인
 * @param {Object} state - 현재 큐 상태
 * @returns {Boolean} - Study Break 필요 여부
 */
export function checkStudyBreak(state) {
  // 3회 연속 오답 시 true 반환
  return state.consecutiveWrong >= 3;
}

/**
 * 큐가 완료되었는지 확인
 * @param {Object} state - 현재 큐 상태
 * @returns {Boolean} - 큐 완료 여부
 */
export function isQueueComplete(state) {
  return state.queue.length === 0;
}

/**
 * 진행률 계산
 * @param {Object} state - 현재 큐 상태
 * @param {Number} totalWords - 전체 단어 수
 * @returns {Number} - 진행률 (0-100)
 */
export function getProgress(state, totalWords) {
  if (totalWords === 0) return 0;
  return Math.round((state.answeredWords.length / totalWords) * 100);
}
