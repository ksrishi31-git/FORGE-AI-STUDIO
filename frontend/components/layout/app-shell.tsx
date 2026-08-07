"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useSession } from "@/providers/session-provider";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Authenticated application shell (FAD §2 — (app) layout).
 *
 * The shell doubles as the client-side route guard: middleware already blocks
 * requests without a session cookie, but a stale/expired cookie still passes
 * middleware, so the shell verifies the session via SessionProvider before
 * mounting any dashboard content. While the session is loading or confirmed
 * unauthenticated, children (and their API calls) never mount.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { status, loggingOut } = useSession();

  useEffect(() => {
    // A logout is already navigating to the public landing page; let it
    // finish instead of redirecting to the login screen.
    if (status === "unauthenticated" && !loggingOut) {
      router.replace("/auth/login");
    }
  }, [status, loggingOut, router]);

  // The Agent Workspace is a full-bleed IDE: it manages its own gutters,
  // padding, and viewport height inside the shell (FAD §2 — Workspace).
  const isWorkspace = pathname.startsWith("/workspace");

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className="flex min-h-screen flex-col lg:pl-60">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main
          className={
            isWorkspace ? "min-w-0 flex-1" : "mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
