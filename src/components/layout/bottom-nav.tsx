"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import type { SystemRole } from "@/types/database.types";
import { mobileNavItemsForRole, mobileOverflowItemsForRole } from "./nav-config";
import { cn } from "@/lib/utils";

export function BottomNav({ role }: { role: SystemRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = mobileNavItemsForRole(role);
  const overflow = mobileOverflowItemsForRole(role);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = overflow.some((item) => isActive(item.href));

  return (
    <>
      {/* Bảng "Thêm" trượt lên khi bấm */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Đóng"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="bg-background absolute inset-x-0 bottom-0 rounded-t-2xl border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide">
                THÊM
              </p>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setMoreOpen(false)}
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1.5 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            {overflow.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Không còn mục nào khác.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {overflow.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all",
                        active
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent",
                      )}
                    >
                      <Icon className="size-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="bg-background/85 supports-[backdrop-filter]:bg-background/70 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        {items.map((item) => {
          const active = isActive(item.href);
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

        {/* Nút "Thêm" mở bảng các mục còn lại */}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-all duration-200",
            moreOpen || moreActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <MoreHorizontal className="size-5" />
          Thêm
        </button>
      </nav>
    </>
  );
}
