"use client";

import {
  ArrowDownToLine,
  Boxes,
  Braces,
  CircleDot,
  Download,
  FileText,
  TerminalSquare,
  TriangleAlert,
} from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentDefinition, AgentStep, RunOutput } from "@/services/agents";
import { stepMarkdown } from "@/services/agents";
import { Markdown } from "./markdown";
import { StepStatusBadge } from "./status-badges";

export interface OutputViewerProps {
  output: RunOutput;
  definitions: AgentDefinition[] | undefined;
  selectedAgent: string;
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function OutputViewer({ output, definitions, selectedAgent }: OutputViewerProps) {
  // Steps are chronological; the feedback loop re-runs agents, so the latest
  // step per agent carries the final artifact (never a stale first match).
  const step =
    [...output.steps].reverse().find((item) => item.agent === selectedAgent) ?? output.steps[0];
  const nameFor = (key: string) =>
    definitions?.find((definition) => definition.key === key)?.name ?? key;

  const markdown = useMemo(() => (step ? stepMarkdown(step) : ""), [step]);

  const downloadAll = () => {
    const parts = [
      `# ForgeAI Studio — Agent Run Output`,
      ``,
      `Run: ${output.run.id}`,
      `Status: ${output.run.status} · Mode: ${output.run.mode}`,
      ``,
    ];
    for (const item of output.steps) {
      parts.push(`---`, ``);
      parts.push(`## ${nameFor(item.agent)}`, ``);
      parts.push(stepMarkdown(item) || "_No artifact produced._", ``);
    }
    downloadMarkdown(`forgeai-run-${output.run.id.slice(0, 8)}.md`, parts.join("\n"));
  };

  if (!step) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            No artifacts yet — the pipeline has not produced any steps.
          </p>
        </CardContent>
      </Card>
    );
  }

  const summary = (item: AgentStep) => {
    const rows: { icon: typeof CircleDot; label: string; value: string }[] = [];
    if ((item.iteration ?? 1) > 1) {
      rows.push({ icon: CircleDot, label: "Iteration", value: String(item.iteration) });
    }
    if (item.model_used) {
      rows.push({ icon: Boxes, label: "Model", value: item.model_used });
    }
    if (item.token_usage != null) {
      rows.push({ icon: Braces, label: "Tokens", value: item.token_usage.toLocaleString() });
    }
    if (item.error) {
      rows.push({ icon: TriangleAlert, label: "Error", value: item.error });
    }
    return rows;
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          {nameFor(step.agent)}
          <StepStatusBadge status={step.status} />
        </CardTitle>
        <Button variant="outline" size="sm" onClick={downloadAll}>
          <Download aria-hidden="true" />
          Download output
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Real execution metadata (Phase 4.0) */}
        {summary(step).length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary(step).map((row) => (
              <div
                key={row.label}
                className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2.5"
              >
                <row.icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </p>
                  <p className="truncate text-xs font-medium" title={row.value}>
                    {row.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step.input_artifacts && step.input_artifacts.length > 0 ? (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ArrowDownToLine className="size-3.5" aria-hidden="true" />
              Input artifacts
            </p>
            <div className="flex flex-wrap gap-1.5">
              {step.input_artifacts.map((artifact) => (
                <span
                  key={artifact}
                  className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {artifact.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {step.feedback && step.feedback.length > 0 ? (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-warning">
              <TerminalSquare className="size-3.5" aria-hidden="true" />
              Reviewer feedback addressed
            </p>
            <ul className="space-y-1.5">
              {step.feedback.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-warning/20 bg-warning/5 px-3 py-1.5 text-xs text-warning"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {step.logs && step.logs.length > 0 ? (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <TerminalSquare className="size-3.5" aria-hidden="true" />
              Logs
            </p>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/60 p-3 font-mono text-xs leading-relaxed">
              {step.logs.join("\n")}
            </pre>
          </div>
        ) : null}

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FileText className="size-3.5" aria-hidden="true" />
            Artifact
          </p>
          {markdown ? (
            <Markdown content={markdown} />
          ) : (
            <p className="text-sm text-muted-foreground">No artifact produced for this step.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
