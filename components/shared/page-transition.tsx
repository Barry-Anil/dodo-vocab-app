"use client";

import { usePathname } from "next/navigation";

/**
 * Layouts persist across navigations in the App Router — only the page
 * content inside {children} swaps — so a plain CSS "animate on mount" class
 * on a static wrapper never replays. Keying this div by pathname forces
 * React to remount it on every navigation, which does replay the entrance
 * animation, giving every page a consistent fade/slide-in without each
 * page needing its own animation classes.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-out">
      {children}
    </div>
  );
}
