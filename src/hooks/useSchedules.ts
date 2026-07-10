import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ScheduleForm, ScheduleItem } from "../types/app";

type SupabaseResponseError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
};

type ScheduleRow = {
  id: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  title: string;
  category: string | null;
  memo: string | null;
};

const scheduleColumns =
  "id,dayOfWeek:day_of_week,startTime:start_time,endTime:end_time,title,category,memo";
const emptyScheduleForm: ScheduleForm = {
  startTime: "",
  endTime: "",
  title: "",
  category: "",
  memo: "",
};

const toWeekday = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
};

const toTimeValue = (value: string | null) => (value ? value.slice(0, 5) : "");

const isValidScheduleRow = (
  row: ScheduleRow
): row is ScheduleRow & { dayOfWeek: number; startTime: string; endTime: string } =>
  row.dayOfWeek !== null && Boolean(row.startTime) && Boolean(row.endTime);

const mapScheduleRow = (row: ScheduleRow): ScheduleItem => ({
  id: row.id,
  dayOfWeek: row.dayOfWeek ?? 0,
  startTime: toTimeValue(row.startTime),
  endTime: toTimeValue(row.endTime),
  title: row.title,
  category: row.category ?? "",
  memo: row.memo ?? "",
});

const sortSchedules = (items: ScheduleItem[]) =>
  [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));

const buildScheduleErrorMessage = (action: string, error: SupabaseResponseError) => {
  const details = [error.message, error.details, error.hint].filter(Boolean).join("\n");
  return `${action} failed\n${details}`;
};

const logScheduleError = (
  label: string,
  error: SupabaseResponseError,
  context: Record<string, unknown>
) => {
  console.error(label, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    ...context,
  });
};

export function useSchedules(userId: string | undefined, selectedDate: string) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(emptyScheduleForm);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const selectedDayOfWeek = toWeekday(selectedDate);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchSchedules = async () => {
      setIsLoadingSchedules(true);
      const { data, error } = await supabase
        .from("schedules")
        .select(scheduleColumns)
        .eq("user_id", userId)
        .eq("day_of_week", selectedDayOfWeek)
        .order("start_time", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setScheduleError(buildScheduleErrorMessage("Loading schedules", error));
        logScheduleError("schedules select error", error, {
          table: "schedules",
          userId,
          selectedDayOfWeek,
          selectedColumns: scheduleColumns,
        });
      } else {
        setSchedules(
          sortSchedules(((data ?? []) as ScheduleRow[]).filter(isValidScheduleRow).map(mapScheduleRow))
        );
        setScheduleError(null);
      }

      setIsLoadingSchedules(false);
    };

    fetchSchedules();

    return () => {
      isMounted = false;
    };
  }, [selectedDayOfWeek, userId]);

  const addSchedule = useCallback(async () => {
    if (!userId) {
      setScheduleError("Cannot save a schedule because no logged-in user was found.");
      return;
    }

    if (!scheduleForm.startTime || !scheduleForm.endTime || !scheduleForm.title.trim()) {
      setScheduleError("Enter a start time, end time, and title before saving.");
      return;
    }

    const schedulePayload = {
      user_id: userId,
      day_of_week: selectedDayOfWeek,
      start_time: scheduleForm.startTime,
      end_time: scheduleForm.endTime,
      title: scheduleForm.title.trim(),
      category: scheduleForm.category.trim() || null,
      memo: scheduleForm.memo.trim() || null,
    };

    setIsSavingSchedule(true);
    const { data, error } = await supabase
      .from("schedules")
      .insert([schedulePayload])
      .select(scheduleColumns)
      .single();

    if (error) {
      setScheduleError(buildScheduleErrorMessage("Saving schedule", error));
      logScheduleError("schedule insert error", error, {
        table: "schedules",
        payload: schedulePayload,
      });
    } else if (data) {
      setSchedules((prev) => sortSchedules([...prev, mapScheduleRow(data as ScheduleRow)]));
      setScheduleForm(emptyScheduleForm);
      setScheduleError(null);
    }

    setIsSavingSchedule(false);
  }, [scheduleForm, selectedDayOfWeek, userId]);

  const deleteSchedule = useCallback(
    async (scheduleId: string) => {
      if (!userId) {
        setScheduleError("Cannot delete a schedule because no logged-in user was found.");
        return;
      }

      setIsSavingSchedule(true);
      const { error } = await supabase
        .from("schedules")
        .delete()
        .eq("id", scheduleId)
        .eq("user_id", userId);

      if (error) {
        setScheduleError(buildScheduleErrorMessage("Deleting schedule", error));
        logScheduleError("schedule delete error", error, {
          table: "schedules",
          scheduleId,
          userId,
        });
        setIsSavingSchedule(false);
        return;
      }

      setSchedules((prev) => prev.filter((schedule) => schedule.id !== scheduleId));
      setScheduleError(null);
      setIsSavingSchedule(false);
    },
    [userId]
  );

  return {
    schedules,
    scheduleForm,
    setScheduleForm,
    addSchedule,
    deleteSchedule,
    isLoadingSchedules,
    isSavingSchedule,
    scheduleError,
  };
}
