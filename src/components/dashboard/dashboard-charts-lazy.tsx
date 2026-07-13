"use client";

import dynamic from "next/dynamic";

/**
 * Nạp biểu đồ (recharts, ~300KB) theo kiểu lazy: KHÔNG gộp vào bundle ban đầu
 * của trang Tổng quan để trang mở nhanh hơn trên điện thoại. Recharts chỉ tải
 * sau khi trang đã hiển thị; trong lúc chờ hiện khung xương (skeleton).
 */
const ChartSkeleton = () => (
  <div className="bg-muted h-56 w-full animate-pulse rounded-xl" />
);

export const StatusDonut = dynamic(
  () => import("./dashboard-charts").then((m) => m.StatusDonut),
  { ssr: false, loading: ChartSkeleton },
);

export const DepartmentBar = dynamic(
  () => import("./dashboard-charts").then((m) => m.DepartmentBar),
  { ssr: false, loading: ChartSkeleton },
);
