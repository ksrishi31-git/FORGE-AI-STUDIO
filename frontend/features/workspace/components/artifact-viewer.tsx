"use client";

import {
  Braces,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Search,
  Workflow,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AgentDefinition, RunOutput } from "@/services/agents";
import { stepMarkdown } from "@/services/agents";
import type { ArtifactView } from "../hooks/use-workspace-state";
import { useTextSearch } from "../hooks/use-text-search";
import {
  ARTIFACT_TABS,
  artifactTabByKey,
  buildMermaid,
  downloadText,
  extractCodeFiles,
  fullJson,
  stepForAgent,
  structuredJson,
} from "../lib/artifacts";
import { CodeView } from "./viewer/code-view";
import { JsonView } from "./viewer/json-view";
import { MarkdownView } from "./viewer/markdown-view";
import { MermaidView } from "./viewer/mermaid-view";

export interface ArtifactViewerProps {
  output: RunOutput | undefined;
  outputLoading: boolean;
  outputError: boolean;
  definitions: AgentDefinition[] | undefined;
  selectedTab: string;
  view: ArtifactView;
  fullscreen: boolean;
  runActive: boolean;
  onSelectTab: (key: string) => void;
  onViewChange: (view: ArtifactView) => void;
  onFullscreenChange: (fullscreen: boolean) => void;
  onClear: () => void;
}

const VIEW_ORDER: ArtifactView[] = ["markdown", "json", "mermaid", "code"];

const VIEW_META: Record<ArtifactView, { label: string; icon: typeof FileText }> = {
  markdown: { label: "Markdown", icon: FileText },
  json: { label: "JSON", icon: Braces },
  mermaid: { label: "Mermaid", icon: Workflow },
  code: { label: "Code", icon: Code2 },
};

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <FileText className="size-6 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-sm font-medium">No artifacts yet</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Run the pipeline to generate architecture, schema, design, tests, security, deployment,
        documentation, and the final review.
      </p>
    </div>
  );
}

function WaitingState({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Loader2 className="size-5 animate-spin text-warning" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Waiting for <span className="font-medium text-foreground">{label}</span> to produce this
        artifact…
      </p>
    </div>
  );
}

function RunErrorState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-medium">This run is no longer available</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        The run may have been deleted. Clear the workspace to start a fresh session.
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear workspace
      </Button>
    </div>
  );
}

