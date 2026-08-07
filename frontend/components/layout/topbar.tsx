"use client";

import { Bell, Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkAllNotificationsRead, useNotifications } from "@/hooks/use-notifications";
import { useSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

function NotificationsMenu() {
  const router = useRouter();
  const { data = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const unread = data.filter((notification) => !notification.read).length;

  const openNotification = (notification: (typeof data)[number]) => {
    if (notification.run_id) {
      router.push(`/workspace?run=${notification.run_id}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative size-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unread > 0 ? (
          <span
            className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between pr-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead.mutate()}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Mark all as read
            </button>
          ) : null}
        </div>
        {isLoading ? (
          <div className="space-y-2 p-3" aria-hidden="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
            <Bell className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/70">Pipeline events will appear here.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {data.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      notification.read ? "bg-muted-foreground/40" : "bg-primary",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{notification.title}</span>
                    <span className="block text-xs text-muted-foreground">{notification.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface TopbarProps {
  onMenuClick: () => void;
}

/** Sticky application top bar (FAD §3). */
export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const { user, logout } = useSession();
  const [search, setSearch] = useState("");

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && search.trim()) {
      router.push(`/projects?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  const handleSignOut = async () => {
    await logout();
    // replace(): don't leave the stale authenticated page in history.
    router.replace("/");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="relative hidden w-full max-w-sm sm:block">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search projects..."
          aria-label="Search projects"
          className="h-9 pl-8"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationsMenu />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="ml-1 size-9 rounded-full hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background"
          >
            <Avatar name={user?.name} className="size-8" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>{user?.name ?? "Account"}</DropdownMenuLabel>
            <div className="space-y-0.5 px-2.5 pb-2">
              <div className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</div>
              {user?.company_name ? (
                <div className="truncate text-xs text-muted-foreground">{user.company_name}</div>
              ) : null}
              {user ? (
                <Badge
                  variant={user.role === "admin" ? "default" : "info"}
                  className="mt-1 capitalize"
                >
                  {user.role}
                </Badge>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleSignOut}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
