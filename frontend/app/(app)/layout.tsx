import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

/** Authenticated shell for all application routes (FAD §2 — (app) group). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
