# 🐛 Vite 빌드 캐시로 인한 변경 미반영 문제

| 항목 | 내용 |
|------|------|
| 📅 **발생일** | 2025-12-10 |
| ✅ **상태** | 해결됨 |

---

## 📋 개요

React 컴포넌트를 수정했으나 Vite 빌드 캐시로 인해 프로덕션 빌드에 변경 사항이 반영되지 않는 문제가 발생했습니다.

---

## 🔍 증상

- ❌ `Header.jsx` 컴포넌트를 수정했으나 프로덕션에 반영되지 않음
- ❌ `npm run build`를 여러 번 실행해도 빌드 파일 해시가 **동일하게 유지**
  ```
  dist/assets/index-c87f-nK0.js  # 변경 전후 동일한 해시
  ```
- ❌ 브라우저 강력 새로고침(`Ctrl+Shift+R`)도 효과 없음
- ❌ `dist` 폴더를 삭제 후 재빌드해도 동일한 해시 생성

---

## 🎯 원인

Vite의 빌드 캐시(`node_modules/.vite`)가 이전 모듈 상태를 유지하여 **변경된 파일이 재컴파일되지 않음**.

```
📁 node_modules/
└── 📁 .vite/          ← 🚨 여기에 캐시가 남아있음
    └── deps/
    └── ...
```

---

## 💡 해결 방법

### 1️⃣ 즉시 해결 (터미널)

```bash
rm -rf node_modules/.vite dist && npm run build
```

### 2️⃣ 영구 해결 (스크립트 추가)

`package.json`에 다음 스크립트 추가:

```json
{
  "scripts": {
    "clean": "rm -rf node_modules/.vite dist",
    "build:clean": "rm -rf node_modules/.vite dist && vite build"
  }
}
```

**사용 방법:**
```bash
# 🧹 캐시 문제 의심 시 클린 빌드
npm run build:clean && pm2 restart voca-loop
```

---

## 🛡️ 예방책

| 권장 사항 | 설명 |
|----------|------|
| 🧹 주요 변경 후 클린 빌드 | `npm run build:clean` 사용 권장 |
| 🔍 해시 확인 | 빌드 후 파일 해시가 변경되었는지 확인 |
| ⚠️ 캐시 의심 | 변경 미반영 시 즉시 Vite 캐시 삭제 고려 |

---

## 📂 관련 파일

- `package.json` - 빌드 스크립트 정의
- `node_modules/.vite/` - Vite 캐시 디렉토리
- `dist/` - 빌드 결과물
