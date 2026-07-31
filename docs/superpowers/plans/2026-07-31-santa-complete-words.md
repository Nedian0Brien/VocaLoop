# Santa-style Complete the Words Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Words를 70~100단어의 문맥 지문, 짧은 기능어와 내용어가 섞인 10개 빈칸, AI가 정한 `revealCount`를 사용하는 산타형 출제 형식으로 바꾼다.

**Architecture:** `src/services/toefl/reading.js`가 새 생성 프롬프트와 신규 응답 검증을 맡는다. `src/services/toefl/completeWordEngine.js`는 `revealCount`를 검증해 `blank.segments`를 만들고, 입력·채점·답안 재구성의 단일 출처로 유지한다. 기존 저장 문항은 생성 검증을 거치지 않고 현재 길이 기반 fallback으로 계속 연다.

**Tech Stack:** React 19, Vite 7, Vitest 4, JavaScript ES modules, FastAPI 자산 JSON 저장

---

## 파일 구조

- Modify: `src/services/toefl/completeWordEngine.js`
  - AI가 반환한 `revealCount`를 검증한다.
  - 신규 생성 문제의 지문·빈칸 구조를 검증한다.
  - `blank.segments`로 사용자 답안을 재구성한다.
- Modify: `src/services/toefl/completeWordEngine.test.js`
  - 가변 공개 글자, 잘못된 값의 fallback, 기존 문항 호환성, 구조 검증을 고정한다.
- Create: `src/services/toefl/completeWordTestFixtures.js`
  - engine과 prompt 테스트가 함께 쓰는 유효한 83단어 문항 fixture를 제공한다.
- Modify: `src/services/toefl/reading.js`
  - 산타형 출제 프롬프트와 JSON schema를 정의한다.
  - AI 응답을 반환하기 전에 신규 문제 구조를 검증한다.
- Create: `src/services/toeflCompleteWordPrompt.test.js`
  - 프롬프트 계약과 생성 서비스의 검증 연결을 고정한다.

백엔드 모델, API, React 화면 컴포넌트는 바꾸지 않는다.

### Task 1: `revealCount`를 철자 마스크의 단일 출처로 사용

**Files:**
- Modify: `src/services/toefl/completeWordEngine.js:1-110`
- Modify: `src/services/toefl/completeWordEngine.test.js:1-24`

- [ ] **Step 1: 유효한 `revealCount`와 답안 재구성을 고정하는 실패 테스트 작성**

```js
import {
  buildCompleteUserAnswers,
  prepareCompleteQuestions,
} from './completeWordEngine';

test('uses revealCount when preparing a generated blank', () => {
  const [question] = prepareCompleteQuestions([{
    paragraph: 'Artists were {{1}} new forms.',
    blanks: [{ id: 1, answer: 'creating', revealCount: 4 }],
  }], 10);

  expect(
    question.blanks[0].segments
      .filter((segment) => segment.type === 'fixed')
      .map((segment) => segment.value)
      .join('')
  ).toBe('crea');
});

test('reconstructs the answer from the prepared blank segments', () => {
  const [question] = prepareCompleteQuestions([{
    paragraph: 'Artists were {{1}} new forms.',
    blanks: [{ id: 1, answer: 'creating', revealCount: 4 }],
  }], 10);
  const answers = [[
    '', '', '', '', 't', 'i', 'n', 'g',
  ]];

  expect(buildCompleteUserAnswers(question, answers)).toEqual(['creating']);
});
```

- [ ] **Step 2: 테스트를 실행해 기존 고정 규칙 때문에 실패하는지 확인**

Run:

```bash
npm test -- --run src/services/toefl/completeWordEngine.test.js
```

Expected: `crea` 대신 `cre`가 공개되거나 재구성 결과가 `creting`이어서 FAIL.

- [ ] **Step 3: 유효한 공개 글자 수를 계산하는 최소 구현 추가**

