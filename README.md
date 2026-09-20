# OmniAlarm - 통합 모니터링 시스템

목장, 공장, 사무실 등 모든 현장의 전기/인터넷/장비 상태를 실시간으로 모니터링하는 MSA 기반 알람 시스템.

---

## 배포 가이드 (Vercel + Railway)

### 사전 준비
- [GitHub](https://github.com) 계정
- [Railway](https://railway.app) 계정
- [Vercel](https://vercel.com) 계정

---

### Step 1. GitHub에 코드 올리기

```bash
cd C:\programing\FarmAlarm
git init
git add .
git commit -m "initial commit"
# GitHub에서 새 repo 생성 후:
git remote add origin https://github.com/YOUR_USERNAME/farm-alarm.git
git push -u origin main
```

---

### Step 2. Railway — 백엔드 + DB 배포

1. [railway.app](https://railway.app) 접속 → **New Project**
2. **Deploy from GitHub repo** → `farm-alarm` 선택
3. **Root Directory** → `backend` 설정
4. **Add Service → Database → PostgreSQL** 추가
5. 백엔드 서비스의 **Variables** 탭에서 환경변수 추가:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Railway PostgreSQL이 자동 주입 (이미 있음) |
   | `JWT_SECRET` | 랜덤한 긴 문자열 (예: `openssl rand -hex 32` 결과) |
   | `FRONTEND_URL` | Vercel 배포 후 주소 (Step 3 완료 후 추가) |

6. **Deploy** → 배포 완료 후 서비스 URL 복사 (예: `https://farm-alarm-backend.up.railway.app`)

7. Railway 콘솔에서 DB 초기화:
   ```bash
   # Railway 서비스 대시보드 → Shell 탭 실행
   npx prisma db push
   node prisma/seed.js
   ```

---

### Step 3. Vercel — 프론트엔드 배포

1. [vercel.com](https://vercel.com) 접속 → **Add New Project**
2. GitHub repo `farm-alarm` 선택
3. **Root Directory** → `frontend` 설정
4. **Environment Variables** 추가:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | Railway 백엔드 URL (예: `https://farm-alarm-backend.up.railway.app`) |

5. **Deploy** → 완료 후 Vercel 주소 확인 (예: `https://farm-alarm.vercel.app`)

6. Railway 백엔드로 돌아가서 `FRONTEND_URL` 환경변수에 Vercel 주소 입력 후 재배포.

---

### Step 4. 초기 로그인

- URL: Vercel 배포 주소 접속
- 이메일: `admin@farmalarm.com`
- 비밀번호: `admin1234`

> 로그인 후 반드시 비밀번호를 변경하세요.

---

## 로컬 개발 실행

### 백엔드
```bash
cd backend
cp .env.example .env
# .env 파일에서 DATABASE_URL 설정

npm install
npx prisma db push
node prisma/seed.js
npm run dev
# http://localhost:3001
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## 현장 에이전트 (Heartbeat) 설정

현장 라즈베리파이 또는 PC에서 아래 스크립트를 cron으로 실행:

### Linux (라즈베리파이)

```bash
# heartbeat.sh
#!/bin/bash
curl -s -X POST https://your-backend.up.railway.app/api/heartbeat/farm-agent-001

# crontab -e 에 추가 (1분마다 실행):
# * * * * * /home/pi/heartbeat.sh
```

### Windows (PowerShell)

```powershell
# heartbeat.ps1
Invoke-RestMethod -Method POST -Uri "https://your-backend.up.railway.app/api/heartbeat/farm-agent-001"

# 작업 스케줄러에서 1분마다 실행 등록
```

> 에이전트 ID (`farm-agent-001`)는 OmniAlarm 모니터 설정에서 등록한 것과 일치해야 합니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **대시보드** | 전체 현장 상태 한눈에 보기 |
| **URL 모니터** | URL 주기적 폴링, HTTP 오류/응답 패턴 감지 |
| **Heartbeat 모니터** | 현장 에이전트 생존 신호 감지 (3분 무응답 시 알람) |
| **실시간 알람** | WebSocket으로 알람 즉시 수신, 화면 토스트 알림 |
| **알람 관리** | 확인/해결 처리, 이력 조회 |
| **연락처 관리** | 현장별 담당자, 우선순위(1차/2차) 관리 |
| **현장 관리** | 목장, 사무실 등 현장 추가/관리 |

---

## 향후 추가 예정 (Phase 2)

- 온습도/CO2 센서 연동 (라즈베리파이 GPIO)
- 기상청 API 날씨 모니터링
- 카카오톡 알림톡 발송
- 에스컬레이션 (미확인 시 2차 담당자 자동 알람)
- UPS 배터리 상태 모니터링
