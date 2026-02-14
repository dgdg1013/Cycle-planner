# Cycle

웹과 데스크탑(Tauri) 둘 다 실행 가능한 일정 관리 앱입니다.

## 데스크탑 앱 (아이콘 더블클릭 실행)

사전 준비:
- Node.js 18+
- Rust (stable)
- Windows의 경우: Visual Studio 2022 Build Tools (C++/MSVC + Windows SDK)
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

직접 빌드(스크립트 없이):

```bash
cd frontend
npm install
npm run desktop:build
```

직접 빌드(Windows PowerShell/CMD):

```bat
cd frontend
npm install
npm run desktop:build
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
- `link.exe not found` 또는 `the msvc targets depend on the msvc linker`:
  - Visual Studio 2022 Build Tools 설치
  - 설치 시 `Desktop development with C++`, `MSVC v143`, `Windows 10/11 SDK` 선택
  - 설치 후 `x64 Native Tools Command Prompt for VS 2022`에서 다시 빌드
- `` `icons/icon.ico` not found ``:
  - `frontend/src-tauri/icons/icon.ico` 파일이 필요함
  - 현재 저장소에는 기본 아이콘이 포함되어 있으니 최신 코드로 다시 시도

## 웹 실행 (기존 유지)

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속
