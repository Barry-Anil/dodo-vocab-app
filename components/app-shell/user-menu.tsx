"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutUser } from "@/lib/actions/auth";

function initialsFor(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({ name, email }: { name: string | null; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initialsFor(name, email)}</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name || email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/settings">
              <Settings className="size-4" />
              Settings
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          render={
            <form action={logoutUser} className="w-full">
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
