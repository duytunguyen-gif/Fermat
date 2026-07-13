"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut, User as UserIcon } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type HeaderUser = {
  name: string;
  email: string;
  avatarUrl: string | null;
  roleLabel: string;
  departmentName: string | null;
};

export function Header({
  user,
  unreadCount,
}: {
  user: HeaderUser;
  unreadCount: number;
}) {
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <header className="bg-background md:supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-4 md:px-8 md:backdrop-blur-md">
      {/* Brand chỉ hiện trên mobile (desktop đã có ở sidebar) */}
      <Link href="/dashboard" className="flex items-center md:hidden">
        <Image
          src="/brand/logo-fermat.jpg"
          alt="FermatTech"
          width={1213}
          height={509}
          className="h-7 w-auto"
        />
      </Link>
      <div className="hidden md:block" />

      <div className="flex items-center gap-1">
        <NotificationBell unreadCount={unreadCount} />

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-2.5 rounded-full px-2 py-1.5">
            <Avatar className="ring-border size-8 ring-2">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left sm:block">
              <span className="block text-sm leading-tight font-medium">
                {user.name}
              </span>
              <span className="text-muted-foreground block text-xs leading-tight">
                {user.roleLabel}
              </span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {user.roleLabel}
              {user.departmentName ? ` · ${user.departmentName}` : ""}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">
              <UserIcon className="size-4" />
              Hồ sơ cá nhân
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              void signOut();
            }}
          >
            <LogOut className="size-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
