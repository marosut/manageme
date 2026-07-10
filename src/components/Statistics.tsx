import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "../types/app";
import { Card } from "./ui/Card";

type StatisticsProps = {
  weeklyData: ChartPoint[];
  monthlyData: ChartPoint[];
};

export const Statistics = memo(function Statistics({ weeklyData, monthlyData }: StatisticsProps) {
  return (
    <>
      <Card title="이번 주 달성률 그래프">
        <div className="h-72 min-h-72 min-w-0 w-full">
          <ResponsiveContainer width="100%" height={288} minWidth={0} minHeight={288}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="rate" name="달성률" fill="#0f172a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="이번 달 달성률 그래프">
        <div className="h-72 min-h-72 min-w-0 w-full">
          <ResponsiveContainer width="100%" height={288} minWidth={0} minHeight={288}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" name="달성률" stroke="#0f172a" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
});
