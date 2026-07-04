"use client";

import { PieChartIcon, BarChart3 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/** Placeholder gọn gàng khi biểu đồ chưa có dữ liệu. */
function ChartEmpty({
  icon: Icon,
  message,
}: {
  icon: typeof PieChartIcon;
  message: string;
}) {
  return (
    <div className="text-muted-foreground flex h-56 flex-col items-center justify-center gap-3 text-center">
      <span className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6 opacity-70" />
      </span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export type StatusSlice = { name: string; value: number; color: string };
export type DepartmentBarItem = { name: string; value: number };

/**
 * Biểu đồ tròn (donut) phân bố công việc theo trạng thái.
 * Dữ liệu đã được tính sẵn ở server component và truyền vào.
 */
export function StatusDonut({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <ChartEmpty
        icon={PieChartIcon}
        message="Chưa có dữ liệu — biểu đồ sẽ hiện khi có công việc."
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-56 w-full sm:w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} việc`, name]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums">{total}</span>
          <span className="text-muted-foreground text-xs">công việc</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="text-muted-foreground tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Biểu đồ cột số công việc đang mở theo phòng ban.
 */
export function DepartmentBar({ data }: { data: DepartmentBarItem[] }) {
  if (data.length === 0) {
    return (
      <ChartEmpty
        icon={BarChart3}
        message="Chưa có công việc đang mở nào để thống kê."
      />
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            formatter={(value) => [`${value} việc`, "Đang mở"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
