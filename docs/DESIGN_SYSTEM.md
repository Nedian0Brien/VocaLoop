# VocaLoop Design System

> **"Modern Bold Editorial"** — 학습 에너지 + 신뢰감.
> 시그니처는 큰 모서리(`rounded-2xl/3xl`), 강한 굵기(`font-black`), 절제된 brand glow.

이 문서는 컴포넌트 작성 시 **단 하나의 참조 지점**입니다.
색·간격·그림자를 새로 박지 말고, 항상 토큰 → 프리미티브 순으로 사용하세요.

---

## 1. 빠른 시작

```jsx
import { Button, Card, Badge, Stat, SectionHeading, Input } from '@/design-system';
import { Sparkles, Mail } from '@/components/Icons';

<Card variant="elevated" radius="card" padding="lg" hover>
  <Badge tone="brand" style="dot">Live</Badge>
  <h2 className="text-2xl font-black text-surface-900 mt-4">오늘의 학습</h2>
  <Button variant="primary" size="lg" leftIcon={Sparkles} className="mt-6">
    시작하기
  </Button>
</Card>
```

> 경로 별칭이 없다면 `../../design-system` 같은 상대경로로도 OK.

---

## 2. 토큰 (Single Source of Truth)

| 카테고리 | 파일 | Tailwind 노출 위치 |
|----------|------|------------------|
| 색상     | `src/design-system/tokens.js` (`palette`)      | `src/index.css` `@theme` |
| 타입     | `tokens.js` (`typography`)                      | `font-display`, `text-2xs`, `text-5xl` |
| 모서리   | `tokens.js` (`radius`)                          | `rounded-card`, `rounded-hero`, `rounded-pill` |
| 그림자   | `tokens.js` (`shadow`)                          | `shadow-[var(--shadow-card)]` 등 |
| 모션     | `tokens.js` (`motion`)                          | `--ease-spring`, `--ease-decel` CSS 변수 |

### 2.1 색 팔레트

| 역할 | 토큰 | Tailwind 유틸 | 사용처 |
|------|------|--------------|--------|
| **Brand**   | `brand-{50..900}`        | `bg-brand-600`        | 주요 액션, 진행률, 핵심 강조 |
| **Accent**  | `accent-{50..700}`       | `bg-accent-600`       | TOEFL/고급 모드, 보조 강조 |
| **Indigo Pair** | `indigo-pair-{500..700}` | `bg-indigo-pair-600` | 그라데이션 짝 |
| **Surface** | `surface-{0..900}`       | `bg-surface-50`, `text-surface-900` | 모든 배경/텍스트 (gray ❌) |
| **Success** | `success-{50,500..700}`  | `bg-success-50`       | 성공 / 정답 / 80%↑ |
| **Warning** | `warning-{50,500..700}`  | `bg-warning-500`      | 주의 / 학습 진행 중 |
| **Danger**  | `danger-{50,500..700}`   | `bg-danger-500`       | 오류 / 삭제 |

> **금지**: `gray-*` 직접 사용. 무조건 `surface-*`로 마이그레이션.

### 2.2 타이포 스케일

| 토큰 | px | 용도 |
|------|----|------|
| `text-2xs`  | 10 | eyebrow caps, badge 텍스트 |
| `text-xs`   | 12 | 캡션, 보조 라벨 |
| `text-sm`   | 14 | 본문 보조, 버튼 |
| `text-base` | 16 | 본문 기본 |
| `text-lg`   | 18 | 강조 본문 |
| `text-xl`   | 20 | 사이드바 헤딩 |
| `text-2xl`  | 24 | 섹션 헤딩 |
| `text-3xl`  | 30 | KPI 숫자 |
| `text-4xl`  | 36 | 페이지 헤딩 |
| `text-5xl`  | 48 | 히어로 |

**무게 규칙** — 위계 순서대로:
- `font-black`(900) → 모든 헤딩 / KPI / Badge eyebrow
- `font-bold`(700) → 본문 강조, 버튼 라벨
- `font-semibold`(600) → 라벨 / 메타
- `font-medium`(500) → 일반 본문

### 2.3 모서리

