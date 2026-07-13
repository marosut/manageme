# ManageMe

React, Vite, TypeScript, Supabase 기반 일정관리 앱입니다.

## 운영 Supabase 스키마

현재 운영 DB는 기존 데이터를 유지해야 하므로 테이블 생성, 테이블명 변경, 대량 마이그레이션을 실행하지 않습니다.

앱은 아래 기존 테이블만 사용합니다.

- `public.schedules`
- `public.todos`
- `public.routines`
- `public.routine_completions`

시간표는 날짜별 일정이 아니라 요일별 고정 시간표입니다. `schedules.day_of_week`는 `0 = 일요일`, `1 = 월요일`, ..., `6 = 토요일` 규칙을 사용하고, `start_time`/`end_time`은 UTC 변환 없이 사용자가 입력한 `HH:mm` 값을 그대로 저장합니다.

```text
schedules
- id
- user_id
- day_of_week
- start_time
- end_time
- title
- category
- memo
- created_at
```

할 일은 `todos` 테이블을 유지하며, 시간 있는 할 일과 시간 없는 할 일을 같은 테이블에서 구분합니다.

```text
todos
- id
- user_id
- date
- title
- text
- has_time
- task_time
- completed
- memo
- created_at
```

루틴 완료 기록은 `routine_completions.completed_date`를 기준으로 계산합니다.

```text
routine_completions
- id
- user_id
- routine_id
- completed_date
- completed_at
```

모든 조회, 추가, 수정, 삭제 요청은 로그인 사용자 기준 `user_id` 조건을 포함합니다. Supabase RLS 정책은 각 사용자가 자신의 데이터만 접근하도록 유지되어야 합니다.

## 비파괴 마이그레이션

운영 DB에 필요한 컬럼을 추가하고 기존 데이터를 보존하려면 Supabase SQL Editor에서 아래 파일을 실행합니다.

```text
db/migrations/20260710_fixed_weekly_schedules_and_timed_todos.sql
```

이 마이그레이션은 기존 테이블을 새로 만들거나 기존 컬럼을 삭제하지 않습니다. `start_at`, `end_at`, `description`, `text` 같은 기존 컬럼은 보존하면서 새 컬럼을 backfill합니다.

## Google 로그인 설정

Supabase Authentication > Providers > Google에서 Google 로그인을 활성화하고, 앱 콜백 URL을 Redirect URLs에 등록합니다.

로컬 개발 환경의 콜백 URL 예시는 다음과 같습니다.

```text
http://localhost:5173/auth/callback
```

## 개발 명령

```bash
npm install
npm run lint
npm run build
```
