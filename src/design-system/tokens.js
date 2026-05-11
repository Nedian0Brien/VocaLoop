/**
 * VocaLoop Design Tokens
 * "Modern Bold Editorial" — 학습 에너지 + 신뢰감
 *
 * 단일 진실 공급원(Single Source of Truth).
 * Tailwind 유틸리티는 src/index.css 의 @theme 블록에서 동일한 값으로 노출됩니다.
 * 런타임에서 동적으로 토큰이 필요할 때만 이 파일을 import 하세요.
 */

export const palette = {
  // Brand — 학습 진행/주요 액션
  brand: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Accent — TOEFL/고급 모드, 보조 강조
  accent: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
  },
  // Indigo — 그라데이션 짝꿍
  indigo: {
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
  },
  // Surface — 모든 배경/보더 기본 팔레트 (gray가 아닌 slate 통일)
  surface: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  // Semantic — full Tailwind-aligned scale
  success: {
    50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399',
    500: '#10B981', 600: '#059669', 700: '#047857',
  },
  warning: {
    50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24',
    500: '#F59E0B', 600: '#D97706', 700: '#B45309',
  },
  danger: {
    50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171',
    500: '#EF4444', 600: '#DC2626', 700: '#B91C1C',
  },
};

export const typography = {
  fontFamily: {
    display: ['Inter', 'Noto Sans KR', 'system-ui', 'sans-serif'],
    serif:   ['Merriweather', 'Georgia', 'serif'],
    mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
  },
  // px in rem (16px base)
  fontSize: {
    '2xs':  '0.625rem', // 10px — eyebrow / label caps
    xs:     '0.75rem',  // 12px
    sm:     '0.875rem', // 14px
    base:   '1rem',     // 16px — body 기본
    lg:     '1.125rem', // 18px
    xl:     '1.25rem',  // 20px
    '2xl':  '1.5rem',   // 24px — section heading
    '3xl':  '1.875rem', // 30px
    '4xl':  '2.25rem',  // 36px — page heading
    '5xl':  '3rem',     // 48px — hero
  },
  fontWeight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    black:    '900', // editorial impact
  },
  lineHeight: {
    tight:   '1.1',
    snug:    '1.25',
    normal:  '1.5',
    relaxed: '1.7',
  },
  letterSpacing: {
    tighter: '-0.04em',
    tight:   '-0.02em',
    normal:  '0',
    wide:    '0.02em',
    wider:   '0.05em',
    widest:  '0.18em', // eyebrow caps
  },
};

// 8px 기반 — 임의값 사용 금지
export const spacing = {
  px: '1px', 0: '0',
  1: '0.25rem',  2: '0.5rem',  3: '0.75rem', 4: '1rem',
  5: '1.25rem',  6: '1.5rem',  7: '1.75rem', 8: '2rem',
  10: '2.5rem',  12: '3rem',   14: '3.5rem', 16: '4rem',
  20: '5rem',    24: '6rem',   32: '8rem',
};

// 컴포넌트 타입별 의미 매핑 — 직접 px 쓰지 말고 이걸로
export const radius = {
  none:    '0',
  xs:      '0.5rem',   // 8px  — 작은 배지
  sm:      '0.75rem',  // 12px — 인풋, 작은 버튼
  md:      '1rem',     // 16px — 기본 버튼/배지
  lg:      '1.25rem',  // 20px — 아이콘 박스
  xl:      '1.5rem',   // 24px — 작은 카드
  '2xl':   '2rem',     // 32px — 메인 카드 (Editorial 시그니처)
  '3xl':   '3rem',     // 48px — 히어로/푸터 카드
  pill:    '9999px',
};

export const shadow = {
  xs:    '0 1px 2px 0 rgb(15 23 42 / 0.04)',
  sm:    '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
  md:    '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
  lg:    '0 10px 20px -5px rgb(15 23 42 / 0.10), 0 4px 8px -4px rgb(15 23 42 / 0.06)',
  xl:    '0 20px 40px -10px rgb(15 23 42 / 0.15)',
  '2xl': '0 30px 60px -15px rgb(15 23 42 / 0.25)',
  // Brand glow — 인터랙션 강조용. 남발 금지.
  glowBrand:  '0 10px 30px -10px rgb(37 99 235 / 0.35)',
  glowAccent: '0 10px 30px -10px rgb(124 58 237 / 0.35)',
  glowIndigo: '0 10px 30px -10px rgb(79 70 229 / 0.35)',
};

export const motion = {
  duration: {
    fast:   '150ms', // 호버, 미세 변화
    base:   '300ms', // 기본 인터랙션
    slow:   '500ms', // 카드 변형
    slower: '700ms', // 카드 플립, 섹션 진입
  },
  ease: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',  // ease-in-out
    decel:    'cubic-bezier(0, 0, 0.2, 1)',    // ease-out
    accel:    'cubic-bezier(0.4, 0, 1, 1)',    // ease-in
    spring:   'cubic-bezier(0.16, 1, 0.3, 1)', // playful 등장
  },
};

export const breakpoints = {
  sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
};

// z-index 레이어 — 마법 숫자 금지
export const zIndex = {
  base:    0,
  dropdown: 10,
  sticky:   20,
  overlay:  30,
  modal:    40,
  toast:    50,
};

const tokens = { palette, typography, spacing, radius, shadow, motion, breakpoints, zIndex };
export default tokens;
