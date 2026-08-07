"use client";

import Link from "next/link";
import { BookOpen, FolderInput, Network, Plus, type LucideIcon } from "lucide-react";

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const ACTIONS: QuickAction[] = [
  { label: "New project", description: "Start an agent run", href: "/projects", icon: Plus },
  {
    label: "Generate architecture",
    description: "Design the system structure",
    href: "/architecture",
    icon: Network,
  },
  {
    label: "Import project",
    description: "Bring an existing codebase",
    href: "/projects",
    icon: FolderInput,
  },
  {
    label: "Open documentation",
    description: "Read generated docs",
    href: "/documentation",
    icon: BookOpen,
  },
];

/** Quick actions (FAD §7 — Dashboard). */
export function QuickActions() {
  return (
    <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
            aria-hidden="true"
          >
            <action.icon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{action.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{action.description}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
