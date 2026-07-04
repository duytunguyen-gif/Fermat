"use client";

import { useState, useTransition } from "react";
import { Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { setUserStatus } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { AccountStatus, SystemRole } from "@/types/database.types";
import { UserAssignDialog } from "./user-assign-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type UserListItem = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  system_role: SystemRole;
  account_status: AccountStatus;
  department_id: string | null;
  department_name: string | null;
};

export function UsersManager({
  users,
  departments,
  actorRole,
}: {
  users: UserListItem[];
  departments: { id: string; name: string }[];
  actorRole: SystemRole;
}) {
  const pending = users.filter((u) => u.account_status === "pending");
  const others = users.filter((u) => u.account_status !== "pending");
  const canGrantSuperAdmin = actorRole === "super_admin";

  return (
    <Tabs defaultValue="active">
      <TabsList>
        <TabsTrigger value="active">
          Đang quản lý ({others.length})
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-2">
          Chờ duyệt
          {pending.length > 0 && (
            <Badge className="bg-amber-500 text-white">{pending.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-4">
        <ActiveUsersTable
          users={others}
          departments={departments}
          canGrantSuperAdmin={canGrantSuperAdmin}
        />
      </TabsContent>

      <TabsContent value="pending" className="mt-4">
        <PendingUsers
          users={pending}
          departments={departments}
          canGrantSuperAdmin={canGrantSuperAdmin}
        />
      </TabsContent>
    </Tabs>
  );
}

function UserIdentity({ user }: { user: UserListItem }) {
  const initials = user.full_name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-9">
        {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.full_name}</p>
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AccountStatus }) {
  if (status === "active")
    return (
      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
        Hoạt động
      </Badge>
    );
  if (status === "suspended")
    return (
      <Badge className="border-rose-200 bg-rose-100 text-rose-700">Đã khoá</Badge>
    );
  return (
    <Badge className="border-amber-200 bg-amber-100 text-amber-800">
      Chờ duyệt
    </Badge>
  );
}

function ActiveUsersTable({
  users,
  departments,
  canGrantSuperAdmin,
}: {
  users: UserListItem[];
  departments: { id: string; name: string }[];
  canGrantSuperAdmin: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Người dùng</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="hidden md:table-cell">Phòng ban</TableHead>
            <TableHead className="text-center">Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                Chưa có tài khoản nào.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id} className={u.account_status === "suspended" ? "opacity-60" : ""}>
                <TableCell>
                  <UserIdentity user={u} />
                </TableCell>
                <TableCell className="text-sm">{ROLE_LABELS[u.system_role]}</TableCell>
                <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                  {u.department_name ?? "—"}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={u.account_status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <UserAssignDialog
                      user={u}
                      departments={departments}
                      canGrantSuperAdmin={canGrantSuperAdmin}
                      mode="edit"
                      trigger={
                        <Button size="sm" variant="ghost">
                          <Pencil className="size-4" />
                          <span className="sr-only">Sửa</span>
                        </Button>
                      }
                    />
                    <StatusToggle user={u} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusToggle({ user }: { user: UserListItem }) {
  const [pending, startTransition] = useTransition();
  const suspend = user.account_status !== "suspended";

  function toggle() {
    startTransition(async () => {
      const res = await setUserStatus(user.id, suspend ? "suspended" : "active");
      if (res.status === "error") toast.error(res.message);
      else toast.success(res.message);
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={toggle}
      disabled={pending}
      className={suspend ? "text-rose-600" : "text-emerald-600"}
    >
      {suspend ? "Khoá" : "Mở khoá"}
    </Button>
  );
}

function PendingUsers({
  users,
  departments,
  canGrantSuperAdmin,
}: {
  users: UserListItem[];
  departments: { id: string; name: string }[];
  canGrantSuperAdmin: boolean;
}) {
  if (users.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
        Không có tài khoản nào đang chờ duyệt.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <UserIdentity user={u} />
          <UserAssignDialog
            user={u}
            departments={departments}
            canGrantSuperAdmin={canGrantSuperAdmin}
            mode="approve"
            trigger={
              <Button size="sm" className="w-full sm:w-auto">
                <ShieldCheck className="size-4" />
                Duyệt tài khoản
              </Button>
            }
          />
        </div>
      ))}
    </div>
  );
}
