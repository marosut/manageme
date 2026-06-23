import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "./lib/supabase";

type ScheduleItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  memo: string;
};

type TodoItem = {
  id: string;
  date: string;
  text: string;
  completed: boolean;
};

type RoutineItem = {
  id: string;
  name: string;
  createdAt: string;
  completions: Record<string, boolean>;
};

type AppData = {
  schedules: ScheduleItem[];
  todos: TodoItem[];
  routines: RoutineItem[];
};

type UserInfo = {
  id: string;
};

type Schedule = any;
type Todo = any;
type Routine = any;

const kstDate = (date = new Date()) => {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

const kstTodayText = () =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

const id = () => crypto.randomUUID();

const defaultData: AppData = {
  schedules: [],
  todos: [],
  routines: [
    { id: id(), name: "운동", createdAt: kstDate(), completions: {} },
    { id: id(), name: "공부", createdAt: kstDate(), completions: {} },
    { id: id(), name: "수면", createdAt: kstDate(), completions: {} },
    { id: id(), name: "식단", createdAt: kstDate(), completions: {} },
  ],
};

export default function App() {
  const today = kstDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [routines, setRoutines] = useState<Routine[]>(defaultData.routines);

  const [scheduleForm, setScheduleForm] = useState({
    startTime: "",
    endTime: "",
    title: "",
    category: "",
    memo: "",
  });

  const [todoText, setTodoText] = useState("");
  const [routineName, setRoutineName] = useState("");

  useEffect(() => {
    const loadUserAndData = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("getSession error:", sessionError);
        setAuthError("로그인 정보를 가져오는 중 오류가 발생했습니다.");
        return;
      }

      const currentUser = sessionData?.session?.user;
      if (!currentUser) {
        console.error("No logged in user found.");
        setAuthError("로그인이 필요합니다.");
        return;
      }

      setUser({ id: currentUser.id });
      await fetchUserData(currentUser.id);
    };

    loadUserAndData();
  }, []);

  const fetchUserData = async (userId: string) => {
    const schedulesResult = await supabase
      .from("schedules")
      .select("id,date,startTime,endTime,title,category,memo")
      .eq("user_id", userId)
      .order("startTime", { ascending: true });

    const todosResult = await supabase
      .from("todos")
      .select("id,date,text,completed")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (schedulesResult.error) {
      console.error("schedules select error:", schedulesResult.error);
    }
    if (todosResult.error) {
      console.error("todos select error:", todosResult.error);
    }

    setSchedules(schedulesResult.data ?? []);
    setTodos(todosResult.data ?? []);
  };

  const addSchedule = async () => {
    if (!user) {
      console.error("No Supabase user available for schedule insert.");
      return;
    }

    if (!scheduleForm.startTime || !scheduleForm.endTime || !scheduleForm.title.trim()) return;

    const { data: inserted, error } = await supabase
      .from("schedules")
      .insert([
        {
          user_id: user.id,
          date: selectedDate,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          title: scheduleForm.title,
          category: scheduleForm.category,
          memo: scheduleForm.memo,
        },
      ])
      .select("id,date,startTime,endTime,title,category,memo")
      .single();

    if (error) {
      console.error("schedule insert error:", error);
      return;
    }

    if (inserted) {
      setSchedules((prev) => [...prev, inserted]);
      setScheduleForm({ startTime: "", endTime: "", title: "", category: "", memo: "" });
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!user) {
      console.error("No Supabase user available for schedule delete.");
      return;
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("user_id", user.id);

    if (error) {
      console.error("schedule delete error:", error);
      return;
    }

    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
  };

  const addTodo = async () => {
    if (!user) {
      console.error("No Supabase user available for todo insert.");
      return;
    }

    if (!todoText.trim()) return;

    const { data: inserted, error } = await supabase
      .from("todos")
      .insert([
        {
          user_id: user.id,
          date: selectedDate,
          text: todoText,
          completed: false,
        },
      ])
      .select("id,date,text,completed")
      .single();

    if (error) {
      console.error("todo insert error:", error);
      return;
    }

    if (inserted) {
      setTodos((prev) => [...prev, inserted]);
      setTodoText("");
    }
  };

  const toggleTodo = async (todoId: string) => {
    if (!user) {
      console.error("No Supabase user available for todo update.");
      return;
    }

    const currentTodo = todos.find((todo) => todo.id === todoId);
    if (!currentTodo) return;

    const { data: updated, error } = await supabase
      .from("todos")
      .update({ completed: !currentTodo.completed })
      .eq("id", todoId)
      .eq("user_id", user.id)
      .select("id,date,text,completed")
      .single();

    if (error) {
      console.error("todo update error:", error);
      return;
    }

    if (updated) {
      setTodos((prev) => prev.map((t) => (t.id === todoId ? updated : t)));
    }
  };

  const deleteTodo = async (todoId: string) => {
    if (!user) {
      console.error("No Supabase user available for todo delete.");
      return;
    }

    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", todoId)
      .eq("user_id", user.id);

    if (error) {
      console.error("todo delete error:", error);
      return;
    }

    setTodos((prev) => prev.filter((t) => t.id !== todoId));
  };

  const addRoutine = () => {
    if (!routineName.trim()) return;

    setRoutines((prev) => [
      ...prev,
      { id: id(), name: routineName, createdAt: selectedDate, completions: {} },
    ]);

    setRoutineName("");
  };

  const toggleRoutine = (routineId: string) => {
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId
          ? {
              ...r,
              completions: {
                ...r.completions,
                [selectedDate]: !r.completions[selectedDate],
              },
            }
          : r
      )
    );
  };

  const deleteRoutine = (routineId: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== routineId));
  };

  const schedulesForDate = schedules
    .filter((s: Schedule) => s.date === selectedDate)
    .sort((a: Schedule, b: Schedule) => a.startTime.localeCompare(b.startTime));

  const todosForDate = todos.filter((t: Todo) => t.date === selectedDate);
  const routinesForDate = routines.filter((r: Routine) => r.createdAt <= selectedDate);

  const achievement = useMemo(() => {
    const doneTodos = todosForDate.filter((t: Todo) => t.completed).length;
    const doneRoutines = routinesForDate.filter((r: Routine) => r.completions[selectedDate]).length;

    const todoRate = todosForDate.length ? Math.round((doneTodos / todosForDate.length) * 100) : 0;
    const routineRate = routinesForDate.length ? Math.round((doneRoutines / routinesForDate.length) * 100) : 0;
    const totalRate = todosForDate.length || routinesForDate.length ? Math.round((todoRate + routineRate) / 2) : 0;

    return { doneTodos, doneRoutines, todoRate, routineRate, totalRate };
  }, [todosForDate, routinesForDate, selectedDate]);

  const rateByDate = (date: string) => {
    const dayTodos = todos.filter((t: Todo) => t.date === date);
    const dayRoutines = routines.filter((r: Routine) => r.createdAt <= date);

    const todoRate = dayTodos.length
      ? Math.round((dayTodos.filter((t) => t.completed).length / dayTodos.length) * 100)
      : 0;

    const routineRate = dayRoutines.length
      ? Math.round(
          (dayRoutines.filter((r) => r.completions[date]).length / dayRoutines.length) * 100
        )
      : 0;

    return dayTodos.length || dayRoutines.length ? Math.round((todoRate + routineRate) / 2) : 0;
  };

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() - (6 - i));
    const date = kstDate(d);
    return { date: date.slice(5), 성취율: rateByDate(date) };
  });

  const monthlyData = (() => {
    const [y, m] = selectedDate.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();

    return Array.from({ length: last }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const date = `${y}-${String(m).padStart(2, "0")}-${day}`;
      return { date: String(i + 1), 성취율: rateByDate(date) };
    });
  })();

  if (authError) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl bg-white p-6 text-center shadow">
            <h1 className="text-3xl font-black">로그인이 필요합니다.</h1>
            <p className="mt-4 text-slate-600">{authError}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-slate-900 p-6 text-white shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black">김주완 스케줄</h1>
              <p className="mt-2 text-slate-300">KST 기준 오늘 날짜: {kstTodayText()}</p>
              {!user && (
                <p className="mt-2 text-sm text-amber-300">
                  로그인된 사용자를 불러오는 중입니다...
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">날짜 선택</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl px-4 py-2 text-slate-900"
              />
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card title="오늘 성취율">
            <div className="text-center">
              <p className="text-6xl font-black">{achievement.totalRate}%</p>
              <p className="text-slate-500">전체 성취율</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Info label="할 일 완료" value={`${achievement.doneTodos}/${todosForDate.length}`} />
              <Info label="루틴 완료" value={`${achievement.doneRoutines}/${routinesForDate.length}`} />
              <Info label="할 일 완료율" value={`${achievement.todoRate}%`} />
              <Info label="루틴 완료율" value={`${achievement.routineRate}%`} />
            </div>
          </Card>

          <Card title="오늘 할 일">
            <div className="flex gap-2">
              <input
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                placeholder="할 일 입력"
                className="w-full rounded-xl border px-3 py-2"
              />
              <button onClick={addTodo} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                추가
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {todosForDate.map((todo: Todo) => (
                <div key={todo.id} className="flex justify-between rounded-xl bg-slate-50 p-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      className="h-5 w-5"
                    />
                    <span className={todo.completed ? "text-slate-400 line-through" : ""}>
                      {todo.text}
                    </span>
                  </label>
                  <button onClick={() => deleteTodo(todo.id)} className="text-red-500">
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="오늘 루틴">
            <div className="flex gap-2">
              <input
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder="루틴 입력"
                className="w-full rounded-xl border px-3 py-2"
              />
              <button onClick={addRoutine} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                추가
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {routinesForDate.map((routine: Routine) => (
                <div key={routine.id} className="flex justify-between rounded-xl bg-slate-50 p-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(routine.completions[selectedDate])}
                      onChange={() => toggleRoutine(routine.id)}
                      className="h-5 w-5"
                    />
                    <span
                      className={
                        routine.completions[selectedDate] ? "text-slate-400 line-through" : ""
                      }
                    >
                      {routine.name}
                    </span>
                  </label>
                  <button onClick={() => deleteRoutine(routine.id)} className="text-red-500">
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card title="오늘 시간표">
            <div className="grid gap-2 md:grid-cols-5">
              <input
                type="time"
                value={scheduleForm.startTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                className="rounded-xl border px-3 py-2"
              />
              <input
                type="time"
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                className="rounded-xl border px-3 py-2"
              />
              <input
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                placeholder="제목"
                className="rounded-xl border px-3 py-2"
              />
              <input
                value={scheduleForm.category}
                onChange={(e) => setScheduleForm({ ...scheduleForm, category: e.target.value })}
                placeholder="카테고리"
                className="rounded-xl border px-3 py-2"
              />
              <button onClick={addSchedule} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                추가
              </button>
            </div>

            <textarea
              value={scheduleForm.memo}
              onChange={(e) => setScheduleForm({ ...scheduleForm, memo: e.target.value })}
              placeholder="메모"
              className="mt-2 w-full rounded-xl border px-3 py-2"
            />

            <div className="mt-4 space-y-3">
              {schedulesForDate.map((s: Schedule) => (
                <div key={s.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        {s.startTime} - {s.endTime} · {s.title}
                      </p>
                      <p className="text-sm text-slate-500">{s.category || "카테고리 없음"}</p>
                      {s.memo && <p className="mt-2 text-sm">{s.memo}</p>}
                    </div>
                    <button onClick={() => deleteSchedule(s.id)} className="text-red-500">
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="이번 주 성취율 그래프">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="성취율" fill="#0f172a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="이번 달 성취율 그래프">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="성취율" stroke="#0f172a" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4 text-center">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
