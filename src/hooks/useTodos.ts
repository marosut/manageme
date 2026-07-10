import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { TodoForm, TodoItem } from "../types/app";

type SupabaseResponseError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
};

type TodoRow = {
  id: string;
  date: string;
  title?: string | null;
  text?: string | null;
  has_time?: boolean | null;
  task_time?: string | null;
  completed: boolean | null;
  memo?: string | null;
};

type TodoColumnsMode = "extended" | "legacy";

const extendedTodoColumns: string = "id,date,title,has_time,task_time,completed,memo";
const legacyTodoColumns: string = "id,date,text,completed";

const emptyTodoForm: TodoForm = {
  title: "",
  hasTime: false,
  taskTime: "",
  memo: "",
};

const toTimeValue = (value: string | null | undefined) => (value ? value.slice(0, 5) : null);

const kstDate = (date: Date) => {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

const getTodoDateRange = (selectedDate: string) => {
  const [year, month] = selectedDate.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  startDate.setDate(startDate.getDate() - 6);

  const endDate = new Date(year, month, 0);

  return {
    startDate: kstDate(startDate),
    endDate: kstDate(endDate),
  };
};

const logTodoError = (
  label: string,
  error: SupabaseResponseError,
  context: Record<string, unknown> = {}
) => {
  console.error(label, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    ...context,
  });
};

const mapTodoRow = (row: TodoRow): TodoItem => ({
  id: row.id,
  date: row.date,
  title: row.title ?? row.text ?? "",
  hasTime: Boolean(row.has_time),
  taskTime: toTimeValue(row.task_time),
  completed: Boolean(row.completed),
  memo: row.memo ?? null,
});

const sortTodos = (items: TodoItem[]) =>
  [...items].sort((a, b) => {
    if (a.hasTime !== b.hasTime) return a.hasTime ? -1 : 1;
    if (a.hasTime && b.hasTime) return (a.taskTime ?? "").localeCompare(b.taskTime ?? "");
    return a.title.localeCompare(b.title);
  });

const runTodoSelect = async (
  userId: string,
  startDate: string,
  endDate: string,
  mode: TodoColumnsMode
) => {
  let query = supabase
    .from("todos")
    .select(mode === "extended" ? extendedTodoColumns : legacyTodoColumns)
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (mode === "extended") {
    query = query
      .order("has_time", { ascending: false })
      .order("task_time", { ascending: true, nullsFirst: false });
  }

  return query;
};