`src/services/toefl/completeWordEngine.js`에 다음 계약을 추가한다.

```js
const getLetterCount = (answer = '') =>
  String(answer).split('').filter((char) => /^[a-zA-Z]$/.test(char)).length;

export const resolveBlankRevealCount = (answer, revealCount) => {
  const letterCount = getLetterCount(answer);
  if (
    Number.isInteger(revealCount) &&
    revealCount >= 1 &&
    revealCount < letterCount
  ) {
    return revealCount;
  }
  return getPrefixRevealCount(letterCount);
};
```

`prepareCompleteQuestions`는 `blank.revealCount`를 보존하고 검증된 값을 segment 생성에 사용한다.

```js
segments: getBlankSegments(blank.answer || '', {
  prefixRevealCount: resolveBlankRevealCount(blank.answer, blank.revealCount),
}),
```

`buildCompleteUserAnswers`는 준비된 segment가 있으면 다시 계산하지 않는다.

```js
const segments = blank.segments?.length
  ? blank.segments
  : getBlankSegments(blank.answer, {
      prefixRevealCount: resolveBlankRevealCount(blank.answer, blank.revealCount),
    });
return segments.map(...).join('');
```

- [ ] **Step 4: 잘못된 값과 기존 저장 문항 fallback 테스트 추가**

```js
test.each([undefined, null, 0, 8, 2.5, '4'])(
  'falls back to the legacy reveal rule for %p',
  (revealCount) => {
    const [question] = prepareCompleteQuestions([{
      paragraph: 'Artists were {{1}} new forms.',
      blanks: [{ id: 1, answer: 'creating', revealCount }],
    }], 10);

    expect(fixedValues(question.blanks[0].segments).join('')).toBe('cre');
  }
);
```

- [ ] **Step 5: focused 테스트가 통과하는지 확인**

Run:

```bash
npm test -- --run src/services/toefl/completeWordEngine.test.js
```

Expected: PASS.

- [ ] **Step 6: 첫 구현 단위를 커밋**

```bash
git add src/services/toefl/completeWordEngine.js src/services/toefl/completeWordEngine.test.js
git commit -m "feat: support generated complete-word reveal counts"
```

### Task 2: 신규 생성 문제의 산타형 구조 검증

**Files:**
- Modify: `src/services/toefl/completeWordEngine.js:1-132`
- Modify: `src/services/toefl/completeWordEngine.test.js`
- Create: `src/services/toefl/completeWordTestFixtures.js`

- [ ] **Step 1: 유효한 신규 문제 fixture와 검증 테스트 작성**

두 테스트 파일이 함께 쓰도록 최소 4문장, 70~100단어, 가운데 문장에 placeholder 10개, 기능어 2~4개를 가진 fixture builder를 별도 파일에 둔다.