/** Generated Artifacts — tabbed, multi-view artifact inspector (Phase 3.6). */
export function ArtifactViewer({
  output,
  outputLoading,
  outputError,
  definitions,
  selectedTab,
  view,
  fullscreen,
  runActive,
  onSelectTab,
  onViewChange,
  onFullscreenChange,
  onClear,
}: ArtifactViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [includeMarkdown, setIncludeMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);

  const steps = output?.steps ?? [];
  const tab = artifactTabByKey(selectedTab);
  const step = stepForAgent(steps, tab.agentKey);
  const nameFor = (key: string) =>
    definitions?.find((definition) => definition.key === key)?.name ?? key;

  const viewContent = useMemo(() => {
    if (!step) {
      return "";
    }
    switch (view) {
      case "markdown":
        return stepMarkdown(step);
      case "json":
        return JSON.stringify(
          includeMarkdown ? fullJson(step) : structuredJson(step),
          null,
          2,
        );
      case "mermaid":
        return buildMermaid(step) ?? "";
      case "code":
        return extractCodeFiles(step).map((file) => file.content).join("\n");
    }
  }, [view, step, includeMarkdown]);

  const search = useTextSearch(searchQuery, viewContent, fullscreen ? "fullscreen" : "inline");

  const rawContent = useMemo(() => {
    if (!step) {
      return "";
    }
    switch (view) {
      case "markdown":
        return stepMarkdown(step);
      case "json":
        return JSON.stringify(
          includeMarkdown ? fullJson(step) : structuredJson(step),
          null,
          2,
        );
      case "mermaid":
        return buildMermaid(step) ?? "";
      case "code":
        return extractCodeFiles(step)
          .map((file) => `// ${file.file}\n${file.content}`)
          .join("\n\n");
    }
  }, [view, step, includeMarkdown]);

  const copyContent = async () => {
    if (!rawContent) {
      return;
    }
    await navigator.clipboard.writeText(rawContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const downloadContent = () => {
    if (!rawContent) {
      return;
    }
    const extension = view === "json" ? "json" : view === "mermaid" ? "mmd" : "md";
    downloadText(`forgeai-${tab.key}.${extension}`, rawContent);
  };

  const renderBody = () => {
    if (outputLoading && !output) {
      return <WaitingState label={nameFor(tab.agentKey)} />;
    }
    if (outputError) {
      return <RunErrorState onClear={onClear} />;
    }
    if (!output) {
      return <EmptyState />;
    }
    if (!step) {
      return runActive ? (
        <WaitingState label={nameFor(tab.agentKey)} />
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
          {nameFor(tab.agentKey)} did not produce this artifact.
        </div>
      );
    }
    switch (view) {
      case "markdown":
        return <MarkdownView step={step} />;
      case "json":
        return (
          <JsonView
            step={step}
            includeMarkdown={includeMarkdown}
            onToggleMarkdown={() => setIncludeMarkdown((current) => !current)}
          />
        );
      case "mermaid":
        return <MermaidView source={buildMermaid(step)} />;
      case "code":
        return <CodeView files={extractCodeFiles(step)} />;
    }
  };

  const toolbar = (
    <>
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
        {VIEW_ORDER.map((item) => {
          const meta = VIEW_META[item];
          const Icon = meta.icon;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              title={`${meta.label} view (Ctrl/⌘ + V)`}
              onClick={() => onViewChange(item)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === item
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{meta.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative ml-auto w-44">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search artifact"
          aria-label="Search artifact"
          className="h-7 pl-7 pr-8 text-xs"
        />
        {searchQuery.trim() ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground">
            {search.count > 0 ? `${search.active + 1}/${search.count}` : "0/0"}
          </span>
        ) : null}
      </div>
      {searchQuery.trim() ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Previous match"
            disabled={search.count === 0}
            onClick={search.prev}
          >
            <ChevronUp className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Next match"
            disabled={search.count === 0}
            onClick={search.next}
          >
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </Button>
        </>
      ) : null}

      <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label="Copy artifact"
        title="Copy artifact"
        disabled={!rawContent}
        onClick={() => void copyContent()}
      >
        {copied ? (
          <Check className="size-3.5 text-success" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label="Download artifact"
        title="Download artifact"
        disabled={!rawContent}
        onClick={downloadContent}
      >
        <Download className="size-3.5" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen viewer"}
        title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen viewer (Ctrl/⌘ + Shift + F)"}
        onClick={() => onFullscreenChange(!fullscreen)}
      >
        {fullscreen ? (
          <X className="size-3.5" aria-hidden="true" />
        ) : (
          <Maximize2 className="size-3.5" aria-hidden="true" />
        )}
      </Button>
    </>
  );

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    const triggers = Array.from(
      tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const index = triggers.findIndex((trigger) => trigger === document.activeElement);
    if (index === -1) {
      return;
    }
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + triggers.length) % triggers.length;
    triggers[next]?.focus();
    triggers[next]?.click();
    event.preventDefault();
  };

  const tabBar = (
    <div
      ref={tabListRef}
      onKeyDown={handleTabKeyDown}
      className="flex shrink-0 items-end gap-0.5 overflow-x-auto border-b border-border px-2"
      role="tablist"
      aria-label="Artifact tabs"
    >
      {ARTIFACT_TABS.map((item) => {
        const itemStep = stepForAgent(steps, item.agentKey);
        const selected = item.key === tab.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            title={`${item.label} (Ctrl/⌘ + ${item.shortcut})`}
            onClick={() => onSelectTab(item.key)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {itemStep?.status === "completed" ? (
              <span
                className="size-1.5 rounded-full bg-success"
                aria-label="Artifact ready"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      {tabBar}

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-2 py-1">
        {toolbar}
      </div>

      {!fullscreen ? (
        // The container is keyed by the artifact content so a content change
        // remounts the subtree: React never reconciles through the search
        // <mark> elements, and the search effect re-highlights the fresh DOM.
        <div
          key={viewContent}
          ref={search.containerRef}
          className="workspace-scroll min-h-0 flex-1 overflow-auto p-4"
        >
          {renderBody()}
        </div>
      ) : null}

      {fullscreen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-1">
            {toolbar}
          </div>
          <div
            key={viewContent}
            ref={search.containerRef}
            className="workspace-scroll min-h-0 flex-1 overflow-auto p-6"
          >
            {renderBody()}
          </div>
        </div>
      ) : null}
    </section>
  );
}
