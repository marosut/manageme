import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { AchievementCard } from "./components/AchievementCard";
import { Header } from "./components/Header";
import { RoutineList } from "./components/RoutineList";
import { SchedulePanel } from "./components/SchedulePanel";
import { TodoList } from "./components/TodoList";
import { useAuth } from "./hooks/useAuth";
import { useRoutines } from "./hooks/useRoutines";
import { useSchedules } from "./hooks/useSchedules";
import { useTodos } from "./hooks/useTodos";
import type { Achievement, ChartPoint, UserInfo } from "./types/app";
import { kstDate } from "./utils/date";

const Statistics = lazy(() =>
  import("./components/Statistics").then((module) => ({ default: module.Statistics }))
);

type LoginScreenProps = {
  authError: string | null;
  isLoadingUser: boolean;
  onLogin: () => Promise<void>;
};

type ScheduleAppProps = {
  user: UserInfo;
  isLoadingUser: boolean;
  authError: string | null;
  onSignOut: () => Promise<void>;
};

function LoginScreen({ authError, isLoadingUser, onLogin }: LoginScreenProps) {
  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="auth-kicker">일정관리 앱</p>
        <h1 id="login-title" className="auth-title">
          로그인 후 일정을 관리하세요
        </h1>
        <p className="auth-description">
          Google 계정으로 로그인하면 저장된 일정, 할 일, 루틴을 바로 불러옵니다.
        </p>
        <button
          type="button"
          className="google-login-button"
          onClick={onLogin}
          disabled={isLoadingUser}
        >
          Google로 로그인
        </button>
        {authError && <p className="auth-error">{authError}</p>}
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-live="polite">
        <p className="auth-kicker">일정관리 앱</p>
        <h1 className="auth-title">로그인 상태 확인 중</h1>
        <p className="auth-description">잠시만 기다려주세요.</p>
      </section>
    </main>
  );
}

function AuthCallbackScreen({ authError }: { authError: string | null }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-live="polite">
        <p className="auth-kicker">Google login</p>
        <h1 className="auth-title">Finishing sign in</h1>
        <p className="auth-description">
          We are checking your Google login and preparing your session.
        </p>
        {authError && <p className="auth-error">{authError}</p>}
      </section>
    </main>
  );
}