```js
// src/services/toefl/completeWordTestFixtures.js
export const makeValidGeneratedQuestion = () => ({
  paragraph: [
    'Painting techniques changed gradually across many societies as artists discovered materials that could preserve color on stone, wood, and cloth.',
    'Early painters {{1}} natural {{2}} {{3}} cave walls, {{4}} simple shapes and detailed figures that recorded animals, rituals, and seasonal events.',
    'Methods {{5}} more flexible {{6}} prepared {{7}} spread, {{8}} artists to work {{9}} softer light, deeper shadows, {{10}} more lifelike portraits.',
    'Later movements valued personal expression, so painters often favored vivid contrasts and visible brushwork over exact representation of the natural world.',
  ].join(' '),
  fullParagraph: [
    'Painting techniques changed gradually across many societies as artists discovered materials that could preserve color on stone, wood, and cloth.',
    'Early painters used natural pigments on cave walls, creating simple shapes and detailed figures that recorded animals, rituals, and seasonal events.',
    'Methods became more flexible as prepared canvas spread, allowing artists to work with softer light, deeper shadows, and more lifelike portraits.',
    'Later movements valued personal expression, so painters often favored vivid contrasts and visible brushwork over exact representation of the natural world.',
  ].join(' '),
  blanks: [
    { id: 1, answer: 'used', revealCount: 2 },
    { id: 2, answer: 'pigments', revealCount: 3 },
    { id: 3, answer: 'on', revealCount: 1 },
    { id: 4, answer: 'creating', revealCount: 4 },
    { id: 5, answer: 'became', revealCount: 3 },
    { id: 6, answer: 'as', revealCount: 1 },
    { id: 7, answer: 'canvas', revealCount: 3 },
    { id: 8, answer: 'allowing', revealCount: 2 },
    { id: 9, answer: 'with', revealCount: 2 },
    { id: 10, answer: 'and', revealCount: 1 },
  ],
});

// src/services/toefl/completeWordEngine.test.js
import { makeValidGeneratedQuestion } from './completeWordTestFixtures';

test('accepts a generated set that matches the Santa-style structure', () => {
  const questions = [makeValidGeneratedQuestion()];
  expect(validateGeneratedCompleteQuestionSet(questions, {
    questionCount: 1,
    blanksPerQuestion: 10,
  })).toBe(questions);
});
```

fixture의 `blanks`는 ID 1~10, 중복 없는 2~10자 정답, 유효한 `revealCount`를 가진다. `fullParagraph` 단어 수는 테스트에서 직접 70~100 범위인지 먼저 확인한다.

```js
expect(makeValidGeneratedQuestion().fullParagraph.trim().split(/\s+/)).toHaveLength(83);
```

- [ ] **Step 2: 테스트를 실행해 validator가 없어 실패하는지 확인**

Run:

```bash
npm test -- --run src/services/toefl/completeWordEngine.test.js
```

Expected: `validateGeneratedCompleteQuestionSet is not a function` 또는 export 부재로 FAIL.

- [ ] **Step 3: 최소 구조 validator 구현**

`src/services/toefl/completeWordEngine.js`에 다음 경계를 추가한다.

```js
const COMPLETE_WORD_FUNCTION_WORDS = new Set([
  'as', 'at', 'by', 'if', 'in', 'of', 'on', 'or', 'so', 'to',
  'up', 'yet', 'and', 'but', 'for', 'nor', 'the', 'with', 'from',
]);
const PLACEHOLDER_PATTERN = /{{(\d+)}}/g;

const countWords = (value) =>
  String(value).trim().split(/\s+/).filter(Boolean).length;

const splitSentences = (value) =>
  (String(value).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const failGeneratedQuestion = (index, message) => {
  throw new Error(`Complete the Words 문항 ${index + 1}: ${message}`);
};

export const validateGeneratedCompleteQuestionSet = (
  questions,
  { questionCount, blanksPerQuestion }
) => {
  if (!Array.isArray(questions) || questions.length !== questionCount) {
    throw new Error(`Complete the Words 문항 수가 ${questionCount}개가 아닙니다.`);
  }

  questions.forEach((question, questionIndex) => {
    const fullSentences = splitSentences(question?.fullParagraph);
    const maskedSentences = splitSentences(question?.paragraph);
    const blanks = Array.isArray(question?.blanks) ? question.blanks : [];
    const wordCount = countWords(question?.fullParagraph);
    // 70~100단어, 최소 4문장, 첫·마지막 문장 placeholder 없음 검증
    // blanks 수, ID 유일성, placeholder 대응, answer 형식과 중복 검증
    // 4자 이하 allowlist 기능어가 2~4개인지 검증
  });

  return questions;
};
```

오류 메시지는 실패한 조건을 사용자에게 드러내며, 잘못된 일부 문항을 삭제하거나 수정하지 않는다.

- [ ] **Step 4: 각 실패 경계를 하나씩 고정하는 테스트 추가**

각 테스트는 valid fixture의 한 조건만 바꾼다.

