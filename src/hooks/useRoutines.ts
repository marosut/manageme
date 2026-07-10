import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { RoutineItem } from "../types/app";

type SupabaseResponseError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
};

type RoutineRow = {
  id: string;
  title: string;
  description: string | null;
  frequency: string | null;
};

type RoutineCompletionRow = {
  id: string;
  routineId: string;
  completedDate: string;
  completedAt: string | null;
};

const routineColumns = "id,title,description,frequency";
const routineCompletionColumns =
  "id,routineId:routine_id,completedDate:completed_date,completedAt:completed_at";

const logRoutineError = (
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

const sortRoutines = (items: RoutineItem[]) =>
  [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name));

const mapRoutineRows = (
  routineRows: RoutineRow[],
  completionRows: RoutineCompletionRow[]
): RoutineItem[] => {
  const completionMap = completionRows.reduce<Record<string, Record<string, boolean>>>(
    (acc, completion) => {
      acc[completion.routineId] = {
        ...acc[completion.routineId],
        [completion.completedDate]: true,
      };
      return acc;
    },
    {}
  );

  return sortRoutines(
    routineRows.map((routine) => ({
      id: routine.id,
      name: routine.title,
      createdAt: "0000-01-01",
      completions: completionMap[routine.id] ?? {},
    }))
  );
};

