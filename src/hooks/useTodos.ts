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
  text: string | null;
  completed: boolean | null;
};

const todoColumns: string = "id,date,text,completed";

const emptyTodoForm: TodoForm = {
  title: "",
  hasTime: false,
  taskTime: "",
  memo: "",
};

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
  title: row.text ?? "",
  hasTime: false,
  taskTime: null,
  completed: Boolean(row.completed),
  memo: null,
});

const sortTodos = (items: TodoItem[]) =>
  [...items].sort((a, b) => a.title.localeCompare(b.title));

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
        .order("text", { ascending: true });

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
    async (todoDate: string) => {
      if (!userId) {
        setTodoError("로그인한 사용자를 찾지 못해 할 일을 저장하지 못했습니다.");
        return;
      }

      const text = todoForm.title.trim();
      if (!text) return;

      const todoPayload = {
        user_id: userId,
        date: todoDate,
        text,
        completed: false,
      };

      setIsSavingTodo(true);

      const { data, error } = await supabase
        .from("todos")
        .insert([todoPayload])
        .select(todoColumns)
        .single();

      if (error) {
        setTodoError("할 일을 저장하지 못했습니다.");
        logTodoError("todo insert error:", error, {
          table: "todos",
          payload: todoPayload,
        });
      } else if (data) {
        setTodos((prev) => sortTodos([...prev, mapTodoRow(data as unknown as TodoRow)]));
        setTodoForm(emptyTodoForm);
        setTodoError(null);
      }

      setIsSavingTodo(false);
    },
    [todoForm.title, userId]
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
