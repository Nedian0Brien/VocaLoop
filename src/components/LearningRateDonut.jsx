import React, { useState, useEffect } from 'react';
import { getLearningRateColor, getLearningStatus, LEARNING_STATUS } from '../utils/learningRate';

/**
 * 학습률 원형 도넛 그래프 컴포넌트
 *
 * - 부드러운 곡선과 색상으로 디자인
 * - 학습률에 따라 빨간색 → 파란색 → 초록색
 * - 100% 달성 시 중앙에 초록색 체크 아이콘
 *
 * @param {number} rate - 학습률 (0-100)
 * @param {number} size - 컴포넌트 크기 (px), 기본 48
 * @param {number} strokeWidth - 도넛 두께 (px), 기본 4
 */
export default function LearningRateDonut({ rate = 0, size = 48, strokeWidth = 4 }) {
  const [animatedRate, setAnimatedRate] = useState(0);

  useEffect(() => {
    // requestAnimationFrame을 사용한 부드러운 애니메이션
    const startTime = performance.now();
    const duration = 600; // ms
    const startRate = animatedRate;
    const targetRate = Math.max(0, Math.min(100, rate));

    if (startRate === targetRate) return;

    let frameId;
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startRate + (targetRate - startRate) * eased;
      setAnimatedRate(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [rate]);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 1; // 1px 여유
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedRate / 100) * circumference;
  const color = getLearningRateColor(animatedRate);
  const status = getLearningStatus(rate);
  const isComplete = rate >= 100;

  // 배경 트랙 색상 (살짝 연한)
  const trackColor = '#E5E7EB'; // gray-200

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      title={`학습률: ${Math.round(rate)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* 배경 트랙 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* 진행 호 */}
        {animatedRate > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 2px ${color}40)`,
              transition: 'stroke 0.3s ease',
            }}
          />
        )}
      </svg>

      {/* 중앙 콘텐츠 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          // 100% 달성: 초록색 체크 아이콘
          <svg
            width={size * 0.4}
            height={size * 0.4}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22C55E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          // 학습률 숫자 표시
          <span
            className="font-bold leading-none"
            style={{
              fontSize: size * 0.24,
              color: color,
            }}
          >
            {Math.round(animatedRate)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 학습 상태 배지 (라벨 + 색상 점)
 * @param {number} rate - 학습률
 */
export function LearningStatusBadge({ rate = 0 }) {
  const status = getLearningStatus(rate);

  const config = {
    difficult: { label: '어려워요', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
    learning: { label: '학습 중', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    memorized: { label: '외웠어요', bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
  };

  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
