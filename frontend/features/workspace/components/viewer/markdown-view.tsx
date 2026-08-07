"use client";

import { Markdown } from "@/features/agents/components/markdown";
import type { AgentStep } from "@/services/agents";
import { stepMarkdown } from "@/services/agents";

/** Markdown view for an agent artifact (FAD §9 — Markdown Viewer). */
export function MarkdownView({ step }: { step: AgentStep }) {
  return <Markdown content={stepMarkdown(step)} />;
}
