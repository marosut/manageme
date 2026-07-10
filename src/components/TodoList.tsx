import { memo } from "react";
import type { TodoForm, TodoItem } from "../types/app";
import { Card } from "./ui/Card";

type TodoListProps = {
  todos: TodoItem[];
  todoForm: TodoForm;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onTodoFormChange: (form: TodoForm) => void;
  onAddTodo: () => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
};

export const TodoList = memo(function TodoList({
  todos,
  todoForm,
  isLoading,
  isSaving,
  error,
  onTodoFormChange,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoListProps) {
  const renderTodo = (todo: TodoItem) => (
    <div
      key={todo.id}
      className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggleTodo(todo.id)}
          className="h-5 w-5"
        />
        <span className={todo.completed ? "text-slate-400 line-through" : ""}>
          {todo.title}
        </span>
      </label>
      <button
        type="button"
        onClick={() => onDeleteTodo(todo.id)}
        className="self-end text-red-500 sm:self-auto"
      >
        삭제
      </button>
    </div>
  );

  return (
    <Card title="오늘 할 일">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={todoForm.title}
            onChange={(event) => onTodoFormChange({ ...todoForm, title: event.target.value })}
            placeholder="할 일 입력"
            className="w-full rounded-xl border px-3 py-2"
          />
          <button
            type="button"
            onClick={onAddTodo}
            disabled={isSaving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "저장 중" : "추가"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 whitespace-pre-line text-sm text-red-500">{error}</p>}

      <div className="mt-4 space-y-4">
        {isLoading && <p className="rounded-xl bg-slate-50 p-3 text-slate-500">불러오는 중입니다.</p>}
        {!isLoading && todos.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-3 text-slate-500">오늘 등록된 할 일이 없습니다.</p>
        )}
        {todos.map(renderTodo)}
      </div>
    </Card>
  );
});
