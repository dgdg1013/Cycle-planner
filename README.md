# Cycle Planner

웹 기반 UI를 사용하지만, 로컬 데스크탑 앱(Tauri)으로 실행할 수 있습니다.

## 데스크탑 앱 실행 (권장)

사전 준비:
- Node.js 18+
- Rust (stable) 설치
- OS별 Tauri 빌드 의존성 설치

실행:

```bash
# repo root
./run-desktop.sh
```

Windows:

```bat
run-desktop.bat
```

직접 실행:

```bash
cd frontend
npm install
npm run desktop:dev
```

배포용 앱 빌드:

```bash
cd frontend
npm run desktop:build
```

## 웹으로 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속
