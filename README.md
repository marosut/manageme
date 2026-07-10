# ManageMe

React, Vite, TypeScript, Supabase 기반 일정관리 앱입니다.

## 운영 Supabase 스키마

현재 운영 DB는 기존 데이터를 유지해야 하므로 테이블 생성, 테이블명 변경, 대량 마이그레이션을 실행하지 않습니다.

앱은 아래 기존 테이블만 사용합니다.

- `public.schedules`
- `public.todos`
- `public.routines`
- `public.routine_completions`

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
