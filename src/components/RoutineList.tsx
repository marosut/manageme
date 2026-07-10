import { memo } from "react";
import type { RoutineItem } from "../types/app";
import { Card } from "./ui/Card";

type RoutineListProps = {
  routines: RoutineItem[];
  routineName: string;
  selectedDate: string;
  onRoutineNameChange: (name: string) => void;
  onAddRoutine: () => void;
  onToggleRoutine: (routineId: string) => void;
  onDeleteRoutine: (routineId: string) => void;
};

export const RoutineList = memo(function RoutineList({
  routines,
  routineName,
  selectedDate,
  onRoutineNameChange,
  onAddRoutine,
  onToggleRoutine,
  onDeleteRoutine,
}: RoutineListProps) {
  return (
    <Card title="오늘 루틴">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={routineName}
          onChange={(event) => onRoutineNameChange(event.target.value)}
          placeholder="루틴 입력"
          className="w-full rounded-xl border px-3 py-2"
        />
        <button onClick={onAddRoutine} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
          추가
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {routines.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-3 text-slate-500">오늘 표시할 루틴이 없습니다.</p>
        )}
        {routines.map((routine) => {
          const isCompleted = Boolean(routine.completions[selectedDate]);

          return (
            <div
              key={routine.id}
              className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={() => onToggleRoutine(routine.id)}
                  className="h-5 w-5"
                />
                <span className={isCompleted ? "text-slate-400 line-through" : ""}>{routine.name}</span>
              </label>
              <button
                onClick={() => onDeleteRoutine(routine.id)}
                className="self-end text-red-500 sm:self-auto"
              >
                삭제
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
});
