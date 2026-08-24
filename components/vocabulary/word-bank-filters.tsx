"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Heart, Clock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Category {
  slug: string;
  name: string;
}

export function WordBankFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateParams({ q: search || null });
  }

  const favoritesOnly = searchParams.get("favorites") === "1";
  const dueOnly = searchParams.get("due") === "1";
  const weakOnly = searchParams.get("weak") === "1";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";

  return (
    <div className={cn("flex flex-col gap-3", isPending && "opacity-70")}>
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search word, meaning, or notes…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={category || "all"} onValueChange={(v) => updateParams({ category: v === "all" ? null : v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || "all"} onValueChange={(v) => updateParams({ status: v === "all" ? null : v })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Mastery" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All mastery</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="LEARNING">Learning</SelectItem>
            <SelectItem value="REVIEW">Review</SelectItem>
            <SelectItem value="MASTERED">Mastered</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => updateParams({ favorites: favoritesOnly ? null : "1" })}
        >
          <Heart className="size-3.5" /> Favorites
        </Button>
        <Button
          type="button"
          variant={dueOnly ? "default" : "outline"}
          size="sm"
          onClick={() => updateParams({ due: dueOnly ? null : "1" })}
        >
          <Clock className="size-3.5" /> Due
        </Button>
        <Button
          type="button"
          variant={weakOnly ? "default" : "outline"}
          size="sm"
          onClick={() => updateParams({ weak: weakOnly ? null : "1" })}
        >
          <AlertTriangle className="size-3.5" /> Weak
        </Button>
      </div>
    </div>
  );
}
