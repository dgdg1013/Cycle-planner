# Cycle

웹(React/Vite)과 데스크탑(Tauri)으로 실행 가능한 일정 관리 앱입니다.

## Prerequisites

공통:
- Node.js 18 이상
- npm

데스크탑 빌드 추가 요구사항:
- Rust (stable): https://rustup.rs
- Windows:
  - Visual Studio 2022 Build Tools
  - 설치 옵션: `Desktop development with C++`, `MSVC v143`, `Windows 10/11 SDK`
- Linux/macOS:
  - Tauri 공식 prerequisites 참고: https://v2.tauri.app/start/prerequisites/

## 웹 실행 (개발 서버)

```bash
cd frontend
npm install
npm run dev
```

브라우저 접속:
- `http://localhost:5173`

## 데스크탑 빌드 (설치 파일 생성)

```bash
cd frontend
npm install
npm run desktop:build
```

빌드 결과물:
- 실행 파일: `frontend/src-tauri/target/release/`
- 설치 파일: `frontend/src-tauri/target/release/bundle/`

## 데스크탑 개발 실행 (핫리로드)

```bash
cd frontend
npm install
npm run desktop:dev
```

## Troubleshooting

- `tauri: not found` 또는 `Tauri CLI is missing`:
  - `cd frontend && npm install`
- `cargo: command not found`:
  - Rust 설치 확인: https://rustup.rs
- `link.exe not found` 또는 `the msvc targets depend on the msvc linker` (Windows):
  - Visual Studio 2022 Build Tools + C++/MSVC/Windows SDK 설치 확인
- `` `icons/icon.ico` not found ``:
  - `frontend/src-tauri/icons/icon.ico` 파일 존재 확인
