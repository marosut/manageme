import type { RoutineItem } from "../types/app";
import { kstDate } from "../utils/date";

const createId = () => crypto.randomUUID();

export const createDefaultRoutines = (): RoutineItem[] => [
  { id: createId(), name: "운동", createdAt: kstDate(), completions: {} },
  { id: createId(), name: "공부", createdAt: kstDate(), completions: {} },
  { id: createId(), name: "수면", createdAt: kstDate(), completions: {} },
  { id: createId(), name: "식단", createdAt: kstDate(), completions: {} },
];

export const createRoutine = (name: string, selectedDate: string): RoutineItem => ({
  id: createId(),
  name,
  createdAt: selectedDate,
  completions: {},
});