export function useRoutines(userId?: string) {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [routineName, setRoutineName] = useState("");
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(false);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [routineError, setRoutineError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchRoutines = async () => {
      setIsLoadingRoutines(true);

      const { data: routineData, error: routineErrorResponse } = await supabase
        .from("routines")
        .select(routineColumns)
        .eq("user_id", userId)
        .order("title", { ascending: true });

      if (!isMounted) return;

      if (routineErrorResponse) {
        setRoutineError("루틴을 불러오지 못했습니다.");
        logRoutineError("routines select error:", routineErrorResponse, {
          table: "routines",
          userId,
        });
        setIsLoadingRoutines(false);
        return;
      }

      const { data: completionData, error: completionErrorResponse } = await supabase
        .from("routine_completions")
        .select(routineCompletionColumns)
        .eq("user_id", userId);

      if (!isMounted) return;

      if (completionErrorResponse) {
        setRoutineError("루틴 완료 기록을 불러오지 못했습니다.");
        logRoutineError("routine_completions select error:", completionErrorResponse, {
          table: "routine_completions",
          userId,
        });
      } else {
        setRoutines(
          mapRoutineRows(
            (routineData ?? []) as RoutineRow[],
            (completionData ?? []) as RoutineCompletionRow[]
          )
        );
        setRoutineError(null);
      }

      setIsLoadingRoutines(false);
    };

    fetchRoutines();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const addRoutine = useCallback(
    async (selectedDate: string) => {
      if (!userId) {
        setRoutineError("로그인한 사용자를 찾지 못해 루틴을 저장하지 못했습니다.");
        return;
      }

      const name = routineName.trim();
      if (!name) return;

      const routinePayload = {
        user_id: userId,
        title: name,
        description: "",
        frequency: "daily",
      };

      setIsSavingRoutine(true);
      const { data, error } = await supabase
        .from("routines")
        .insert([routinePayload])
        .select(routineColumns)
        .single();

      if (error) {
        setRoutineError("루틴을 저장하지 못했습니다.");
        logRoutineError("routine insert error:", error, {
          table: "routines",
          payload: routinePayload,
        });
      } else if (data) {
        const routine = data as RoutineRow;
        setRoutines((prev) =>
          sortRoutines([
            ...prev,
            {
              id: routine.id,
              name: routine.title,
              createdAt: selectedDate,
              completions: {},
            },
          ])
        );
        setRoutineName("");
        setRoutineError(null);
      }

      setIsSavingRoutine(false);
    },
    [routineName, userId]
  );

  const toggleRoutine = useCallback(
    async (routineId: string, selectedDate: string) => {
      if (!userId) {
        setRoutineError("로그인한 사용자를 찾지 못해 루틴을 수정하지 못했습니다.");
        return;
      }

      const currentRoutine = routines.find((routine) => routine.id === routineId);
      if (!currentRoutine) return;

      setIsSavingRoutine(true);

      if (currentRoutine.completions[selectedDate]) {
        const { error } = await supabase
          .from("routine_completions")
          .delete()
          .eq("routine_id", routineId)
          .eq("user_id", userId)
          .eq("completed_date", selectedDate);

        if (error) {
          setRoutineError("루틴 완료 기록을 수정하지 못했습니다.");
          logRoutineError("routine completion delete error:", error, {
            table: "routine_completions",
            routineId,
            userId,
            selectedDate,
          });
          setIsSavingRoutine(false);
          return;
        }

        setRoutines((prev) =>
          prev.map((routine) => {
            if (routine.id !== routineId) return routine;
            const nextCompletions = { ...routine.completions };
            delete nextCompletions[selectedDate];
            return { ...routine, completions: nextCompletions };
          })
        );
        setRoutineError(null);
        setIsSavingRoutine(false);
        return;
      }

      const completionPayload = {
        routine_id: routineId,
        user_id: userId,
        completed_date: selectedDate,
        completed_at: new Date().toISOString(),
      };

      const { data: existingCompletion, error: selectError } = await supabase
        .from("routine_completions")
        .select("id")
        .eq("routine_id", routineId)
        .eq("user_id", userId)
        .eq("completed_date", selectedDate)
        .maybeSingle();

      if (selectError) {
        setRoutineError("루틴 완료 기록을 확인하지 못했습니다.");
        logRoutineError("routine completion select error:", selectError, {
          table: "routine_completions",
          payload: completionPayload,
        });
        setIsSavingRoutine(false);
        return;
      }

      const { error } = existingCompletion
        ? { error: null }
        : await supabase
            .from("routine_completions")
            .insert([completionPayload])
            .select(routineCompletionColumns)
            .single();

      if (error) {
        setRoutineError("루틴 완료 기록을 저장하지 못했습니다.");
        logRoutineError("routine completion insert error:", error, {
          table: "routine_completions",
          payload: completionPayload,
        });
        setIsSavingRoutine(false);
        return;
      }

      setRoutines((prev) =>
        prev.map((routine) =>
          routine.id === routineId
            ? {
                ...routine,
                completions: {
                  ...routine.completions,
                  [selectedDate]: true,
                },
              }
            : routine
        )
      );
      setRoutineError(null);
      setIsSavingRoutine(false);
    },
    [routines, userId]
  );

  const deleteRoutine = useCallback(
    async (routineId: string) => {
      if (!userId) {
        setRoutineError("로그인한 사용자를 찾지 못해 루틴을 삭제하지 못했습니다.");
        return;
      }

      setIsSavingRoutine(true);

      const { error: completionError } = await supabase
        .from("routine_completions")
        .delete()
        .eq("routine_id", routineId)
        .eq("user_id", userId);

      if (completionError) {
        setRoutineError("루틴 완료 기록을 삭제하지 못했습니다.");
        logRoutineError("routine completions delete error:", completionError, {
          table: "routine_completions",
          routineId,
          userId,
        });
        setIsSavingRoutine(false);
        return;
      }

      const { error } = await supabase
        .from("routines")
        .delete()
        .eq("id", routineId)
        .eq("user_id", userId);

      if (error) {
        setRoutineError("루틴을 삭제하지 못했습니다.");
        logRoutineError("routine delete error:", error, {
          table: "routines",
          routineId,
          userId,
        });
        setIsSavingRoutine(false);
        return;
      }

      setRoutines((prev) => prev.filter((routine) => routine.id !== routineId));
      setRoutineError(null);
      setIsSavingRoutine(false);
    },
    [userId]
  );

  return {
    routines,
    routineName,
    setRoutineName,
    addRoutine,
    toggleRoutine,
    deleteRoutine,
    isLoadingRoutines,
    isSavingRoutine,
    routineError,
  };
}
