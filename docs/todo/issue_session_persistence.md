# 로그인 세션 지속성(Persistence) 설정 강화

## 🎯 목적
현재 새로고침이나 브라우저 재시작 시 로그인 상태 복원이 매끄럽지 않거나, 명시적인 설정 부재로 인한 UX 저하를 방지합니다. 사용자가 브라우저를 닫았다 열어도 로그인이 유지되도록 합니다.

## 📝 세부 작업 내용

### 1. `setPersistence` 적용
- **파일**: `src/App.jsx` (또는 리팩토링 후 `src/config/firebase.js`)
- **내용**:
    ```javascript
    import { setPersistence, browserLocalPersistence } from "firebase/auth";
    
    // Auth 초기화 직후 호출
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            // 기존 로그인 로직...
        })
        .catch((error) => {
            console.error("Persistence error:", error);
        });
    ```

### 2. 세션 상태 로딩 처리 개선
- Auth 상태 확인 전(`loading` 상태)에 불필요하게 로그인 화면이 잠깐 노출되는 현상(Flicker) 방지
- 전역 로딩 인디케이터 UX 점검

## ✅ 완료 조건
- [ ] `browserLocalPersistence` 설정 적용 완료
- [ ] 브라우저 종료 후 재접속 시 로그인 유지 확인
- [ ] 새 탭 열기 시 로그인 유지 확인