```js
const expectInvalidGeneratedQuestion = (mutate) => {
  const questions = structuredClone([makeValidGeneratedQuestion()]);
  mutate(questions[0]);
  expect(() => validateGeneratedCompleteQuestionSet(questions, {
    questionCount: 1,
    blanksPerQuestion: 10,
  })).toThrow(/Complete the Words/);
};

test('rejects a placeholder in the first sentence', () => {
  expectInvalidGeneratedQuestion((question) => {
    question.paragraph = question.paragraph.replace(
      'Painting techniques',
      'Painting {{11}} techniques'
    );
  });
});

test('rejects a placeholder that does not map to a blank', () => {
  expectInvalidGeneratedQuestion((question) => {
    question.paragraph = question.paragraph.replace('{{10}}', '{{11}}');
  });
});

test('rejects a duplicate answer', () => {
  expectInvalidGeneratedQuestion((question) => {
    question.blanks[1].answer = question.blanks[0].answer;
  });
});

test('rejects a set without enough short function words', () => {
  expectInvalidGeneratedQuestion((question) => {
    question.blanks = question.blanks.map((blank) => (
      ['on', 'as', 'with', 'and'].includes(blank.answer)
        ? { ...blank, answer: `word${blank.id}` }
        : blank
    ));
  });
});
```

같은 패턴으로 문항 수, 69·101단어, 3문장, 마지막 문장 placeholder, 빈칸 수, 1자·11자 정답을 각각 한 조건씩 바꿔 검증한다. 경계값 70·100단어는 통과하고 69·101단어는 실패하는 테스트를 별도로 둔다.

- [ ] **Step 5: validator 테스트가 모두 통과하는지 확인**

Run:

```bash
npm test -- --run src/services/toefl/completeWordEngine.test.js
```

Expected: PASS.

- [ ] **Step 6: 구조 검증 단위를 커밋**

```bash
git add \
  src/services/toefl/completeWordEngine.js \
  src/services/toefl/completeWordEngine.test.js \
  src/services/toefl/completeWordTestFixtures.js
git commit -m "feat: validate generated complete-word question structure"
```

### Task 3: 생성 프롬프트와 runtime 검증 연결

**Files:**
- Modify: `src/services/toefl/reading.js:1-126`
- Create: `src/services/toeflCompleteWordPrompt.test.js`

- [ ] **Step 1: 새 프롬프트 계약의 실패 테스트 작성**

기존 TOEFL prompt 테스트의 mock 패턴을 재사용한다.

```js
const promptUtils = vi.hoisted(() => ({
  buildRandomNonce: vi.fn(() => 'fixed-nonce'),
  formatTopicsBlock: vi.fn(() => ''),
  formatVocabularyWordsBlock: vi.fn(() => ''),
  requestAiJson: vi.fn(),
}));

vi.mock('./toefl/promptUtils', () => promptUtils);

import { makeValidGeneratedQuestion } from './toefl/completeWordTestFixtures';

test('requests the Santa-style paragraph and blank contract', async () => {
  promptUtils.requestAiJson.mockResolvedValue({
    questions: [makeValidGeneratedQuestion()],
  });
  const { generateCompleteTheWordSet } = await import('./toeflService');

  await generateCompleteTheWordSet({
    aiConfig: { provider: 'codex' },
    questionCount: 1,
    blanksPerQuestion: 10,
    targetScore: 'intermediate',
  });

  const [prompt] = promptUtils.requestAiJson.mock.calls[0];
  expect(prompt).toContain('70-100 words');
  expect(prompt).toContain('at least 4 sentences');
  expect(prompt).toContain('Do not place placeholders in the first or last sentence');
  expect(prompt).toContain('2-10 letters long');
  expect(prompt).toContain('2-4 short function words');
  expect(prompt).toContain('"revealCount"');
});
```

- [ ] **Step 2: 테스트를 실행해 기존 120~160단어·4~10자 계약 때문에 실패하는지 확인**

