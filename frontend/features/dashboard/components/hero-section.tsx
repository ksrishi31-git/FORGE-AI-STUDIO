"use client";

import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";
import type { DashboardAvailability, DashboardOverview } from "../use-dashboard";

const PILL_VARIANT: Record<
  DashboardAvailability,
  { container: string; dot: string; label: string }
> = {
  ok: {
    container: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
    label: "All systems operational",
  },
  partial: {
    container: "border-warning/30 bg-warning/10 text-warning",
    dot: "bg-warning",
    label: "Some data unavailable",
  },
  unreachable: {
    container: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    label: "API unreachable",
  },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

/** Decorative pipeline: Requirement → Agents → Deploy (SVG, theme-adaptive). */
function PipelineIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 128"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0 text-muted-foreground", className)}
    >
      <rect
        x="8"
        y="40"
        width="84"
        height="48"
        rx="8"
        className="fill-muted"
        stroke="currentColor"
        strokeWidth="1"
      />
      <text
        x="50"
        y="59"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        className="fill-foreground"
      >
        Requirement
      </text>
      <text x="50" y="74" textAnchor="middle" fontSize="9" className="fill-muted-foreground">
        plain English
      </text>

      <rect
        x="128"
        y="28"
        width="64"
        height="72"
        rx="8"
        className="fill-accent"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="160" cy="46" r="5" className="fill-primary" />
      <circle cx="160" cy="62" r="5" className="fill-primary" opacity="0.55" />
      <circle cx="160" cy="78" r="5" className="fill-primary" opacity="0.25" />
      <text
        x="160"
        y="92"
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        className="fill-accent-foreground"
      >
        Agents
      </text>

      <rect
        x="228"
        y="40"
        width="84"
        height="48"
        rx="8"
        className="fill-muted"
        stroke="currentColor"
        strokeWidth="1"
      />
      <text
        x="270"
        y="59"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        className="fill-foreground"
      >
        Deploy
      </text>
      <text x="270" y="74" textAnchor="middle" fontSize="9" className="fill-muted-foreground">
        production
      </text>

      <path d="M96 64 L122 64" stroke="currentColor" strokeWidth="1.5" />
      <path d="M118 58 L126 64 L118 70" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M196 64 L222 64" stroke="currentColor" strokeWidth="1.5" />
      <path d="M218 58 L226 64 L218 70" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function HeroSection({ overview }: { overview: DashboardOverview | undefined }) {
  const { user } = useSession();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const availability = overview?.availability ?? "ok";
  const pill = PILL_VARIANT[availability];

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
      <div className="max-w-xl space-y-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            pill.container,
          )}
        >
          <span className={cn("size-1.5 rounded-full", pill.dot)} aria-hidden="true" />
          {pill.label}
        </span>

        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Here is what is happening across your autonomous engineering pipeline. Create a project to
          start a governed agent run.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link href="/projects">
            <Button>
              <Plus aria-hidden="true" />
              Create project
            </Button>
          </Link>
          <Link href="/documentation">
            <Button variant="outline">
              <BookOpen aria-hidden="true" />
              Open documentation
            </Button>
          </Link>
        </div>
      </div>

      <PipelineIllustration className="hidden w-full max-w-xs lg:block" />
    </section>
  );
}
