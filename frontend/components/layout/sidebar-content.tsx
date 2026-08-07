"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav-config";

/** Sidebar navigation + account section, shared by desktop and mobile. */
export function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleSignOut = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <Logo />
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="shrink-0 p-3">
        <Link
          href="/profile"
          aria-current={isActive("/profile") ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
            isActive("/profile")
              ? "bg-accent text-accent-foreground"
              : "text-foreground hover:bg-muted",
          )}
        >
          <Avatar name={user?.name} className="size-7 text-[10px]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user?.name ?? "Account"}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {user?.company_name ?? user?.role ?? ""}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </>
  );
}
