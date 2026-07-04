"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { SystemRole } from "@/types/database.types";
import { navItemsForRole } from "./nav-config";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: SystemRole }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Image
          src="/brand/logo-fermat.jpg"
          alt="FermatTech"
          width={1213}
          height={509}
          className="h-9 w-auto"
          priority
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="text-muted-foreground/70 mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
          Điều hướng
        </p>
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/70 hover:bg-accent hover:text-foreground",
              )}
            >
              {active && (
                <span className="bg-primary absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full" />
              )}
              <Icon
                className={cn(
                  "size-5 shrink-0 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
