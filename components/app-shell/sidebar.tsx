"use client";

import { useState, useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
export function Sidebar() {
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
        "hidden shrink-0 flex-col border-r p-4 transition-[width] duration-150 md:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className={cn("mb-6 flex items-center", collapsed ? "justify-center px-0" : "justify-between px-3")}>
        {collapsed ? null : (
          <span className="text-sm font-semibold tracking-tight">Vocabulary Builder</span>
        )}
      </div>
      <SidebarNav collapsed={collapsed} />
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-150 ease-out hover:bg-accent hover:text-accent-foreground active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "justify-center px-2",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <>
            <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />
            Collapse
          </>
        )}
      </button>
    </aside>
  );
}
