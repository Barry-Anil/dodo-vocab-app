"use client";

import { createElement } from "react";
import { toast } from "sonner";
import { Flame, Trophy, PartyPopper } from "lucide-react";

/**
 * Richer, longer-lived toasts for the three "you actually accomplished
 * something" moments in the product — word added is a plain toast.success,
 * these three get a bigger icon with a pop-in animation and a longer
 * duration so they register as a small celebration, not just a status blip.
 */

function celebrationIcon(Icon: typeof Flame) {
  return createElement(Icon, { className: "size-5 animate-pop text-primary" });
}

export function celebrateWordAdded(message: string) {
  toast.success(message, { icon: celebrationIcon(PartyPopper) });
}

export function celebrateDailyGoalComplete() {
  toast.success("Today's goal complete! 🔥", {
    description: "You hit today's word target — keep the streak going.",
    duration: 6000,
    icon: celebrationIcon(Flame),
  });
}

export function celebrateQuizComplete(score: number, correctCount: number, total: number) {
  const strong = score >= 70;
  toast.success(strong ? `Quiz complete — ${score}%!` : `Quiz complete — ${score}%`, {
    description: strong
      ? `${correctCount}/${total} correct. Great work.`
      : `${correctCount}/${total} correct. Missed words are back in your review queue.`,
    duration: 6000,
    icon: celebrationIcon(Trophy),
  });
}
