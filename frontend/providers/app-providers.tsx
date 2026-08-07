"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "./query-provider";
import { SessionProvider } from "./session-provider";
import { ThemeProvider } from "./theme-provider";

/** Composes all client-side providers for the application (FAD §4.1). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SessionProvider>{children}</SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
