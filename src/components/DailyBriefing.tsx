import { memo, useEffect, useMemo, useState } from "react";
import type { TodoItem } from "../types/app";
import { kstDate, kstTime, selectedDateLabel } from "../utils/date";

type DailyBriefingProps = {
  todos: TodoItem[];
  selectedDate: string;
};

const formatUpcomingDate = (todo: TodoItem) => {
  const [, month, day] = todo.date.split("-").map(Number);
  return `${month}/${day}`;
};

export const DailyBriefing = memo(function DailyBriefing({ todos, selectedDate }: DailyBriefingProps) {
  const [now, setNow] = useState(() => new Date());
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsUpcomingExpanded(false);
  }, [selectedDate]);

  const briefing = useMemo(() => {
    const today = kstDate(now);
    const currentTime = kstTime(now);
    const dateTodos = todos.filter((todo) => todo.date === selectedDate);
    const completedCount = dateTodos.filter((todo) => todo.completed).length;
    const remainingCount = dateTodos.length - completedCount;
    const progress = dateTodos.length ? Math.round((completedCount / dateTodos.length) * 100) : 0;
    const nextTodo = dateTodos
      .filter(
        (todo) =>
          !todo.completed &&
          todo.hasTime &&
          todo.taskTime &&
          (selectedDate !== today || todo.taskTime > currentTime)
      )
      .sort((a, b) => (a.taskTime ?? "").localeCompare(b.taskTime ?? ""))[0];
    const upcomingTodos = todos
      .filter((todo) => !todo.completed && todo.date > selectedDate)
      .sort((a, b) => {
        const dateOrder = a.date.localeCompare(b.date);
        if (dateOrder) return dateOrder;
        if (a.hasTime !== b.hasTime) return a.hasTime ? -1 : 1;
        return (a.taskTime ?? "").localeCompare(b.taskTime ?? "");
      });

    return {
      totalCount: dateTodos.length,
      completedCount,
      remainingCount,
      progress,
      nextTodo,
      upcomingTodos,
    };
  }, [now, selectedDate, todos]);

  const dateLabel = selectedDateLabel(selectedDate, kstDate(now));
  const visibleUpcomingTodos = isUpcomingExpanded
    ? briefing.upcomingTodos
    : briefing.upcomingTodos.slice(0, 5);
  const hasMoreUpcomingTodos = briefing.upcomingTodos.length > 5;

  return (
    <section className="mt-6 border-t border-slate-700 pt-5" aria-labelledby="daily-briefing-title">
      <h2 id="daily-briefing-title" className="text-lg font-bold">{dateLabel} 브리핑</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-slate-800 p-4">
          <p className="text-sm text-slate-400">남은 할 일</p>
          <p className="mt-1 text-2xl font-black">{briefing.remainingCount}개</p>
        </div>
        <div className="rounded-2xl bg-slate-800 p-4">
          <p className="text-sm text-slate-400">완료</p>
          <p className="mt-1 text-2xl font-black">
            {briefing.completedCount} / {briefing.totalCount}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-800 p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-slate-400">다음 할 일</p>
          <p className="mt-1 font-bold">
            {briefing.nextTodo
              ? `${briefing.nextTodo.taskTime} ${briefing.nextTodo.title}`
              : "시간이 지정된 할 일이 없습니다."}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">{dateLabel} 진행률</span>
          <span className="font-bold">{briefing.progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300"
            style={{ width: `${briefing.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-300">다가오는 할 일</p>
        {briefing.upcomingTodos.length ? (
          <ul
            className={`mt-2 space-y-1 ${
              isUpcomingExpanded ? "max-h-72 overflow-y-auto pr-1" : ""
            }`}
          >
            {visibleUpcomingTodos.map((todo) => (
              <li
                key={todo.id}
                className="grid grid-cols-[3rem_3.5rem_minmax(0,1fr)] gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <span className="tabular-nums text-slate-400">{formatUpcomingDate(todo)}</span>
                <span className="tabular-nums text-slate-300">
                  {todo.hasTime && todo.taskTime ? todo.taskTime : ""}
                </span>
                <span className="min-w-0 break-words">{todo.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-400">다가오는 할 일이 없습니다.</p>
        )}
        {hasMoreUpcomingTodos && (
          <button
            type="button"
            onClick={() => setIsUpcomingExpanded((expanded) => !expanded)}
            className="mt-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            aria-expanded={isUpcomingExpanded}
          >
            {isUpcomingExpanded ? "접기" : "더보기"}
          </button>
        )}
      </div>
    </section>
  );
});