export function useTodos(userId: string | undefined, selectedDate: string) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoForm, setTodoForm] = useState<TodoForm>(emptyTodoForm);
  const [todoColumnsMode, setTodoColumnsMode] = useState<TodoColumnsMode>("extended");
  const [isLoadingTodos, setIsLoadingTodos] = useState(false);
  const [isSavingTodo, setIsSavingTodo] = useState(false);
  const [todoError, setTodoError] = useState<string | null>(null);
  const selectedMonth = selectedDate.slice(0, 7);
  const { startDate, endDate } = useMemo(
    () => getTodoDateRange(`${selectedMonth}-01`),
    [selectedMonth]
  );

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchTodos = async () => {
      setIsLoadingTodos(true);

      let mode = todoColumnsMode;
      let {
        data,
        error,
      }: { data: unknown; error: SupabaseResponseError | null } = await runTodoSelect(
        userId,
        startDate,
        endDate,
        mode
      );

      if (error && mode === "extended") {
        logTodoError("todos extended select error, retrying legacy columns:", error, {
          table: "todos",
          userId,
          startDate,
          endDate,
        });
        mode = "legacy";
        const fallbackResult = await runTodoSelect(userId, startDate, endDate, mode);
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (!isMounted) return;

      if (error) {
        setTodoError("할 일을 불러오지 못했습니다.");
        logTodoError("todos select error:", error, {
          table: "todos",
          userId,
          startDate,
          endDate,
          mode,
        });
      } else {
        setTodoColumnsMode(mode);
        setTodos(sortTodos(((data ?? []) as TodoRow[]).map(mapTodoRow)));
        setTodoError(null);
      }

      setIsLoadingTodos(false);
    };

    fetchTodos();

    return () => {
      isMounted = false;
    };
  }, [endDate, startDate, todoColumnsMode, userId]);

  const addTodo = useCallback(
    async (todoDate: string) => {
      if (!userId) {
        setTodoError("로그인한 사용자를 찾지 못해 할 일을 저장하지 못했습니다.");
        return;
      }

      const title = todoForm.title.trim();
      if (!title) return;

      if (todoForm.hasTime && !todoForm.taskTime) {
        setTodoError("시간을 선택하거나 시간 지정을 해제해주세요.");
        return;
      }

      const extendedPayload = {
        user_id: userId,
        date: todoDate,
        title,
        has_time: todoForm.hasTime,
        task_time: todoForm.hasTime ? todoForm.taskTime : null,
        completed: false,
        memo: todoForm.memo.trim() || null,
      };
      const legacyPayload = {
        user_id: userId,
        date: todoDate,
        text: title,
        completed: false,
      };

      setIsSavingTodo(true);

      let mode = todoColumnsMode;
      let {
        data,
        error,
      }: { data: unknown; error: SupabaseResponseError | null } = await supabase
        .from("todos")
        .insert([mode === "extended" ? extendedPayload : legacyPayload])
        .select(mode === "extended" ? extendedTodoColumns : legacyTodoColumns)
        .single();

      if (error && mode === "extended") {
        logTodoError("todo extended insert error, retrying legacy columns:", error, {
          table: "todos",
          payload: extendedPayload,
        });
        mode = "legacy";
        const fallbackResult = await supabase
          .from("todos")
          .insert([legacyPayload])
          .select(legacyTodoColumns)
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        setTodoError("할 일을 저장하지 못했습니다.");
        logTodoError("todo insert error:", error, {
          table: "todos",
          mode,
        });
      } else if (data) {
        setTodoColumnsMode(mode);
        setTodos((prev) => sortTodos([...prev, mapTodoRow(data as TodoRow)]));
        setTodoForm(emptyTodoForm);
        setTodoError(null);
      }

      setIsSavingTodo(false);
    },
    [todoColumnsMode, todoForm, userId]
  );

  const toggleTodo = useCallback(
    async (todoId: string) => {
      if (!userId) {
        setTodoError("로그인한 사용자를 찾지 못해 할 일을 수정하지 못했습니다.");
        return;
      }

      const currentTodo = todos.find((todo) => todo.id === todoId);
      if (!currentTodo) return;

      const { error } = await supabase
        .from("todos")
        .update({ completed: !currentTodo.completed })
        .eq("id", todoId)
        .eq("user_id", userId);

      if (error) {
        setTodoError("할 일을 수정하지 못했습니다.");
        logTodoError("todo update error:", error, {
          table: "todos",
          todoId,
          userId,
        });
        return;
      }

      setTodos((prev) =>
        sortTodos(
          prev.map((todo) =>
            todo.id === todoId ? { ...todo, completed: !currentTodo.completed } : todo
          )
        )
      );
      setTodoError(null);
    },
    [todos, userId]
  );

  const deleteTodo = useCallback(
    async (todoId: string) => {
      if (!userId) {
        setTodoError("로그인한 사용자를 찾지 못해 할 일을 삭제하지 못했습니다.");
        return;
      }

      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", todoId)
        .eq("user_id", userId);

      if (error) {
        setTodoError("할 일을 삭제하지 못했습니다.");
        logTodoError("todo delete error:", error, {
          table: "todos",
          todoId,
          userId,
        });
        return;
      }

      setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
      setTodoError(null);
    },
    [userId]
  );

  return {
    todos,
    todoForm,
    setTodoForm,
    addTodo,
    toggleTodo,
    deleteTodo,
    isLoadingTodos,
    isSavingTodo,
    todoError,
  };
}
