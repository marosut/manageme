import { memo } from "react";
import type { ScheduleForm, ScheduleItem } from "../types/app";
import { Card } from "./ui/Card";

type SchedulePanelProps = {
  schedules: ScheduleItem[];
  scheduleForm: ScheduleForm;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onScheduleFormChange: (form: ScheduleForm) => void;
  onAddSchedule: () => void;
  onDeleteSchedule: (scheduleId: string) => void;
};

export const SchedulePanel = memo(function SchedulePanel({
  schedules,
  scheduleForm,
  isLoading,
  isSaving,
  error,
  onScheduleFormChange,
  onAddSchedule,
  onDeleteSchedule,
}: SchedulePanelProps) {
  return (
    <Card title="오늘 시간표">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(10rem,1.4fr)_minmax(9rem,1fr)_minmax(5rem,auto)]">
        <input
          type="time"
          value={scheduleForm.startTime}
          onChange={(event) => onScheduleFormChange({ ...scheduleForm, startTime: event.target.value })}
          className="min-w-32 rounded-xl border px-3 py-2"
        />
        <input
          type="time"
          value={scheduleForm.endTime}
          onChange={(event) => onScheduleFormChange({ ...scheduleForm, endTime: event.target.value })}
          className="min-w-32 rounded-xl border px-3 py-2"
        />
        <input
          value={scheduleForm.title}
          onChange={(event) => onScheduleFormChange({ ...scheduleForm, title: event.target.value })}
          placeholder="제목"
          className="rounded-xl border px-3 py-2"
        />
        <input
          value={scheduleForm.category}
          onChange={(event) => onScheduleFormChange({ ...scheduleForm, category: event.target.value })}
          placeholder="카테고리"
          className="rounded-xl border px-3 py-2"
        />
        <button
          type="button"
          onClick={onAddSchedule}
          disabled={isSaving}
          className="min-w-20 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "저장 중" : "추가"}
        </button>
      </div>

      <textarea
        value={scheduleForm.memo}
        onChange={(event) => onScheduleFormChange({ ...scheduleForm, memo: event.target.value })}
        placeholder="메모"
        className="mt-2 w-full rounded-xl border px-3 py-2"
      />

      {error && <p className="mt-3 whitespace-pre-line text-sm text-red-500">{error}</p>}

      <div className="mt-4 space-y-3">
        {isLoading && <p className="rounded-xl bg-slate-50 p-3 text-slate-500">불러오는 중입니다.</p>}
        {!isLoading && schedules.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-3 text-slate-500">오늘 등록된 일정이 없습니다.</p>
        )}
        {schedules.map((schedule) => (
          <div key={schedule.id} className="rounded-2xl border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div>
                <p className="font-bold">
                  {schedule.startTime} - {schedule.endTime} · {schedule.title}
                </p>
                <p className="text-sm text-slate-500">{schedule.category || "카테고리 없음"}</p>
                {schedule.memo && <p className="mt-2 text-sm">{schedule.memo}</p>}
              </div>
              <button
                type="button"
                onClick={() => onDeleteSchedule(schedule.id)}
                disabled={isSaving}
                className="self-end text-red-500 sm:self-start"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});