| 토큰 | 픽셀 | 용도 |
|------|------|------|
| `rounded-xs`  | 8  | 작은 배지, 코드칩 |
| `rounded-sm`  | 12 | 인풋, 스몰 버튼 |
| `rounded-md`  | 16 | 기본 버튼 / 라지 배지 |
| `rounded-lg`  | 20 | 아이콘 박스 |
| `rounded-xl`  | 24 | 작은 카드 |
| `rounded-card` (`rounded-2xl`) | 32 | **메인 카드 시그니처** |
| `rounded-hero` (`rounded-3xl`) | 48 | 히어로 / 푸터 카드 |
| `rounded-pill` | full | Badge / 진행 바 |

### 2.4 그림자

| 토큰 | 의도 |
|------|------|
| `var(--shadow-soft)`        | 미세한 분리 |
| `var(--shadow-card)`        | 기본 카드 |
| `var(--shadow-card-hover)`  | 호버 강조 |
| `var(--shadow-elevated)`    | 떠 있는 다이얼로그 |
| `var(--shadow-floating)`    | 카드 호버 max |
| `var(--shadow-glow-brand)`  | 핵심 액션 버튼 |
| `var(--shadow-glow-accent)` | TOEFL/고급 액센트 |

### 2.5 모션

| 토큰 (CSS 변수) | duration | 용도 |
|-----|----------|------|
| `--ease-decel`  | 200~500ms | 인풋, 등장 |
| `--ease-spring` | 400~700ms | 카드 변형, 플립 |
| 기본 transition | `duration-150 ease-out` | 호버, 색 변경 |

> **저감 모션 사용자**(`prefers-reduced-motion`)는 모든 애니메이션이 자동 비활성화됩니다 (`index.css` 처리).

---

## 3. 프리미티브 컴포넌트

### `<Button />`

| Prop      | 값 |
|-----------|----|
| `variant` | `primary` (기본) / `secondary` / `ghost` / `danger` / `dark` |
| `size`    | `sm` / `md` / `lg` |
| `loading` | boolean — 스피너 + 비활성화 |
| `fullWidth` | boolean |
| `leftIcon` / `rightIcon` | 아이콘 컴포넌트 |

```jsx
<Button variant="primary" size="lg" leftIcon={Sparkles}>학습 시작</Button>
<Button variant="ghost" size="sm">건너뛰기</Button>
<Button variant="primary" loading>저장 중...</Button>
```

### `<Card />`

| Prop      | 값 |
|-----------|----|
| `variant` | `elevated` / `flat` / `outlined` / `dark` / `gradient` |
| `padding` | `none` / `sm` / `md` / `lg` / `xl` |
| `radius`  | `md` / `lg` / `xl` / `card` / `hero` |
| `hover`   | boolean — 호버 시 들어올림 |
| `as`      | 렌더링 태그 (기본 `div`) |

```jsx
<Card variant="elevated" radius="card" padding="lg" hover>...</Card>
<Card variant="dark"     radius="hero" padding="xl">Smart Tip 영역</Card>
<Card variant="gradient" radius="card" padding="lg">Weekly Goal</Card>
```

### `<Badge />`

| Prop    | 값 |
|---------|----|
| `tone`  | `brand` / `accent` / `success` / `warning` / `danger` / `neutral` / `dark` |
| `style` | `pill` (eyebrow caps) / `tag` / `dot` |
| `size`  | `xs` / `sm` / `md` |

```jsx
<Badge tone="success">Recommended</Badge>
<Badge tone="brand" style="dot" size="md">Live</Badge>
<Badge tone="neutral" style="tag">v2.1</Badge>
```

### `<Input />`

| Prop        | 값 |
|-------------|----|
| `label`     | 라벨 문자열 (자동 `<label htmlFor>`) |
| `size`      | `sm` / `md` / `lg` |
| `leftIcon`  | 아이콘 컴포넌트 |
| `rightSlot` | 우측 노드 (예: 비밀번호 토글) |
| `error`     | 에러 메시지 (있으면 빨간 보더 + 메시지) |
| `hint`      | 보조 설명 |

```jsx
<Input
  label="이메일"
  type="email"
  leftIcon={Mail}
  placeholder="example@email.com"
  hint="회원 식별에 사용됩니다."
/>
```

### `<Stat />`

대시보드 KPI 카드. `QuizDashboard.StatCard`를 표준화한 형태.

```jsx
<Stat
  title="Avg. Mastery"
  value="74%"
  subValue="Mastery Level"
  icon={Target}
  tone="brand"
  trend={5}
/>
```

