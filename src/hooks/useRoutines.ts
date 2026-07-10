import { useCallback, useState } from "react";
import { createDefaultRoutines, createRoutine } from "../constants/routines";
import type { RoutineItem } from "../types/app";

export function useRoutines() {
  const [routines, setRoutines] = useState<RoutineItem[]>(createDefaultRoutines);
  const [routineName, setRoutineName] = useState("");

  const addRoutine = useCallback(
    (selectedDate: string) => {
      const name = routineName.trim();
      if (!name) return;

      setRoutines((prev) => [...prev, createRoutine(name, selectedDate)]);
      setRoutineName("");
    },
    [routineName]
  );

  const toggleRoutine = useCallback((routineId: string, selectedDate: string) => {
    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id === routineId
          ? {
              ...routine,
              completions: {
                ...routine.completions,
                [selectedDate]: !routine.completions[selectedDate],
              },
            }
          : routine
      )
    );
  }, []);

  const deleteRoutine = useCallback((routineId: string) => {
    setRoutines((prev) => prev.filter((routine) => routine.id !== routineId));
  }, []);

  return {
    routines,
    routineName,
    setRoutineName,
    addRoutine,
    toggleRoutine,
    deleteRoutine,
  };
}
