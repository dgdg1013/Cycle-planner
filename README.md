# Cycle

Cycle is a planning app that runs on both Web (React/Vite) and Desktop (Tauri).

## English Guide

### For End Users (No Build Needed)

If you only want to use the app and already have a built installer, just run the `.msi` file.
You do not need Node.js, Rust, or any build setup.
Installer path:
- `frontend/src-tauri/target/release/bundle/msi/`

Installer file:
- `frontend/src-tauri/target/release/bundle/msi/Cycle_0.1.0_x64_en-US.msi`

### Prerequisites

Required for all modes:
- Node.js 18+
- npm

Additional requirements for desktop build:
- Rust (stable): https://rustup.rs
- Windows:
  - Visual Studio 2022 Build Tools
  - Install components: `Desktop development with C++`, `MSVC v143`, `Windows 10/11 SDK`
- Linux/macOS:
  - Follow Tauri prerequisites: https://v2.tauri.app/start/prerequisites/

### Run Web App (Dev Server)

```bash
cd frontend
npm install
npm run dev
```

Open:
- `http://localhost:5173`

### Build Desktop Installer

```bash
cd frontend
npm install
npm run desktop:build
```

Build outputs:
- Binary: `frontend/src-tauri/target/release/`
- Installer packages: `frontend/src-tauri/target/release/bundle/`

### Run Desktop App in Dev Mode (Hot Reload)

```bash
cd frontend
npm install
npm run desktop:dev
```

### Troubleshooting

- `tauri: not found` or `Tauri CLI is missing`:
  - Run `cd frontend && npm install`
- `cargo: command not found`:
  - Install Rust from https://rustup.rs
- `link.exe not found` or `the msvc targets depend on the msvc linker` (Windows):
  - Install Visual Studio 2022 Build Tools + C++/MSVC/Windows SDK
- `` `icons/icon.ico` not found ``:
  - Confirm `frontend/src-tauri/icons/icon.ico` exists

## 한국어 안내

웹(React/Vite)과 데스크탑(Tauri)으로 실행 가능한 일정 관리 앱입니다.

### 일반 사용자용 (빌드 불필요)

이미 빌드된 설치 파일이 있으면 `.msi` 파일만 실행하면 됩니다.
Node.js, Rust, 빌드 환경은 필요 없습니다.
설치 파일 경로:
- `frontend/src-tauri/target/release/bundle/msi/`
설치 파일:
- `frontend/src-tauri/target/release/bundle/msi/Cycle_0.1.0_x64_en-US.msi`

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
