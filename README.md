# React + TypeScript + Vite

## Supabase Google OAuth setup

The Google login button uses this OAuth provider value:

```ts
supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

If Supabase returns `Unsupported provider: provider is not enabled`, finish the provider setup:

- In Supabase Dashboard, go to Authentication > Providers > Google and enable Google.
- In Google Cloud Console, create an OAuth Client ID and Client Secret, then enter them in the Supabase Google provider settings.
- Add the callback URL shown by Supabase to the authorized redirect URIs for the Google OAuth client.
- Add your app callback URL, such as `http://localhost:5173/auth/callback`, to Supabase Authentication > URL Configuration > Redirect URLs.

## Supabase schedule and task tables

The timetable uses `public.schedules` as a fixed weekly schedule. It is based on weekday and `time` values, not dates or timestamps.

```sql
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  title text not null,
  category text,
  memo text,
  created_at timestamptz default now()
);
```

`day_of_week` uses `0 = Sunday`, `1 = Monday`, through `6 = Saturday`. The app filters schedules by the selected date's weekday, so a Monday schedule appears on every Monday and not on Tuesday. `start_time` and `end_time` are stored as plain `HH:mm` time values. No UTC/KST timezone conversion is applied to fixed schedules.

Date-specific tasks use `public.tasks`:

```sql
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_date date not null,
  title text not null,
  has_time boolean not null default false,
  task_time time null,
  completed boolean not null default false,
  memo text,
  created_at timestamptz default now()
);
```

When `has_time` is `false`, `task_time` is saved as `null`. Timed tasks are sorted by `task_time`, and untimed tasks are shown in a separate section.

If Row Level Security is enabled, add policies like these so each user can access only their own schedules:

```sql
alter table public.schedules enable row level security;

create policy "schedules_select"
on public.schedules for select
using (auth.uid() = user_id);

create policy "schedules_insert"
on public.schedules for insert
with check (auth.uid() = user_id);

create policy "schedules_update"
on public.schedules for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "schedules_delete"
on public.schedules for delete
using (auth.uid() = user_id);

alter table public.tasks enable row level security;

create policy "tasks_select"
on public.tasks for select
using (auth.uid() = user_id);

create policy "tasks_insert"
on public.tasks for insert
with check (auth.uid() = user_id);

create policy "tasks_update"
on public.tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tasks_delete"
on public.tasks for delete
using (auth.uid() = user_id);
```

If an older `schedules` table contains date/timestamp columns such as `date`, `start_at`, `end_at`, `starttime`, or `endtime`, migrate carefully after backing up data:

```sql
alter table public.schedules
  add column if not exists day_of_week int,
  add column if not exists start_time time,
  add column if not exists end_time time;

-- Backfill manually as needed, then enforce the new shape.
alter table public.schedules
  alter column day_of_week set not null,
  alter column start_time set not null,
  alter column end_time set not null;

alter table public.schedules
  drop column if exists date,
  drop column if exists start_at,
  drop column if exists end_at,
  drop column if exists starttime,
  drop column if exists endtime;

-- If an older todos table exists, create tasks first and copy what can be preserved.
insert into public.tasks (id, user_id, task_date, title, has_time, task_time, completed, memo, created_at)
select id, user_id, date, text, false, null, completed, null, created_at
from public.todos
on conflict (id) do nothing;
```

When saving fails, the app now prints Supabase `error.message`, `error.details`, and `error.hint` in the browser console and shows the readable error on the timetable screen.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
