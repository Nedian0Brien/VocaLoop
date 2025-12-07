📘 VocaLoop 웹 프로토타입 기술 설계서

## 1. 개요

본 문서는 'VocaLoop'의 핵심 기능인 AI 기반 단어 분석과 적응형 학습 루프를 웹 환경에서 검증하기 위한 프로토타입 설계 명세입니다.

Frontend: React (Single File Component), Tailwind CSS

Backend/DB: Firebase (Firestore, Auth)

AI Engine: Google Gemini API (gemini-2.0-flash-exp 또는 gemini-1.5-pro)

## 2. 시스템 아키텍처 (Architecture)

### 2.1. 전체 구조

단일 HTML 파일 내에서 React와 Babel(JSX 변환)을 로드하여 실행되는 SPA(Single Page Application) 구조입니다.

Client (Browser): UI 렌더링, 학습 루프 상태 관리 (useState, useReducer).

Gemini API: 단어 데이터 생성, 퀴즈 출제, 주관식 채점 수행.

Firebase: 사용자 인증(익명), 단어 데이터 및 학습 상태 영구 저장.

### 2.2. 핵심 데이터 흐름

User Input -> Gemini API (Analysis) -> Firestore Save -> Learning Queue -> Quiz UI -> Gemini API (Grading) -> State Update

## 3. 데이터 모델링 (Firestore Schema)

### 3.1. Collections 구조

경로: /artifacts/{appId}/users/{userId}/words/{wordId}

### 3.2. Word Document 구조

{
  "word": "serendipity",
  "meaning": "뜻밖의 행운",
  "pronunciation": "/ˌser.ənˈdɪp.ə.ti/",
  "definitions": ["The occurrence of events by chance in a happy way."],
  "examples": [
    { "en": "Finding this restaurant was a pure serendipity.", "ko": "이 식당을 찾은 것은 정말 뜻밖의 행운이었다." }
  ],
  "synonyms": ["chance", "fluke"],
  "status": "LEARNING", // NEW, LEARNING, MASTERED
  "stats": {
    "step": 0, // 0: 학습전, 1: 퀴즈대기, 2: 검증대기
    "wrong_count": 0,
    "next_review_time": "Timestamp"
  },
  "createdAt": "Timestamp"
}


## 4. Gemini API 프롬프트 설계 (Prompt Engineering)

Gemini에게 요청할 3가지 핵심 Task의 프롬프트 구조입니다.

### 4.1. 단어 분석 (Word Analysis)

Input: 단어 (예: "ephemeral")

Prompt:

"Analyze the English word '${word}'. Return a JSON object with: korean_meaning (string), pronunciation (IPA string), definitions (array of strings), examples (array of objects with 'en', 'ko'), synonyms (array), antonyms (array). Ensure examples are context-rich."

Output: JSON Format

### 4.2. 퀴즈 생성 (Quiz Generation)

Input: 단어 데이터, 퀴즈 타입 (객관식/빈칸)

Prompt:

"Create a multiple-choice quiz for the word '${word}'.
If type is 'meaning', provide 3 distractors (wrong meanings).
If type is 'cloze', generate a short paragraph with a blank where '${word}' fits contextually, and provide 3 distractor words that fit grammatically but not semantically.
Return JSON: { question, options, answer_index, explanation }"

### 4.3. 하이브리드 채점 (Hybrid Grading)

Input: 정답 단어, 사용자 입력값

Prompt:

"Target word: '${target}'. User input: '${input}'.
Is the user input a valid synonym or semantically correct in a general context?
Return JSON: { is_correct: boolean, feedback: string }"

## 5. UI/UX 컴포넌트 구조

하나의 파일(App.js)에 포함될 주요 컴포넌트 목록입니다.

Layout: 전체 배경(Trust Blue), 헤더(로고), 푸터.

AuthGuard: Firebase 익명 로그인 처리 및 로딩 화면.

Dashboard: 학습 현황 요약, '단어 추가' 진입 버튼, '학습 시작' 버튼.

WordInput: 단어 입력 폼 & Gemini 로딩 인디케이터.

StudySession (핵심): 학습 루프를 제어하는 컨테이너.

FlashCard: 단어 학습 화면.

QuizView: 객관식/주관식/빈칸 퀴즈 렌더링.

ResultFeedback: 정답/오답 연출 및 해설.

## 6. 개발 단계 (Implementation Plan)

Phase 1: 기본 골격 및 단어 분석 (Word Analysis)

React + Firebase 세팅.

단어 입력 -> Gemini API 호출 -> 결과 파싱 -> Firestore 저장.

단어 목록(Dashboard) 표시.

Phase 2: 학습 루프 및 퀴즈 (Learning Loop)

학습 큐(Queue) 알고리즘 구현 (오답 시 뒤로 밀기).

객관식 퀴즈 UI 구현.

Phase 3: 심화 기능 (Advanced Features)

TOEFL 빈칸 문제 생성 프롬프트 적용.

하이브리드 채점(주관식) 로직 적용.

UI 디자인 폴리싱 (애니메이션, Tailwind 스타일링).