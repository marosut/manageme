export type ScheduleItem = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  memo: string;
};

export type ScheduleForm = Omit<ScheduleItem, "id" | "dayOfWeek">;

export type TodoItem = {
  id: string;
  date: string;
  title: string;
  hasTime: boolean;
  taskTime: string | null;
  completed: boolean;
  memo: string | null;
};

export type TodoForm = {
  title: string;
  hasTime: boolean;
  taskTime: string;
  memo: string;
};

export type RoutineItem = {
  id: string;
  name: string;
  createdAt: string;
  completions: Record<string, boolean>;
};

export type UserInfo = {
  id: string;
};

export type Achievement = {
  doneTodos: number;
  doneRoutines: number;
  todoRate: number;
  routineRate: number;
  totalRate: number;
};

export type ChartPoint = {
  date: string;
  rate: number;
};
