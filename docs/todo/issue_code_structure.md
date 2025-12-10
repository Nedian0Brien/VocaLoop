# 코드 구조 개선 (Service Layer 도입 및 상수 분리)

## 🎯 목적
비즈니스 로직(데이터 처리)과 UI 로직을 분리하고, 하드코딩된 값들을 중앙에서 관리하여 코드의 재사용성과 가독성을 높입니다.

## 📝 세부 작업 내용

### 1. Service Layer 도입 (`src/services/`)
- **WordService (`src/services/wordService.js`)**:
    - `fetchWords(userId)`: 단어 목록 가져오기
    - `addWord(userId, wordData)`: 단어 추가
    - `deleteWord(userId, wordId)`: 단어 삭제
    - `updateWordStats(...)`: 학습 통계 업데이트
- **적용**: 컴포넌트(`App.jsx`, `WordCard.jsx`)에서 직접 Firestore SDK를 호출하지 않고 Service 함수 호출로 변경

### 2. 상수 관리 (`src/constants/`)
- **신규 파일**: `src/constants/index.js` (또는 기능별 분리)
- **내용**:
    - 앱 설정 (App ID 등)
    - UI 텍스트 메시지
    - 기본 설정값 (Notification 타임아웃 등)
    - Enum 값 (단어 상태 등)

### 3. 컴포넌트 리팩토링
- 분리된 Service와 Constant를 사용하여 컴포넌트 코드 정리

## ✅ 완료 조건
- [ ] `src/services/wordService.js` 구현
- [ ] `src/constants/` 디렉토리 생성 및 상수 이관
- [ ] 주요 컴포넌트(`App.jsx`) 리팩토링 완료
- [ ] 리팩토링 후 기존 기능(CRUD) 정상 동작 검증
