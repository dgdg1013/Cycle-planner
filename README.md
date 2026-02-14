# Cycle Planner (Web)

웹 기반 일정 관리 앱입니다.

- Goal/Work/Task 데이터는 브라우저 로컬 및 사용자가 선택한 폴더의 `cycle_data.json`에 저장됩니다.
- 서버 저장은 사용하지 않습니다.

## 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 폴더 저장/불러오기

- `저장 폴더 선택`: 브라우저 폴더 선택 창 열림
- `생성`: 선택한 폴더 아래 `사이클명_xxxxxx/cycle_data.json` 생성
- `폴더에서 불러오기`: 폴더 선택 창에서 기존 Cycle 폴더 선택 후 로드

## 주의

브라우저 폴더 API(File System Access API)가 필요합니다.
Chrome/Edge 최신 버전 사용을 권장합니다.
