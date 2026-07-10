import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { TodoForm, TodoItem } from "../types/app";

type TaskRow = {
  id: string;
  date: string;
  title: string;
  hasTime: boolean;
  taskTime: string | null;
  completed: boolean;
  memo: string | null;
};

const taskColumns =
  "id,date:task_date,title,hasTime:has_time,taskTime:task_time,completed,memo";

const emptyTodoForm: TodoForm = {
  title: "",
  hasTime: false,
  taskTime: "",
  memo: "",
};

const toTimeValue = (value: string | null) => (value ? value.slice(0, 5) : null);

const mapTaskRow = (row: TaskRow): TodoItem => ({
  id: row.id,
  date: row.date,
  title: row.title,
  hasTime: row.hasTime,
  taskTime: toTimeValue(row.taskTime),
  completed: row.completed,
  memo: row.memo,
});

const sortTodos = (items: TodoItem[]) =>
  [...items].sort((a, b) => {
    if (a.hasTime !== b.hasTime) return a.hasTime ? -1 : 1;
    if (a.hasTime && b.hasTime) return (a.taskTime ?? "").localeCompare(b.taskTime ?? "");
    return a.title.localeCompare(b.title);
  });

export function useTodos(userId?: string) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoForm, setTodoForm] = useState<TodoForm>(emptyTodoForm);
  const [isLoadingTodos, setIsLoadingTodos] = useState(false);
  const [isSavingTodo, setIsSavingTodo] = useState(false);
  const [todoError, setTodoError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchTodos = async () => {
      setIsLoadingTodos(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(taskColumns)
        .eq("user_id", userId)
        .order("task_date", { ascending: true })
        .order("has_time", { ascending: false })
        .order("task_time", { ascending: true, nullsFirst: false });

      if (!isMounted) return;

      if (error) {
        setTodoError("Failed to load tasks.");
        console.error("tasks select error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else {
        setTodos(sortTodos(((data ?? []) as TaskRow[]).map(mapTaskRow)));
        setTodoError(null);
      }

      setIsLoadingTodos(false);
    };

    fetchTodos();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const addTodo = useCallback(
    async (selectedDate: string) => {
      if (!userId) {
        setTodoError("Cannot save a task because no logged-in user was found.");
        return;
      }

      const title = todoForm.title.trim();
      if (!title) return;

      if (todoForm.hasTime && !todoForm.taskTime) {
        setTodoError("Choose a time or turn off time scheduling.");
        return;
      }

      const taskPayload = {
        user_id: userId,
        task_date: selectedDate,
        title,
        has_time: todoForm.hasTime,
        task_time: todoForm.hasTime ? todoForm.taskTime : null,
        completed: false,
        memo: todoForm.memo.trim() || null,
      };

      setIsSavingTodo(true);
      const { data, error } = await supabase
        .from("tasks")
        .insert([taskPayload])
        .select(taskColumns)
        .single();

      if (error) {
        setTodoError("Failed to save task.");
        console.error("task insert error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          payload: taskPayload,
        });
      } else if (data) {
        setTodos((prev) => sortTodos([...prev, mapTaskRow(data as TaskRow)]));
        setTodoForm(emptyTodoForm);
        setTodoError(null);
      }

      setIsSavingTodo(false);
    },
    [todoForm, userId]
  );

  const toggleTodo = useCallback(
    async (todoId: string) => {
      if (!userId) {
        setTodoError("Cannot update a task because no logged-in user was found.");
        return;
      }

      const currentTodo = todos.find((todo) => todo.id === todoId);
      if (!currentTodo) return;

      const { data, error } = await supabase
        .from("tasks")
        .update({ completed: !currentTodo.completed })
        .eq("id", todoId)
        .eq("user_id", userId)
        .select(taskColumns)
        .single();

      if (error) {
        setTodoError("Failed to update task.");
        console.error("task update error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }

      if (data) {
        setTodos((prev) =>
          sortTodos(prev.map((todo) => (todo.id === todoId ? mapTaskRow(data as TaskRow) : todo)))
        );
        setTodoError(null);
      }
    },
    [todos, userId]
  );

  const deleteTodo = useCallback(
    async (todoId: string) => {
      if (!userId) {
        setTodoError("Cannot delete a task because no logged-in user was found.");
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", todoId)
        .eq("user_id", userId);

      if (error) {
        setTodoError("Failed to delete task.");
        console.error("task delete error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
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
