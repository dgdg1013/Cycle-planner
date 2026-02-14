# Cycle

웹과 데스크탑(Tauri) 둘 다 실행 가능한 일정 관리 앱입니다.

## 데스크탑 앱 (아이콘 더블클릭 실행)

사전 준비:
- Node.js 18+
- Rust (stable)
- OS별 Tauri 빌드 의존성

### 1) 데스크탑 앱 빌드

Windows:
```bat
build-desktop.bat
```

Linux/macOS:
```bash
./build-desktop.sh
```

빌드 결과:
- 실행 파일: `frontend/src-tauri/target/release/`
- 설치 파일(아이콘 기반 설치): `frontend/src-tauri/target/release/bundle/`

### 2) 더블클릭 실행

Windows:
- `launch-desktop.bat` 더블클릭
- (실행 파일이 없으면 자동 빌드 후 실행 시도)

Linux/macOS:
```bash
./launch-desktop.sh
```

문제 해결:
- `tauri: not found` 또는 `Tauri CLI is missing`:
  - `cd frontend && npm install`
- `cargo: command not found`:
  - Rust 설치: https://rustup.rs

## 웹 실행 (기존 유지)

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속
