/**
 * 백엔드(SQLAlchemy)는 UTC naive datetime 을 "2026-09-17T05:44:02" 처럼 타임존 없이 내려준다.
 * `new Date()` 는 이런 문자열을 로컬 시각으로 읽으므로 9시간이 어긋난다. 접미사가 없으면 UTC 로 본다.
 */
export const parseServerDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value !== 'string' || !value) return new Date(NaN);
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasZone ? value : `${value}Z`);
};