Run:

```bash
npm test -- --run src/services/toeflCompleteWordPrompt.test.js
```

Expected: prompt assertion FAIL.

- [ ] **Step 3: 프롬프트와 JSON schema를 최소 변경**

`src/services/toefl/reading.js`에서 Complete the Words prompt만 다음 계약으로 바꾼다.

```text
1) One 70-100 word paragraph with at least 4 sentences.
2) Keep the first and last sentences complete; placeholders may appear only in middle sentences.
3) Use exactly 10 unique target words, each 2-10 letters long.
4) Include 2-4 short function words and use content words for the remaining targets.
   Count function words only from this list:
   as, at, by, if, in, of, on, or, so, to, up, yet, and, but, for, nor, the, with, from.
5) Return answer and revealCount for every blank.
6) revealCount rules:
   - 2-3 letters: reveal 1
   - 4-6 letters: reveal 2-3
   - 7-10 letters: reveal 2-4
   - Always leave at least one editable letter.
```

JSON 예시를 다음처럼 바꾼다.

```json
{ "id": 1, "answer": "creating", "revealCount": 4 }
```

- [ ] **Step 4: 생성 응답이 validator를 통과해야 반환되는 실패 테스트 작성**

```js
test('rejects an invalid generated set before returning it', async () => {
  promptUtils.requestAiJson.mockResolvedValue({ questions: [] });
  const { generateCompleteTheWordSet } = await import('./toeflService');

  await expect(generateCompleteTheWordSet({
    aiConfig: { provider: 'codex' },
    questionCount: 1,
    blanksPerQuestion: 10,
    targetScore: 'intermediate',
  })).rejects.toThrow(/문항 수/);
});
```

Run:

```bash
npm test -- --run src/services/toeflCompleteWordPrompt.test.js
```

Expected: 현재 함수가 `{ questions: [] }`를 그대로 반환해 FAIL.

- [ ] **Step 5: `generateCompleteTheWordSet`에 validator 연결**

`src/services/toefl/reading.js` 상단에서 validator를 import한다.

```js
import { validateGeneratedCompleteQuestionSet } from './completeWordEngine';
```

AI 호출 결과를 검증한 뒤 그대로 반환한다.

```js
const data = await requestAiJson(prompt, aiConfig);
validateGeneratedCompleteQuestionSet(data?.questions, {
  questionCount,
  blanksPerQuestion,
});
return data;
```

`reviewAsset` 로딩 경로는 이 함수를 호출하지 않으므로 기존 저장 문제에는 신규 구조 검증이 적용되지 않는다.

- [ ] **Step 6: prompt와 engine focused 테스트 실행**

Run:

```bash
npm test -- --run \
  src/services/toeflCompleteWordPrompt.test.js \
  src/services/toefl/completeWordEngine.test.js \
  src/components/ToeflCompleteTheWordQuiz.test.jsx \
  src/hooks/useCompleteWordInputs.test.jsx
```

Expected: PASS.

- [ ] **Step 7: 생성 계약 연결 단위를 커밋**

```bash
git add src/services/toefl/reading.js src/services/toeflCompleteWordPrompt.test.js
git commit -m "feat: generate Santa-style complete-word questions"
```

### Task 4: 전체 회귀 검증과 릴리스

**Files:**
- Verify only; 예상 코드 변경 없음

- [ ] **Step 1: 전체 프론트엔드 테스트 실행**

Run:

```bash
npm test -- --run
```

Expected: 45개 이상의 test file과 196개 이상의 test가 모두 PASS.

- [ ] **Step 2: 프로덕션 빌드 실행**

Run:

```bash
npm run build
```

Expected: Vite production build PASS.

- [ ] **Step 3: 전체 백엔드 테스트 실행**

Run:

```bash
pytest backend/tests -q
```

Expected: 97개 이상의 test가 모두 PASS. `dist/`가 없는 새 worktree에서는 먼저 `npm run build`를 실행한다.

