/**
 * 학습률 계산 유틸리티
 *
 * 학습률: 0 ~ 100 (퍼센트)
 * 상태 그룹:
 *   - 어려워요 (Difficult): 0 ~ 39  → 빨간색
 *   - 학습 중 (Learning):  40 ~ 79  → 파란색
 *   - 외웠어요 (Memorized): 80 ~ 100 → 초록색
 */

// --- 상태 그룹 상수 ---
export const LEARNING_STATUS = {
  DIFFICULT: 'difficult',   // 어려워요
  LEARNING: 'learning',     // 학습 중
  MEMORIZED: 'memorized',   // 외웠어요
};

export const LEARNING_STATUS_CONFIG = {
  [LEARNING_STATUS.DIFFICULT]: {
    label: '어려워요',
    color: '#EF4444',       // red-500
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
    range: [0, 39],
  },
  [LEARNING_STATUS.LEARNING]: {
    label: '학습 중',
    color: '#3B82F6',       // blue-500
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
    range: [40, 79],
  },
  [LEARNING_STATUS.MEMORIZED]: {
    label: '외웠어요',
    color: '#22C55E',       // green-500
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
    range: [80, 100],
  },
};

// --- 퀴즈 유형별 기본 보상/감소량 ---
const QUIZ_TYPE_WEIGHT = {
  multiple: 1.0,      // 객관식: 기본
  short: 1.4,         // 주관식: 40% 더 높은 보상
  'toefl-complete': 1.8, // Complete-the-Word: 80% 더 높은 보상
};

// --- 학습률 변동 상수 ---
const BASE_CORRECT_GAIN = 12;           // 정답 시 기본 상승량
const FIRST_WRONG_PENALTY = -5;          // 첫 오답: 소량 감소 (입력 실수 감안)
const REPEATED_WRONG_PENALTY = -10;      // 반복 오답: 더 큰 감소
const MAX_WRONG_MULTIPLIER = 3;          // 최대 오답 배수
const REASKED_CORRECT_RECOVERY = 0.6;    // 재출제 정답: 감소분의 60% 복구
const AI_SIMILAR_CORRECT_RECOVERY = 1.0; // AI 유사 문제 정답: 전부 복구 + 소량 향상
const AI_SIMILAR_BONUS = 3;              // AI 유사 문제 추가 보너스

/**
 * 학습률에서 상태 그룹 반환
 * @param {number} rate - 학습률 (0-100)
 * @returns {string} - LEARNING_STATUS 값
 */
export function getLearningStatus(rate) {
  const r = typeof rate === 'number' ? rate : 0;
  if (r >= 80) return LEARNING_STATUS.MEMORIZED;
  if (r >= 40) return LEARNING_STATUS.LEARNING;
  return LEARNING_STATUS.DIFFICULT;
}

/**
 * 학습률에 해당하는 색상 반환 (도넛 그래프용)
 * 부드러운 그라데이션을 위해 구간 내 보간
 * @param {number} rate - 학습률 (0-100)
 * @returns {string} - CSS 색상 값
 */
export function getLearningRateColor(rate) {
  const r = Math.max(0, Math.min(100, rate || 0));

  if (r < 40) {
    // 빨간색 → 파란색 전환 (0~39)
    const t = r / 39;
    return interpolateColor('#EF4444', '#3B82F6', t);
  }
  if (r < 80) {
    // 파란색 → 초록색 전환 (40~79)
    const t = (r - 40) / 39;
    return interpolateColor('#3B82F6', '#22C55E', t);
  }
  // 초록색 (80~100)
  return '#22C55E';
}

/**
 * 두 hex 색상 사이 보간
 */
function interpolateColor(color1, color2, t) {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * 정답 시 학습률 변동 계산
 *
 * @param {object} params
 * @param {number} params.currentRate - 현재 학습률
 * @param {string} params.quizType - 'multiple' | 'short' | 'toefl-complete'
 * @param {boolean} params.isReasked - 이 문제가 재출제된 것인지 (같은 세션에서 틀린 후)
 * @param {boolean} params.isAiSimilar - AI 기반 유사 문제인지
 * @param {number} params.lastPenalty - 직전 오답 시 감소했던 양 (복구 계산용)
 * @returns {number} - 새로운 학습률
 */
export function calculateCorrectRate({
  currentRate = 0,
  quizType = 'multiple',
  isReasked = false,
  isAiSimilar = false,
  lastPenalty = 0,
}) {
  const weight = QUIZ_TYPE_WEIGHT[quizType] || 1.0;
  let gain;

  if (isAiSimilar && lastPenalty > 0) {
    // AI 유사 문제 정답: 감소분 전부 복구 + 소량 보너스
    gain = Math.abs(lastPenalty) * AI_SIMILAR_CORRECT_RECOVERY + AI_SIMILAR_BONUS;
  } else if (isReasked && lastPenalty > 0) {
    // 재출제 정답: 감소분의 일부 복구
    gain = Math.abs(lastPenalty) * REASKED_CORRECT_RECOVERY;
  } else {
    // 일반 정답
    gain = BASE_CORRECT_GAIN * weight;
  }

  return clampRate(currentRate + gain);
}

/**
 * 오답 시 학습률 변동 계산
 *
 * @param {object} params
 * @param {number} params.currentRate - 현재 학습률
 * @param {number} params.wrongCount - 이 단어의 누적 오답 횟수 (이번 오답 포함 전 값)
 * @returns {{ newRate: number, penalty: number }} - 새로운 학습률과 감소량
 */
export function calculateWrongRate({ currentRate = 0, wrongCount = 0 }) {
  let penalty;

  if (wrongCount === 0) {
    // 첫 오답: 소량 감소 (입력 실수, 깜빡하기 감안)
    penalty = FIRST_WRONG_PENALTY;
  } else {
    // 반복 오답: 횟수에 비례해 더 큰 감소
    const multiplier = Math.min(wrongCount, MAX_WRONG_MULTIPLIER);
    penalty = REPEATED_WRONG_PENALTY * multiplier;
  }

  const newRate = clampRate(currentRate + penalty);
  return { newRate, penalty };
}

/**
 * 학습률을 0-100 범위로 제한
 */
function clampRate(rate) {
  return Math.max(0, Math.min(100, Math.round(rate)));
}

/**
 * 단어 목록을 학습 상태별로 그룹핑
 * @param {Array} words - 단어 배열 (각각 learningRate 필드 보유)
 * @returns {Object} - { difficult: [], learning: [], memorized: [] }
 */
export function groupWordsByStatus(words) {
  const groups = {
    [LEARNING_STATUS.DIFFICULT]: [],
    [LEARNING_STATUS.LEARNING]: [],
    [LEARNING_STATUS.MEMORIZED]: [],
  };

  words.forEach(word => {
    const status = getLearningStatus(word.learningRate);
    groups[status].push(word);
  });

  return groups;
}

/**
 * 단어 목록을 학습률 기준으로 정렬
 * @param {Array} words - 단어 배열
 * @param {'asc' | 'desc'} order - 정렬 방향
 * @returns {Array} - 정렬된 단어 배열
 */
export function sortByLearningRate(words, order = 'asc') {
  return [...words].sort((a, b) => {
    const rateA = a.learningRate || 0;
    const rateB = b.learningRate || 0;
    return order === 'asc' ? rateA - rateB : rateB - rateA;
  });
}
