import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  RotateCcw,
  Layers,
  ClipboardCheck,
  Timer,
  TrendingUp,
  FolderHeart,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Shared between the desktop sidebar and mobile bottom nav — one source of truth for app routes. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/quiz", label: "Quiz", icon: ClipboardCheck },
  { href: "/study", label: "Study Timer", icon: Timer },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/collections", label: "Collections", icon: FolderHeart },
  { href: "/settings", label: "Settings", icon: Settings },
];
