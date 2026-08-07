import type { ReactNode } from "react";

import { AuthIllustration } from "./auth-illustration";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between border-r border-border bg-card p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 rounded-sm bg-primary" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight">ForgeAI Studio</span>
        </div>

        <AuthIllustration className="w-full max-w-md self-center" />

        <div className="max-w-md">
          <h2 className="text-lg font-semibold tracking-tight">Autonomous software engineering</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Plain-English requirements become production-ready applications through a governed
            pipeline of ten specialized agents.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
