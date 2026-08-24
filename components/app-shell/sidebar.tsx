"use client";

import { useState, useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen, Flame, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";

const STORAGE_KEY = "vocab-builder:sidebar-collapsed";

// No cross-tab live sync needed for this preference — subscribe is a no-op.
// useSyncExternalStore still gives us the hydration-safe behavior we want:
// getServerSnapshot() below on the initial (server + first client) render,
// then automatically re-rendered with the real localStorage value right
// after hydration, with no manual effect/setState dance required.
function subscribe() {
  return () => {};
}
function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Desktop sidebar with a manual collapse toggle — the spec's "tablet:
 * collapsible sidebar" requirement, implemented as a user-triggered
 * collapse (persisted per-browser) rather than an automatic breakpoint
 * switch, since a hard breakpoint cutover reads as jarring on in-between
 * widths. Bottom nav (mobile-bottom-nav.tsx) still fully replaces this
 * below the md breakpoint.
 */
export function Sidebar({ currentStreak }: { currentStreak: number }) {
  const persistedCollapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Set only once the user actually toggles — lets local clicks feel instant
  // without waiting on a localStorage round-trip.
  const [override, setOverride] = useState<boolean | null>(null);
  const collapsed = override ?? persistedCollapsed;

  function toggle() {
    const next = !collapsed;
    setOverride(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Best-effort persistence only.
    }
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r p-3 transition-[width] duration-150 md:flex",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className={cn("mb-5 flex items-center gap-2 px-1.5 py-1", collapsed && "justify-center px-0")}>
        <span className="shadow-brutal flex size-7 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground">
          <BookOpen className="size-4" aria-hidden="true" />
        </span>
        {collapsed ? null : (
          <span className="truncate text-sm font-bold tracking-tight">Vocabulary Builder</span>
        )}
      </div>

      <SidebarNav collapsed={collapsed} />

      {/* Streak — genuinely useful ambient status, not just filler for the
          empty space below a short nav list: it's visible on every page,
          reinforcing the daily-habit loop the whole product is built around. */}
      <div className={cn("mt-4", collapsed ? "px-0" : "px-1.5")}>
        {collapsed ? (
          <div
            className="flex flex-col items-center gap-0.5 rounded-lg border-2 border-foreground/15 bg-accent/60 py-2 text-amber-600 dark:text-amber-400"
            title={`${currentStreak}-day streak`}
          >
            <Flame className="size-4" aria-hidden="true" />
            <span className="text-xs font-semibold">{currentStreak}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg border-2 border-foreground/15 bg-accent/60 px-3 py-2">
            <Flame className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold">
                {currentStreak} day{currentStreak === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">Current streak</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto border-t pt-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg py-1.5 pr-3 pl-1.5 text-sm text-muted-foreground transition-all duration-150 ease-out hover:bg-accent hover:text-accent-foreground active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center px-1.5",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md">
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            )}
          </span>
          {collapsed ? null : "Collapse"}
        </button>
      </div>
    </aside>
  );
}
