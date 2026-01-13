# Firebase 다중 인증 방식 설정 가이드

## 같은 이메일로 Google과 이메일/비밀번호 로그인 모두 사용하기

VocaLoop은 같은 이메일 주소로 여러 로그인 방식을 사용할 수 있도록 설계되었습니다. 이를 위해 Firebase Console에서 설정을 변경해야 합니다.

---

## 🔧 Firebase Console 설정 방법

### 1단계: Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. VocaLoop 프로젝트 선택

### 2단계: Authentication 설정 변경
1. 좌측 메뉴에서 **Authentication** 클릭
2. 상단 탭에서 **Settings** 클릭
3. **User account management** 섹션 찾기

### 3단계: 다중 계정 허용 설정
**Prevent creation of multiple accounts with the same email address** 옵션을 **비활성화(OFF)**합니다.

```
✅ OFF: Prevent creation of multiple accounts with the same email address
```

이 설정을 비활성화하면:
- ✓ 같은 이메일로 Google 로그인 가능
- ✓ 같은 이메일로 이메일/비밀번호 로그인 가능
- ✓ 사용자가 원하는 방식으로 로그인 선택 가능

### 4단계: Save 버튼 클릭
설정을 저장합니다.

---

## ⚠️ 주의사항

### 별도 계정으로 생성됨
이 설정을 사용하면 **같은 이메일이지만 별도의 Firebase 계정**이 생성됩니다:
- Google 로그인: `user-google-uid`
- 이메일/비밀번호: `user-email-uid`

각 계정은 **독립적인 데이터**를 가지게 됩니다.

### 사용자 데이터 통합이 필요한 경우
만약 같은 이메일의 Google 계정과 이메일/비밀번호 계정이 **같은 데이터를 공유**해야 한다면, 추가 구현이 필요합니다:

1. **Account Linking** (권장)
   - Firebase의 `linkWithCredential` API 사용
   - 하나의 계정에 여러 로그인 방식 연결
   - 같은 UID 사용으로 데이터 통합

2. **커스텀 데이터 마이그레이션**
   - 이메일 기반으로 데이터 병합 로직 구현
   - Firestore에서 이메일로 사용자 식별

---

## 🔐 보안 고려사항

### 이메일 검증
이 설정을 사용할 때는 이메일 검증이 중요합니다:
- Google 로그인: 자동으로 이메일 검증됨
- 이메일/비밀번호: `sendEmailVerification()` 구현 권장

### 피싱 방지
사용자가 의도치 않게 여러 계정을 만들지 않도록 UI에서 명확히 안내해야 합니다.

---

## 📚 참고 문서

- [Firebase 인증 가이드](https://firebase.google.com/docs/auth)
- [Account Linking](https://firebase.google.com/docs/auth/web/account-linking)
- [Multiple accounts per email](https://firebase.google.com/docs/auth/web/account-linking#prevent-creating-duplicate-user-accounts)

---

## ✅ 설정 완료 확인

설정이 완료되면:
1. 같은 이메일로 Google 로그인 → 성공
2. 로그아웃
3. 같은 이메일로 이메일/비밀번호 회원가입 → 성공
4. 두 방법 모두 로그인 가능

---

## 🆘 문제 해결

### "이미 가입된 이메일입니다" 에러가 발생하는 경우
- Firebase Console 설정이 아직 적용되지 않음
- 브라우저 캐시 및 쿠키 삭제 후 재시도
- Firebase Console에서 설정을 다시 확인

### 데이터가 공유되지 않는 경우
- 예상된 동작입니다 (별도 계정으로 생성됨)
- Account Linking 구현 필요
