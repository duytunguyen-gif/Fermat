"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SystemRole } from "@/types/database.types";
import { mobileNavItemsForRole } from "./nav-config";
import { cn } from "@/lib/utils";

export function BottomNav({ role }: { role: SystemRole }) {
  const pathname = usePathname();
  const items = mobileNavItemsForRole(role);

  return (
    <nav className="bg-background/85 supports-[backdrop-filter]:bg-background/70 fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-all duration-200",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
