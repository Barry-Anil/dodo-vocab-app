"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

// A focused subset — a full 9-item bar doesn't fit small screens well.
const MOBILE_ITEMS = NAV_ITEMS.filter((item) =>
  ["/dashboard", "/vocabulary", "/review", "/quiz", "/settings"].includes(item.href),
);

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      {MOBILE_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-150",
              "active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon
              className={cn("size-5 transition-transform duration-200 ease-out", isActive && "scale-110 -translate-y-0.5")}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
