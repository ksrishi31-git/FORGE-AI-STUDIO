"use client";

import { ChevronDown, FileText } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StackPicker } from "@/features/projects/components/stack-picker";
import { cn } from "@/lib/utils";

import type { RunModeInput } from "../hooks/use-workspace-state";

export interface RequirementsEditorProps {
  requirements: string;
  onRequirementsChange: (value: string) => void;
  preferredStack: string[];
  onStackChange: (value: string[]) => void;
  mode: RunModeInput;
  onModeChange: (value: RunModeInput) => void;
  open: boolean;
  onToggleOpen: () => void;
}

const MAX_REQUIREMENTS = 100_000;

/** Requirement Editor — the workspace's product brief input (Phase 3.6). */
export function RequirementsEditor({
  requirements,
  onRequirementsChange,
  preferredStack,
  onStackChange,
  mode,
  onModeChange,
  open,
  onToggleOpen,
}: RequirementsEditorProps) {
  return (
    <section className="shrink-0 border-b border-border bg-card">
      <header className="flex h-9 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileText className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Requirements</span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              open ? "rotate-180" : "-rotate-90",
            )}
            aria-hidden="true"
          />
        </button>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {requirements.length.toLocaleString()} / {MAX_REQUIREMENTS.toLocaleString()}
        </span>
      </header>

      {open ? (
        <div className="space-y-3 px-3 pb-3">
          <Textarea
            value={requirements}
            onChange={(event) => onRequirementsChange(event.target.value)}
            maxLength={MAX_REQUIREMENTS}
            rows={4}
            className="min-h-20 resize-y font-mono text-xs leading-relaxed"
            placeholder="Describe the product in plain English. The ten agents turn this into architecture, schema, code design, tests, security review, deployment plan, and documentation."
            aria-label="Business requirements"
          />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="workspace-stack" className="text-[11px] font-medium">
                Preferred stack
              </Label>
              <StackPicker id="workspace-stack" value={preferredStack} onChange={onStackChange} />
            </div>
            <div className="w-full shrink-0 space-y-1.5 lg:w-56">
              <Label htmlFor="workspace-mode" className="text-[11px] font-medium">
                Execution mode
              </Label>
              <Select
                id="workspace-mode"
                value={mode}
                onChange={(event) => onModeChange(event.target.value as RunModeInput)}
              >
                <option value="auto">Auto (LLM when configured)</option>
                <option value="deterministic">Deterministic engine</option>
                <option value="llm">LLM (requires API key)</option>
              </Select>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            The draft is saved locally and restored when you return to this workspace.
          </p>
        </div>
      ) : null}
    </section>
  );
}
