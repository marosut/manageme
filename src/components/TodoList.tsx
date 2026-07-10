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
  const timedTodos = todos
    .filter((todo) => todo.hasTime)
    .sort((a, b) => (a.taskTime ?? "").localeCompare(b.taskTime ?? ""));
  const untimedTodos = todos.filter((todo) => !todo.hasTime);

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
          {todo.taskTime ? `${todo.taskTime} ` : ""}
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
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={todoForm.hasTime}
            onChange={(event) =>
              onTodoFormChange({
                ...todoForm,
                hasTime: event.target.checked,
                taskTime: event.target.checked ? todoForm.taskTime : "",
              })
            }
          />
          시간 지정
        </label>
        {todoForm.hasTime && (
          <input
            type="time"
            value={todoForm.taskTime}
            onChange={(event) => onTodoFormChange({ ...todoForm, taskTime: event.target.value })}
            className="rounded-xl border px-3 py-2"
          />
        )}
        <textarea
          value={todoForm.memo}
          onChange={(event) => onTodoFormChange({ ...todoForm, memo: event.target.value })}
          placeholder="메모"
          className="rounded-xl border px-3 py-2"
        />
      </div>

      {error && <p className="mt-3 whitespace-pre-line text-sm text-red-500">{error}</p>}

      <div className="mt-4 space-y-4">
        {isLoading && <p className="rounded-xl bg-slate-50 p-3 text-slate-500">불러오는 중입니다.</p>}
        {!isLoading && todos.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-3 text-slate-500">오늘 등록된 할 일이 없습니다.</p>
        )}
        {timedTodos.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-600">시간 있는 할 일</h3>
            {timedTodos.map(renderTodo)}
          </section>
        )}
        {untimedTodos.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-600">시간 없는 할 일</h3>
            {untimedTodos.map(renderTodo)}
          </section>
        )}
      </div>
    </Card>
  );
});
