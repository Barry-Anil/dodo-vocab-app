"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, AlertTriangle, Heart, BookOpen, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const SCOPES = [
  { value: "new", label: "Recently added", icon: Layers },
  { value: "weak", label: "Weak words", icon: AlertTriangle },
  { value: "favorites", label: "Favorites", icon: Heart },
  { value: "all", label: "All vocabulary", icon: BookOpen },
  { value: "category", label: "Category", icon: Tag },
] as const;

const MODES = [
  { value: "mixed", label: "Mixed (recommended)" },
  { value: "flashcard_word_to_meaning", label: "Word → Meaning" },
  { value: "flashcard_meaning_to_word", label: "Meaning → Word" },
  { value: "flashcard_fill_blank", label: "Fill in the blank" },
  { value: "flashcard_synonym_challenge", label: "Synonym challenge" },
  { value: "flashcard_antonym_challenge", label: "Antonym challenge" },
];

export function FlashcardSetup({ categories }: { categories: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const [scope, setScope] = useState<string | null>(null);
  const [mode, setMode] = useState("mixed");
  const [category, setCategory] = useState<string>(categories[0]?.slug ?? "");

  function start() {
    if (!scope) return;
    const params = new URLSearchParams({ scope, mode, start: "1" });
    if (scope === "category" && category) params.set("category", category);
    router.push(`/flashcards?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2">
        {SCOPES.map((s) => {
          const Icon = s.icon;
          const selected = scope === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98]",
                selected ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent",
              )}
            >
              <Icon className="size-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {scope === "category" && categories.length > 0 ? (
        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Mode</span>
        <Select value={mode} onValueChange={(v) => v && setMode(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={start} disabled={!scope}>
        Start practicing
      </Button>
    </div>
  );
}
