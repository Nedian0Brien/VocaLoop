import React from 'react';
import Card from './Card';

/**
 * Stat — 대시보드 KPI 카드.
 * QuizDashboard 의 StatCard 를 표준화한 형태입니다.
 *
 * title    : 작은 라벨 (eyebrow caps 스타일로 자동 변환)
 * value    : 메인 숫자/문자열
 * subValue : 보조 텍스트 (옵션)
 * icon     : 아이콘 컴포넌트
 * tone     : brand | accent | success | warning | neutral
 * trend    : 숫자(%); >0 상승, <0 하락, undefined 표시 안함
 */
const toneClasses = {
  brand:   'bg-brand-50   text-brand-600',
  accent:  'bg-accent-50  text-accent-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  neutral: 'bg-surface-100 text-surface-600',
};

const TrendBadge = ({ trend }) => {
  if (trend === undefined || trend === null) return null;
  const tone =
    trend > 0 ? 'bg-success-50 text-success-600'
    : trend < 0 ? 'bg-danger-50 text-danger-600'
    : 'bg-surface-100 text-surface-400';
  const label = trend > 0 ? `↑ ${trend}%` : trend < 0 ? `↓ ${Math.abs(trend)}%` : 'Stable';
  return (
    <span className={`text-2xs font-black px-2 py-1 rounded-md ${tone}`}>
      {label}
    </span>
  );
};

export default function Stat({
  title,
  value,
  subValue,
  icon: Icon,
  tone = 'brand',
  trend,
  className = '',
}) {
  return (
    <Card
      variant="elevated"
      padding="md"
      radius="card"
      hover
      className={`flex flex-col gap-5 relative overflow-hidden group ${className}`}
    >
      <div className="flex items-center justify-between relative z-10">
        {Icon && (
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${toneClasses[tone]}`}
          >
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>
        )}
        <TrendBadge trend={trend} />
      </div>

      <div className="relative z-10">
        <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-1.5">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-3xl font-black text-surface-900 tracking-tight">{value}</h4>
          {subValue && (
            <span className="text-xs font-bold text-surface-400 opacity-70">{subValue}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