- [ ] **Step 4: diff와 변경 범위 확인**

Run:

```bash
git diff --check
git status --short
git diff --stat origin/main...HEAD
```

Expected: whitespace 오류 없음. 설계·계획·Complete the Words 생성/engine/test 파일만 변경.

- [ ] **Step 5: 구현 브랜치 완료 상태 커밋 확인**

Run:

```bash
git log --oneline origin/main..HEAD
```

Expected: 설계, `revealCount`, 구조 검증, 생성 프롬프트 변경이 각각 추적 가능한 커밋으로 표시됨.

- [ ] **Step 6: 구현 브랜치를 `main`에 통합**

`superpowers:finishing-a-development-branch`를 적용한다. 루트 checkout에서 현재 상태와 branch base를 확인한 뒤 fast-forward로 통합한다.

Run:

```bash
cd /home/ubuntu/project/VocaLoop
git status --short --branch
git merge --ff-only codex/santa-complete-words
```

Expected: `main`이 구현 브랜치의 마지막 커밋으로 fast-forward. `_workspace/` humanize 감사 파일은 stage하거나 커밋하지 않는다.

- [ ] **Step 7: `main`을 push해 GitHub Actions 배포 시작**

Run:

```bash
GIT_SSH_COMMAND="ssh -i /home/ubuntu/.ssh/id_ed25519 -o StrictHostKeyChecking=no" git push origin main
gh run list --limit 5
```

Expected: push 성공, `.github/workflows/deploy.yml`의 새 run 확인.

- [ ] **Step 8: GitHub Actions 완료 확인**

Run:

```bash
gh run watch <run-id> --exit-status
gh run view <run-id> --json status,conclusion,url
```

Expected: `status=completed`, `conclusion=success`.

- [ ] **Step 9: 공개 서비스와 PM2 확인**

Run:

```bash
curl -fsS https://vocaloop.lawdigest.kr/api/health
curl -I -sS https://vocaloop.lawdigest.kr/
export HOME=/home/ubuntu
export PM2_HOME=/home/ubuntu/.pm2
pm2 describe voca-loop
```

Expected: health JSON의 `status=ok`, root HTTP 200, `voca-loop` online이며 cwd와 port가 운영 계약과 일치.

- [ ] **Step 10: 실제 라이브 번들에서 새 출제 계약 확인**

홈페이지 HTML에서 현재 JS asset 이름을 읽고 lazy-loaded `QuizView` chunk를 찾은 뒤 고정 문자열을 확인한다.

Run:

```bash
curl -fsS https://vocaloop.lawdigest.kr/ | sed -n '1,40p'
curl -fsS https://vocaloop.lawdigest.kr/assets/<current-index-asset>.js | \
  rg -o 'assets/QuizView-[A-Za-z0-9_-]+\\.js'
curl -fsS https://vocaloop.lawdigest.kr/assets/<current-quiz-view-asset>.js | \
  rg -o '70-100 words|revealCount|2-4 short function words' | sort -u
```

Expected: 세 계약 문자열이 현재 QuizView chunk에서 모두 확인됨.

## FACTS Validation

- [x] **F — Feasible:** 현재 JavaScript 서비스와 JSON 자산 계약만 바꾸며 DB migration이나 새 라이브러리가 필요 없다.
- [x] **A — Atomic:** 각 task는 마스크, 구조 검증, 프롬프트 연결, 전체 회귀 검증 중 하나만 맡는다.
- [x] **C — Clear:** 모든 task에 파일, 함수, 코드 sketch, 실행 명령을 적었다.
- [x] **T — Testable:** production code보다 실패 테스트를 먼저 실행하고 focused·전체 검증 명령과 기대 결과를 명시했다.
- [x] **S — Scoped:** 화면, 백엔드 API/DB, 다른 TOEFL 유형, 자동 재시도는 바꾸지 않는다.
