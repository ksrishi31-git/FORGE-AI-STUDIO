"use client";

import {
  BookOpen,
  Check,
  Copy,
  Download,
  FolderKanban,
  Printer,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useRunSource } from "@/features/centers/hooks/use-run-source";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { Markdown } from "@/features/agents/components/markdown";
import { downloadText } from "@/lib/download";
import { cn } from "@/lib/utils";
import {
  assembleMarkdown,
  docSectionByKey,
  DOC_SECTIONS,
  sectionMarkdown,
  sectionStep,
} from "../lib/sections";

interface CopyState {
  key: string;
  copied: boolean;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <AlertTriangle className="size-5" />
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight">Unable to load the documentation</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        The pipeline data could not be fetched. Check the connection and retry.
      </p>
      <Button size="sm" variant="outline" className="mt-6" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState({ hasProject }: { hasProject: boolean }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        {hasProject ? <BookOpen className="size-5" /> : <FolderKanban className="size-5" />}
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight">
        {hasProject ? "No documentation yet" : "Select a project"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {hasProject
          ? "Run the agent pipeline in the workspace to generate the full documentation set."
          : "Choose a project above to read the documentation its agent pipeline generated."}
      </p>
    </div>
  );
}

export function DocumentationPage({ initialProjectId }: { initialProjectId: string | null }) {
  const projectsQuery = useProjects({ page_size: 50 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data]);

  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId ?? undefined);
  const source = useRunSource(projectId);

  const [activeKey, setActiveKey] = useState(DOC_SECTIONS[0].key);
  const [query, setQuery] = useState("");
  const [copyState, setCopyState] = useState<CopyState | null>(null);

  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initialProjectId || projectsQuery.isLoading) {
      return;
    }
    appliedInitial.current = true;
    if (projects.some((project) => project.id === initialProjectId)) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId, projects, projectsQuery.isLoading]);

  const projectName =
    projects.find((project) => project.id === projectId)?.name ?? "Project";

  // Search: filter sections by their content (and label) so users can jump to
  // the part of the doc that answers their query.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return DOC_SECTIONS.map((section) => ({
        section,
        count: 0,
        step: sectionStep(source.steps, section),
      }));
    }
    return DOC_SECTIONS.map((section) => {
      const step = sectionStep(source.steps, section);
      const content = sectionMarkdown(step, section);
      const haystack = `${section.label}\n${content}`.toLowerCase();
      return { section, count: haystack.split(needle).length - 1, step };
    }).filter((match) => match.count > 0);
  }, [query, source.steps]);

  const activeSection = docSectionByKey(activeKey);
  const activeMatch = matches.find((match) => match.section.key === activeKey);
  const activeStep = activeMatch?.step ?? sectionStep(source.steps, activeSection);
  const activeMarkdown = sectionMarkdown(activeStep, activeSection);

  const handleCopySection = async () => {
    try {
      await navigator.clipboard.writeText(activeMarkdown);
      setCopyState({ key: activeKey, copied: true });
      setTimeout(() => setCopyState((current) => (current?.key === activeKey ? null : current)), 1600);
    } catch {
      // Clipboard unavailable — no-op; the download button remains an option.
    }
  };

  const handleCopyAll = async () => {
    const full = assembleMarkdown(source.steps, projectName, source.output?.requirements ?? null);
    try {
      await navigator.clipboard.writeText(full);
      setCopyState({ key: "all", copied: true });
      setTimeout(() => setCopyState((current) => (current?.key === "all" ? null : current)), 1600);
    } catch {
      // Ignore clipboard permission errors.
    }
  };

  const handleDownload = () => {
    const full = assembleMarkdown(source.steps, projectName, source.output?.requirements ?? null);
    downloadText(`${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-documentation.md`, full, "text/markdown;charset=utf-8");
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleCopySection}>
        {copyState?.key === activeKey ? (
          <Check className="text-success" aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        Copy section
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleCopyAll}>
        {copyState?.key === "all" ? (
          <Check className="text-success" aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        Copy all
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
        <Download aria-hidden="true" />
        Download .md
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer aria-hidden="true" />
        Print
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-2">
      <div className="print:hidden">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Documentation" },
          ]}
        />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Documentation Center</h1>
          <p className="text-sm text-muted-foreground">
            Search, copy, and export the documentation generated by the agent pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-72">
            <label
              htmlFor="documentation-project"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Project
            </label>
            <Select
              id="documentation-project"
              value={projectId ?? ""}
              onChange={(event) => setProjectId(event.target.value || undefined)}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </header>

      {!projectId ? (
        <EmptyState hasProject={false} />
      ) : source.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : source.error ? (
        <ErrorState onRetry={source.refetch} />
      ) : source.empty || !source.steps ? (
        <EmptyState hasProject />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] print:block">
          {/* Section navigator */}
          <aside className="print:hidden">
            <div className="sticky top-20 space-y-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search documentation..."
                  aria-label="Search documentation"
                  className="h-9 pl-8"
                />
              </div>

              <nav aria-label="Documentation sections" className="space-y-1">
                {matches.map(({ section, count }) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveKey(section.key)}
                    aria-current={section.key === activeKey ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      section.key === activeKey
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{section.label}</span>
                    {query.trim() && count > 0 ? (
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    ) : null}
                  </button>
                ))}
                {matches.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No sections match “{query}”.
                  </p>
                ) : null}
              </nav>
            </div>
          </aside>

          {/* Document content */}
          <article className="min-w-0">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{activeSection.label}</h2>
                <p className="text-sm text-muted-foreground">{activeSection.description}</p>
              </div>
              {toolbar}
            </header>

            <div
              className="min-h-[420px] rounded-lg border border-border bg-card p-6 sm:p-8 print:border-0 print:p-0"
              data-print-doc
            >
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-1 text-xl font-semibold tracking-tight">{projectName}</h1>
                <p className="mb-6 border-b border-border pb-4 text-sm text-muted-foreground">
                  {activeSection.label}
                </p>
                <Markdown content={activeMarkdown} />
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
