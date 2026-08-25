import { memo, useEffect, useMemo, useState } from "react";
import { kstDate } from "../utils/date";
import { Card } from "./ui/Card";

type MiniCalendarProps = {
  selectedDate: string;
  todoSummaryByDate: Record<string, { total: number; completed: number }>;
  onSelectedDateChange: (date: string) => void;
};

type CalendarDay = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

const toDateString = (year: number, monthIndex: number, day: number) => {
  const normalized = new Date(Date.UTC(year, monthIndex, day));
  const normalizedYear = normalized.getUTCFullYear();
  const normalizedMonth = String(normalized.getUTCMonth() + 1).padStart(2, "0");
  const normalizedDay = String(normalized.getUTCDate()).padStart(2, "0");
  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
};

export const MiniCalendar = memo(function MiniCalendar({
  selectedDate,
  todoSummaryByDate,
  onSelectedDateChange,
}: MiniCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate.slice(0, 7));
  const today = kstDate();

  useEffect(() => {
    setVisibleMonth(selectedDate.slice(0, 7));
  }, [selectedDate]);

  const [year, month] = visibleMonth.split("-").map(Number);

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

    return Array.from({ length: 42 }, (_, index) => {
      const date = toDateString(year, month - 1, index - firstDayOfWeek + 1);
      const [, dateMonth, dateDay] = date.split("-").map(Number);

      return {
        date,
        day: dateDay,
        isCurrentMonth: dateMonth === month,
      };
    });
  }, [month, year]);

  const moveMonth = (offset: number) => {
    const nextMonth = new Date(Date.UTC(year, month - 1 + offset, 1));
    setVisibleMonth(
      `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}`
    );
  };

  return (
    <Card title="날짜 선택">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label="이전 달"
          className="grid h-9 w-9 place-items-center rounded-xl text-xl text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          ‹
        </button>
        <p className="font-bold text-slate-900">{year}년 {month}월</p>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="다음 달"
          className="grid h-9 w-9 place-items-center rounded-xl text-xl text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
        {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {calendarDays.map((calendarDay) => {
          const isSelected = calendarDay.date === selectedDate;
          const isToday = calendarDay.date === today;
          const todoSummary = todoSummaryByDate[calendarDay.date];
          const todoCount = todoSummary?.total ?? 0;
          const areAllTodosCompleted = todoCount > 0 && todoSummary.completed === todoCount;

          return (
            <button
              key={calendarDay.date}
              type="button"
              onClick={() => onSelectedDateChange(calendarDay.date)}
              aria-label={`${calendarDay.date}${todoCount ? `, 할 일 ${todoCount}개` : ""}`}
              aria-pressed={isSelected}
              className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                isSelected
                  ? "bg-slate-900 font-bold text-white shadow-sm"
                  : isToday
                    ? "bg-slate-100 font-bold text-slate-900 ring-1 ring-slate-400"
                    : calendarDay.isCurrentMonth
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{calendarDay.day}</span>
              {todoCount > 0 && (
                todoCount === 1 ? (
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 h-1 w-1 rounded-full ${
                      isSelected ? "bg-white" : areAllTodosCompleted ? "bg-slate-300" : "bg-slate-700"
                    }`}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 text-[9px] font-bold leading-none ${
                      isSelected ? "text-white" : areAllTodosCompleted ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {todoCount}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
});
