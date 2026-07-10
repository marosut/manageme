import { memo } from "react";
import type { Achievement } from "../types/app";
import { Card } from "./ui/Card";
import { Info } from "./ui/Info";

type AchievementCardProps = {
  achievement: Achievement;
  todoCount: number;
  routineCount: number;
};

export const AchievementCard = memo(function AchievementCard({
  achievement,
  todoCount,
  routineCount,
}: AchievementCardProps) {
  return (
    <Card title="오늘 달성률">
      <div className="text-center">
        <p className="text-5xl font-black sm:text-6xl">{achievement.totalRate}%</p>
        <p className="text-slate-500">전체 달성률</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Info label="할 일 완료" value={`${achievement.doneTodos}/${todoCount}`} />
        <Info label="루틴 완료" value={`${achievement.doneRoutines}/${routineCount}`} />
        <Info label="할 일 완료율" value={`${achievement.todoRate}%`} />
        <Info label="루틴 완료율" value={`${achievement.routineRate}%`} />
      </div>
    </Card>
  );
});
