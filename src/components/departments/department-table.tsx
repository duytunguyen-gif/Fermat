"use client";

import { useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { setDepartmentActive } from "@/lib/actions/departments";
import type { Database } from "@/types/database.types";
import { DepartmentForm } from "./department-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Department = Database["public"]["Tables"]["departments"]["Row"];
export type DepartmentWithCount = Department & { memberCount: number };

export function DepartmentTable({
  departments,
}: {
  departments: DepartmentWithCount[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {departments.length} phòng ban
        </p>
        <DepartmentForm
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              Thêm phòng ban
            </Button>
          }
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên phòng ban</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead className="hidden md:table-cell">Mô tả</TableHead>
              <TableHead className="text-center">Nhân sự</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  Chưa có phòng ban nào.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <DepartmentRow key={dept.id} department={dept} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DepartmentRow({ department }: { department: DepartmentWithCount }) {
  const [pending, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      const res = await setDepartmentActive(department.id, !department.is_active);
      if (res.status === "error") toast.error(res.message);
      else toast.success(res.message);
    });
  }

  return (
    <TableRow className={department.is_active ? "" : "opacity-60"}>
      <TableCell className="font-medium">{department.name}</TableCell>
      <TableCell>
        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
          {department.code}
        </code>
      </TableCell>
      <TableCell className="text-muted-foreground hidden max-w-xs truncate md:table-cell">
        {department.description || "—"}
      </TableCell>
      <TableCell className="text-center tabular-nums">
        {department.memberCount}
      </TableCell>
      <TableCell className="text-center">
        {department.is_active ? (
          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
            Hoạt động
          </Badge>
        ) : (
          <Badge variant="secondary">Đã tắt</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <DepartmentForm
            department={department}
            trigger={
              <Button size="sm" variant="ghost">
                <Pencil className="size-4" />
                <span className="sr-only">Sửa</span>
              </Button>
            }
          />
          <Button
            size="sm"
            variant="outline"
            onClick={toggleActive}
            disabled={pending}
          >
            {department.is_active ? "Tắt" : "Bật"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