function ScheduleApp({ user, isLoadingUser, authError, onSignOut }: ScheduleAppProps) {
  const [selectedDate, setSelectedDate] = useState(() => kstDate());
  const {
    schedules,
    scheduleForm,
    setScheduleForm,
    addSchedule,
    deleteSchedule,
    isLoadingSchedules,
    isSavingSchedule,
    scheduleError,
  } = useSchedules(user.id, selectedDate);
  const {
    todos,
    todoForm,
    setTodoForm,
    addTodo,
    toggleTodo,
    deleteTodo,
    isLoadingTodos,
    isSavingTodo,
    todoError,
  } = useTodos(user.id);
  const {
    routines,
    routineName,
    setRoutineName,
    addRoutine,
    toggleRoutine,
    deleteRoutine,
  } = useRoutines();

  const selectedSchedules = useMemo(
    () => schedules,
    [schedules]
  );
  const selectedTodos = useMemo(
    () => todos.filter((todo) => todo.date === selectedDate),
    [todos, selectedDate]
  );
  const selectedRoutines = useMemo(
    () => routines.filter((routine) => routine.createdAt <= selectedDate),
    [routines, selectedDate]
  );

  const achievement = useMemo<Achievement>(() => {
    const doneTodos = selectedTodos.filter((todo) => todo.completed).length;
    const doneRoutines = selectedRoutines.filter(
      (routine) => routine.completions[selectedDate]
    ).length;

    const todoRate = selectedTodos.length
      ? Math.round((doneTodos / selectedTodos.length) * 100)
      : 0;
    const routineRate = selectedRoutines.length
      ? Math.round((doneRoutines / selectedRoutines.length) * 100)
      : 0;
    const totalRate =
      selectedTodos.length || selectedRoutines.length
        ? Math.round((todoRate + routineRate) / 2)
        : 0;

    return { doneTodos, doneRoutines, todoRate, routineRate, totalRate };
  }, [selectedTodos, selectedRoutines, selectedDate]);

  const getRateByDate = useCallback(
    (date: string) => {
      const dayTodos = todos.filter((todo) => todo.date === date);
      const dayRoutines = routines.filter((routine) => routine.createdAt <= date);

      const todoRate = dayTodos.length
        ? Math.round((dayTodos.filter((todo) => todo.completed).length / dayTodos.length) * 100)
        : 0;
      const routineRate = dayRoutines.length
        ? Math.round(
            (dayRoutines.filter((routine) => routine.completions[date]).length /
              dayRoutines.length) *
              100
          )
        : 0;

      return dayTodos.length || dayRoutines.length ? Math.round((todoRate + routineRate) / 2) : 0;
    },
    [todos, routines]
  );

  const weeklyData = useMemo<ChartPoint[]>(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const dateValue = new Date(`${selectedDate}T00:00:00`);
        dateValue.setDate(dateValue.getDate() - (6 - index));
        const date = kstDate(dateValue);

        return { date: date.slice(5), rate: getRateByDate(date) };
      }),
    [getRateByDate, selectedDate]
  );

  const monthlyData = useMemo<ChartPoint[]>(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    return Array.from({ length: lastDay }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      const date = `${year}-${String(month).padStart(2, "0")}-${day}`;

      return { date: String(index + 1), rate: getRateByDate(date) };
    });
  }, [getRateByDate, selectedDate]);

  const handleAddSchedule = useCallback(() => {
    addSchedule();
  }, [addSchedule]);

  const handleAddTodo = useCallback(() => {
    addTodo(selectedDate);
  }, [addTodo, selectedDate]);

  const handleAddRoutine = useCallback(() => {
    addRoutine(selectedDate);
  }, [addRoutine, selectedDate]);

  const handleToggleRoutine = useCallback(
    (routineId: string) => {
      toggleRoutine(routineId, selectedDate);
    },
    [selectedDate, toggleRoutine]
  );

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Header
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          isLoadingUser={isLoadingUser}
          authError={authError}
          onSignOut={onSignOut}
        />

        <section className="grid gap-6 lg:grid-cols-3">
          <AchievementCard
            achievement={achievement}
            todoCount={selectedTodos.length}
            routineCount={selectedRoutines.length}
          />
          <TodoList
            todos={selectedTodos}
            todoForm={todoForm}
            isLoading={isLoadingTodos}
            isSaving={isSavingTodo}
            error={todoError}
            onTodoFormChange={setTodoForm}
            onAddTodo={handleAddTodo}
            onToggleTodo={toggleTodo}
            onDeleteTodo={deleteTodo}
          />
          <RoutineList
            routines={selectedRoutines}
            routineName={routineName}
            selectedDate={selectedDate}
            onRoutineNameChange={setRoutineName}
            onAddRoutine={handleAddRoutine}
            onToggleRoutine={handleToggleRoutine}
            onDeleteRoutine={deleteRoutine}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SchedulePanel
            schedules={selectedSchedules}
            scheduleForm={scheduleForm}
            isLoading={isLoadingSchedules}
            isSaving={isSavingSchedule}
            error={scheduleError}
            onScheduleFormChange={setScheduleForm}
            onAddSchedule={handleAddSchedule}
            onDeleteSchedule={deleteSchedule}
          />
          <Suspense
            fallback={
              <section className="rounded-3xl bg-white p-4 text-slate-500 shadow-sm ring-1 ring-slate-200 sm:p-5">
                그래프를 불러오는 중입니다.
              </section>
            }
          >
            <Statistics weeklyData={weeklyData} monthlyData={monthlyData} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

export default function App() {
  const {
    session,
    user,
    isLoadingUser,
    authError,
    isAuthCallback,
    signInWithGoogle,
    signOut,
  } = useAuth();

  if (isLoadingUser) {
    return <LoadingScreen />;
  }

  if (isAuthCallback && (!session || !user)) {
    return <AuthCallbackScreen authError={authError} />;
  }

  if (!session || !user) {
    return (
      <LoginScreen
        authError={authError}
        isLoadingUser={isLoadingUser}
        onLogin={signInWithGoogle}
      />
    );
  }

  return (
    <ScheduleApp
      user={user}
      isLoadingUser={isLoadingUser}
      authError={authError}
      onSignOut={signOut}
    />
  );
}