### `<SectionHeading />`

QuizDashboard의 섹션 시작부 헤더. icon box + title + subtitle.

```jsx
<SectionHeading
  icon={BookOpen}
  title="Vocabulary Training"
  subtitle="암기 수준에 맞춘 기초 단계 학습"
  tone="indigo"
/>
```

---

## 4. 합성 패턴 (Recipes)

### 4.1 메인 콘텐츠 카드

```jsx
<Card variant="elevated" radius="card" padding="lg" hover>
  <Badge tone="success" className="mb-3">Recommended</Badge>
  <h3 className="text-xl font-black text-surface-900 tracking-tight mb-2">{title}</h3>
  <p className="text-sm font-bold text-surface-500 leading-relaxed">{desc}</p>
</Card>
```

### 4.2 다크 푸터 / Smart Tip

```jsx
<Card variant="dark" radius="hero" padding="xl">
  <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-pill blur-[100px]" />
  <div className="relative z-10">{children}</div>
</Card>
```

### 4.3 그라데이션 CTA

```jsx
<Card variant="gradient" radius="card" padding="lg">
  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-pill blur-2xl -translate-y-1/2 translate-x-1/2" />
  <h4 className="text-lg font-black tracking-tight relative z-10">Weekly Goal</h4>
</Card>
```

---

## 5. 마이그레이션 가이드

| 기존 패턴 | 새 패턴 |
|-----------|---------|
| `bg-gray-*` `text-gray-*` `border-gray-*` | `bg-surface-*` `text-surface-*` `border-surface-*` |
| `bg-blue-600` (브랜드 의미) | `bg-brand-600` |
| `bg-purple-600` | `bg-accent-600` |
| `rounded-[2rem]` | `rounded-card` |
| `rounded-[3rem]` | `rounded-hero` |
| `rounded-full` (원형) | `rounded-pill` |
| `text-[10px]` `text-[9px]` | `text-2xs` |
| 인라인 그라데이션 버튼 | `<Button variant="primary" />` |
| 직접 작성한 카드 div | `<Card variant="elevated" radius="card" />` |
| `<div className="px-2.5 py-1 bg-green-500 text-white text-[9px] font-black rounded-lg uppercase">Recommended</div>` | `<Badge tone="success">Recommended</Badge>` |

**우선순위**:
1. `LoginScreen.jsx` — 가장 격차가 큼. `gray` → `surface`, 인라인 input → `<Input />`, gradient 버튼 → `<Button variant="primary" />`.
2. `Header.jsx` — `gray` → `surface`, `blue-{600,700}` → `brand-{600,700}`.
3. `QuizDashboard.jsx` — 이미 시각 언어가 가까움. `<Stat>`, `<SectionHeading>`, `<Card variant="dark|gradient">` 로 추출.
4. 그 외 컴포넌트 — 새 작업 시 무조건 디자인 시스템 사용.

---

## 6. 확장 규칙

새 색/모서리/그림자가 필요할 때:

1. `tokens.js` 에 의미 있는 이름으로 추가 (`brand-50` 같은 카테고리·계층).
2. `index.css` `@theme` 블록에 동일 이름의 CSS 변수 추가.
3. 사용처 변경 — 컴포넌트는 항상 토큰 이름으로만 참조.
4. 본 문서 표 업데이트.

새 컴포넌트가 필요할 때:

1. `src/design-system/primitives/` 에 작성. 모든 색/모서리/간격은 토큰만 사용.
2. `src/design-system/index.js` 에서 re-export.
3. 본 문서 §3 에 prop 표와 사용 예시 추가.

---

## 7. 접근성 체크리스트

- [ ] 텍스트/배경 명도비 ≥ 4.5:1 (소형), ≥ 3:1 (대형)
- [ ] 모든 인터랙티브 요소에 키보드 포커스 표시 (`focus-visible:outline-brand-500`)
- [ ] 아이콘 단독 버튼은 `aria-label` 또는 `title` 필수
- [ ] 폼 인풋은 `<Input label>` 사용 → 자동 `<label htmlFor>` 연결
- [ ] 에러 메시지는 `aria-describedby` 연결 (Input 자동 처리)
- [ ] `prefers-reduced-motion` 사용자 자동 모션 비활성 (글로벌 처리됨)
- [ ] 본문 ≥ 14px, 줄 높이 ≥ 1.5
