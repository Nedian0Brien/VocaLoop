# Authentication 로직 리팩토링 및 Config 분리

## 🎯 목적
`App.jsx`에 집중된 Firebase 초기화, 인증 상태 관리, DB 리스너 로직을 분리하여 코드 복잡도를 낮추고 유지보수성을 향상시킵니다.

## 📝 세부 작업 내용

### 1. Firebase Config 분리
- **신규 파일**: `src/config/firebase.js`
- **내용**: `initializeApp`, `getAuth`, `getFirestore` 초기화 코드를 이동하고 `auth`, `db` 객체를 export

### 2. AuthContext 도입
- **신규 파일**: `src/contexts/AuthContext.jsx`
- **기능**:
    - `onAuthStateChanged` 리스너 관리
    - `user`, `loading` 상태 관리
    - `loginWithGoogle`, `logout` 함수 제공
- **적용**: `App.jsx`를 `AuthProvider`로 감싸고 하위 컴포넌트에서 `useAuth()` 훅 사용

### 3. App.jsx 다이어트
- 복잡한 `useEffect` 내의 Auth 로직 제거
- 단순히 라우팅 및 뷰(View)를 결정하는 역할에 집중

## ✅ 완료 조건
- [ ] `src/config/firebase.js` 생성 및 적용
- [ ] `AuthContext` 구현 및 `App.jsx` 적용
- [ ] 기존 기능(로그인, 로그아웃, 상태 유지) 정상 동작 확인
- [ ] `App.jsx` 코드 라인 수 30% 이상 감소
