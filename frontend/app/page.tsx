import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  GitBranch,
  Layers,
  Rocket,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Autonomous software engineering",
  description:
    "Plain-English requirements become production-ready applications through a governed pipeline of ten specialized agents.",
};

const FEATURES = [
  {
    icon: Bot,
    title: "Governed agent runs",
    description:
      "Ten specialized agents collaborate under a LangGraph pipeline, each step validated and approved before it moves forward.",
  },
  {
    icon: GitBranch,
    title: "Project workspaces",
    description:
      "Capture requirements in plain English and watch the pipeline plan, build, and iterate within a live execution workspace.",
  },
  {
    icon: Layers,
    title: "Architecture viewer",
    description:
      "Inspect the agent graph, step dependencies, and execution timeline so every decision in the pipeline stays auditable.",
  },
  {
    icon: Terminal,
    title: "Live execution",
    description:
      "Follow console output, artifacts, and run state in real time with the same tools your agents use.",
  },
  {
    icon: Rocket,
    title: "Deployment center",
    description:
      "Track API health, readiness probes, and deployment status across your environments from one place.",
  },
  {
    icon: BookOpen,
    title: "Documentation center",
    description:
      "A living reference for the platform — architecture, agent definitions, and developer guides built in.",
  },
];

/** Decorative pipeline: Requirement → Agents → Deploy (theme-adaptive SVG). */
function PipelineIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 160"
      fill="none"
      aria-hidden="true"
      className={cn("text-muted-foreground", className)}
    >
      <rect
        x="16"
        y="56"
        width="120"
        height="64"
        rx="10"
        className="fill-muted"
        stroke="currentColor"
        strokeWidth="1"
      />
      <text
        x="76"
        y="80"
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        className="fill-foreground"
      >
        Requirement
      </text>
      <text x="76" y="98" textAnchor="middle" fontSize="10" className="fill-muted-foreground">
        plain English
      </text>

      <rect
        x="180"
        y="40"
        width="120"
        height="96"
        rx="10"
        className="fill-accent"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="240" cy="64" r="6" className="fill-primary" />
      <circle cx="240" cy="84" r="6" className="fill-primary" opacity="0.55" />
      <circle cx="240" cy="104" r="6" className="fill-primary" opacity="0.25" />
      <text
        x="240"
        y="122"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        className="fill-accent-foreground"
      >
        Agents
      </text>

      <rect
        x="344"
        y="56"
        width="120"
        height="64"
        rx="10"
        className="fill-muted"
        stroke="currentColor"
        strokeWidth="1"
      />
      <text
        x="404"
        y="80"
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        className="fill-foreground"
      >
        Deploy
      </text>
      <text x="404" y="98" textAnchor="middle" fontSize="10" className="fill-muted-foreground">
        production
      </text>

      <path d="M140 88 L174 88" stroke="currentColor" strokeWidth="1.5" />
      <path d="M168 80 L178 88 L168 96" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M304 88 L338 88" stroke="currentColor" strokeWidth="1.5" />
      <path d="M332 80 L342 88 L332 96" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Public marketing landing page (FAD §2 — public routes). */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="ForgeAI Studio — home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link href="/#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="/#about" className="transition-colors hover:text-foreground">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}
            >
              Sign in
            </Link>
            <Link href="/auth/register" className={buttonVariants()}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              Governed multi-agent software engineering
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Plain-English requirements become production-ready software
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              ForgeAI Studio turns requirements into running applications through a governed
              pipeline of ten specialized agents — plan, build, and deploy with every step
              auditable.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }), "group")}>
                Get started
                <ArrowRight
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/auth/login"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Sign in
              </Link>
            </div>
          </div>

          <PipelineIllustration className="mx-auto mt-16 w-full max-w-2xl" />
        </section>

        <section id="features" className="border-y border-border bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything you need to ship with agents
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A governed pipeline, transparent execution, and a workspace built for verification
                at every step.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <feature.icon className="size-5 text-primary" aria-hidden="true" />
                    <CardTitle className="mt-3">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Autonomous engineering, under your control
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                ForgeAI Studio is an autonomous multi-agent software engineering platform. Describe
                what you want to build in plain English, and a governed pipeline of specialized
                agents plans the work, writes the code, runs it, and prepares it for deployment —
                with every step tracked and every artifact inspectable.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  Role-based access with admin and developer permissions.
                </li>
                <li className="flex items-start gap-2.5">
                  <GitBranch className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  Project-scoped runs with full execution history and notifications.
                </li>
                <li className="flex items-start gap-2.5">
                  <Rocket className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  Deployment health and readiness monitoring built in.
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }), "group")}>
                  Start building
                  <ArrowRight
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>

            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-lg">How it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  {
                    step: "01",
                    title: "Describe your requirement",
                    body: "Write what you want in plain English — features, constraints, and acceptance criteria.",
                  },
                  {
                    step: "02",
                    title: "Agents plan and build",
                    body: "A governed pipeline decomposes the work, writes code, and iterates with live feedback.",
                  },
                  {
                    step: "03",
                    title: "Verify and deploy",
                    body: "Review artifacts, watch executions, and ship through the deployment center.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-sm space-y-3">
              <Link href="/" aria-label="ForgeAI Studio — home">
                <Logo />
              </Link>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Autonomous multi-agent software engineering platform.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div className="space-y-2.5 text-sm">
                <p className="font-medium">Product</p>
                <Link
                  href="/#features"
                  className="block text-muted-foreground transition-colors hover:text-foreground"
                >
                  Features
                </Link>
                <Link
                  href="/#about"
                  className="block text-muted-foreground transition-colors hover:text-foreground"
                >
                  About
                </Link>
              </div>
              <div className="space-y-2.5 text-sm">
                <p className="font-medium">Account</p>
                <Link
                  href="/auth/login"
                  className="block text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="block text-muted-foreground transition-colors hover:text-foreground"
                >
                  Create account
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} ForgeAI Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
