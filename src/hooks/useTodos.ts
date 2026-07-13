import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { TodoForm, TodoItem } from "../types/app";
import { kstDate } from "../utils/date";

type SupabaseResponseError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
};

type TodoRow = {
  id: string;
  date: string;
  title: string | null;
  text: string | null;
  has_time: boolean | null;
  task_time: string | null;
  completed: boolean | null;
  memo: string | null;
};

const todoColumns: string = "id,date,title,text,has_time,task_time,completed,memo";

const emptyTodoForm: TodoForm = {
  title: "",
  hasTime: false,
  taskTime: "",
  memo: "",
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
  taskTime: row.task_time ? row.task_time.slice(0, 5) : null,
  completed: Boolean(row.completed),
  memo: row.memo ?? null,
});

const sortTodos = (items: TodoItem[]) =>
  [...items].sort((a, b) => {
    if (a.hasTime !== b.hasTime) return a.hasTime ? -1 : 1;
    if (a.hasTime && b.hasTime) return (a.taskTime ?? "").localeCompare(b.taskTime ?? "");
    return a.title.localeCompare(b.title);
  });

export function useTodos(userId: string | undefined, selectedDate: string) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoForm, setTodoForm] = useState<TodoForm>(emptyTodoForm);
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

      const { data, error } = await supabase
        .from("todos")
        .select(todoColumns)
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })
        .order("has_time", { ascending: false })
        .order("task_time", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setTodoError("할 일을 불러오지 못했습니다.");
        logTodoError("todos select error:", error, {
          table: "todos",
          userId,
          startDate,
          endDate,
        });
      } else {
        setTodos(sortTodos(((data ?? []) as unknown as TodoRow[]).map(mapTodoRow)));
        setTodoError(null);
      }

      setIsLoadingTodos(false);
    };

    fetchTodos();

    return () => {
      isMounted = false;
    };
  }, [endDate, startDate, userId]);

  const addTodo = useCallback(
    async (todoDate: string | Date) => {
      if (isSavingTodo) return;

      setTodoError(null);

      const title = todoForm.title.trim();
      if (!title) return;

      if (todoForm.hasTime && !todoForm.taskTime) {
        setTodoError("시간을 선택하거나 시간 지정을 해제해주세요.");
        return;
      }

      setIsSavingTodo(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Todo auth user error:", userError);
        setTodoError("로그인이 필요합니다.");
        setIsSavingTodo(false);
        return;
      }

      if (userId && user.id !== userId) {
        console.error("Todo user mismatch:", {
          authUserId: user.id,
          appUserId: userId,
        });
        setTodoError("로그인 정보를 다시 확인해주세요.");
        setIsSavingTodo(false);
        return;
      }

      const date = todoDate instanceof Date ? kstDate(todoDate) : todoDate;

      const todoPayload = {
        user_id: user.id,
        date,
        title,
        text: title,
        has_time: todoForm.hasTime,
        task_time: todoForm.hasTime ? todoForm.taskTime : null,
        completed: false,
        memo: todoForm.memo.trim() || null,
      };

      const { data, error } = await supabase
        .from("todos")
        .insert([todoPayload])
        .select(todoColumns)
        .single();

      if (error) {
        logTodoError("todo insert error:", error, {
          table: "todos",
          payload: todoPayload,
        });
        setTodoError(`할 일을 저장하지 못했습니다: ${error.message}`);
      } else if (data) {
        setTodos((prev) => sortTodos([...prev, mapTodoRow(data as unknown as TodoRow)]));
        setTodoForm(emptyTodoForm);
        setTodoError(null);
      }

      setIsSavingTodo(false);
    },
    [isSavingTodo, todoForm, userId]
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
