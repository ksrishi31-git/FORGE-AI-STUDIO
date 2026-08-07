/**
 * Artifact helpers for the Agent Workspace (Phase 3.6).
 *
 * The pipeline produces one structured artifact per agent (each carrying a
 * `markdown` field). This module maps artifacts to workspace tabs, derives
 * display telemetry (confidence, memory) from the structured output, and
 * generates Mermaid diagrams / code listings for the viewer.
 */
import type { AgentStep } from "@/services/agents";
import { stepMarkdown } from "@/services/agents";

// --- Artifact tabs -----------------------------------------------------------

export interface ArtifactTab {
  /** Stable workspace key (also persisted in the session). */
  key: string;
  /** Agent that produces this artifact. */
  agentKey: string;
  label: string;
  /** Ctrl/Cmd + N shortcut number. */
  shortcut: number;
}

/** The nine artifact tabs of the workspace (FAD §9 — Artifact Tabs). */
export const ARTIFACT_TABS: ArtifactTab[] = [
  { key: "architecture", agentKey: "solution_architect", label: "Architecture", shortcut: 1 },
  { key: "database", agentKey: "database_architect", label: "Database", shortcut: 2 },
  { key: "backend", agentKey: "backend_engineer", label: "Backend", shortcut: 3 },
  { key: "frontend", agentKey: "frontend_engineer", label: "Frontend", shortcut: 4 },
  { key: "qa", agentKey: "qa_engineer", label: "QA", shortcut: 5 },
  { key: "security", agentKey: "security_auditor", label: "Security", shortcut: 6 },
  { key: "deployment", agentKey: "devops_engineer", label: "Deployment", shortcut: 7 },
  { key: "documentation", agentKey: "technical_writer", label: "Documentation", shortcut: 8 },
  { key: "review", agentKey: "reviewer", label: "Review", shortcut: 9 },
];

export function artifactTabByKey(key: string | null | undefined): ArtifactTab {
  return ARTIFACT_TABS.find((tab) => tab.key === key) ?? ARTIFACT_TABS[0];
}

export function artifactTabForAgent(agentKey: string): ArtifactTab | undefined {
  return ARTIFACT_TABS.find((tab) => tab.agentKey === agentKey);
}

/** Latest step for an agent (the reflection loop may re-run an agent). */
export function stepForAgent(
  steps: AgentStep[] | undefined,
  agentKey: string,
): AgentStep | undefined {
  if (!steps) {
    return undefined;
  }
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    if (steps[index].agent === agentKey) {
      return steps[index];
    }
  }
  return undefined;
}

// --- Display telemetry -------------------------------------------------------
//
// The engine reports execution time and artifacts per agent but not confidence
// or memory. Both are derived deterministically from the structured output so
// the pipeline cards can surface them without fabricating data: confidence is
// the ratio of populated artifact fields, memory is the serialized size.

export function stepConfidence(step: AgentStep | undefined): number | null {
  const output = step?.output;
  if (!output || step.status !== "completed") {
    return null;
  }
  const entries = Object.entries(output).filter(([key]) => key !== "markdown");
  if (entries.length === 0) {
    return null;
  }
  let filled = 0;
  for (const [, value] of entries) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        filled += 1;
      }
    } else if (typeof value === "string") {
      if (value.trim().length > 0) {
        filled += 1;
      }
    } else if (value !== null && value !== undefined) {
      filled += 1;
    }
  }
  return Math.min(99, Math.round(55 + (filled / entries.length) * 43));
}

export function stepMemoryBytes(step: AgentStep | undefined): number {
  const output = step?.output;
  if (!output) {
    return 0;
  }
  try {
    return new TextEncoder().encode(JSON.stringify(output)).length;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// --- Structured JSON view ----------------------------------------------------

export function structuredJson(step: AgentStep | undefined): Record<string, unknown> | null {
  const output = step?.output;
  if (!output) {
    return null;
  }
  // The rendered markdown lives in its own view; keep the JSON view structured.
  return Object.fromEntries(Object.entries(output).filter(([key]) => key !== "markdown"));
}

export function fullJson(step: AgentStep | undefined): Record<string, unknown> | null {
  return step?.output ?? null;
}

// --- Mermaid generation ------------------------------------------------------

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function escLabel(value: unknown): string {
  return String(value ?? "").replace(/["\r\n]/g, " ").trim();
}

function architectureMermaid(output: Record<string, unknown>): string {
  const components = arr(output.components);
  const flow = arr(output.data_flow);
  const lines: string[] = ["flowchart TD"];
  const ids: string[] = [];
  components.forEach((component, index) => {
    const id = `C${index + 1}`;
    ids.push(id);
    lines.push(`  ${id}["${escLabel(obj(component).name ?? `Component ${index + 1}`)}"]`);
  });
  for (let index = 0; index < ids.length - 1; index += 1) {
    lines.push(`  ${ids[index]} --> ${ids[index + 1]}`);
  }
  flow.slice(0, 6).forEach((line, index) => {
    const id = `F${index + 1}`;
    lines.push(`  ${id}["${escLabel(line)}"]`);
    lines.push(`  ${id} -.-> ${ids[Math.min(index, ids.length - 1)]}`);
  });
  return lines.join("\n");
}

function databaseMermaid(output: Record<string, unknown>): string | null {
  const tables = arr(output.tables);
  if (tables.length === 0) {
    return null;
  }
  const lines: string[] = ["erDiagram"];
  for (const table of tables) {
    const name = escLabel(obj(table).name ?? "");
    for (const foreignKey of arr(obj(table).foreign_keys)) {
      const match = /(\w+)_id\s*→\s*(\w+)s\.id/.exec(String(foreignKey));
      if (match) {
        lines.push(`  "${match[2]}s" ||--o{ "${name}" : "references"`);
      }
    }
  }
  return lines.length > 1 ? lines.join("\n") : null;
}

function backendMermaid(output: Record<string, unknown>): string {
  const modules = arr(output.key_modules);
  const endpoints = arr(output.api_endpoints);
  const lines: string[] = ["flowchart LR"];
  lines.push('  Client["Client"] --> API["API Backend"]');
  lines.push('  API --> DB[("Database")]');
  modules.slice(0, 5).forEach((module, index) => {
    lines.push(`  API --> M${index + 1}["${escLabel(module)}"]`);
  });
  endpoints.slice(0, 5).forEach((endpoint, index) => {
    lines.push(`  E${index + 1}["${escLabel(endpoint)}"] -.-> API`);
  });
  return lines.join("\n");
}

function deploymentMermaid(output: Record<string, unknown>): string | null {
  const services = arr(output.services);
  if (services.length === 0) {
    return null;
  }
  const lines: string[] = ["flowchart LR"];
  const ids: string[] = [];
  services.forEach((service, index) => {
    const item = obj(service);
    const id = `S${index + 1}`;
    ids.push(id);
    const port = escLabel(item.port);
    lines.push(`  ${id}["${escLabel(item.name ?? `service ${index + 1}`)}${port ? ` :${port}` : ""}"]`);
  });
  for (let index = 0; index < ids.length - 1; index += 1) {
    lines.push(`  ${ids[index]} --> ${ids[index + 1]}`);
  }
  return lines.join("\n");
}

/**
 * Build a Mermaid diagram source from a completed step's structured output.
 *
 * Phase 4.0: the backend now emits a project-specific `mermaid` field derived
 * from the actual architecture artifact (stack-aware components, services, AI
 * layer). When present it is used verbatim; the client-side generators below
 * remain as a fallback for older persisted runs.
 */
export function buildMermaid(step: AgentStep | undefined): string | null {
  const output = step?.output;
  if (!output || step.status !== "completed") {
    return null;
  }
  const serverMermaid = output.mermaid;
  if (typeof serverMermaid === "string" && serverMermaid.trim().length > 0) {
    return serverMermaid;
  }
  switch (step.agent) {
    case "solution_architect":
      return architectureMermaid(output);
    case "database_architect":
      return databaseMermaid(output);
    case "backend_engineer":
      return backendMermaid(output);
    case "devops_engineer":
      return deploymentMermaid(output);
    default:
      return null;
  }
}

// --- Code extraction ---------------------------------------------------------

export interface CodeFile {
  file: string;
  language: string;
  content: string;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  md: "markdown",
  dockerfile: "docker",
};

export function normalizeLanguage(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) {
    return "text";
  }
  return LANGUAGE_ALIASES[raw] ?? raw;
}

function extensionFor(language: string): string {
  const map: Record<string, string> = {
    typescript: "ts",
    javascript: "js",
    python: "py",
    bash: "sh",
    yaml: "yaml",
    markdown: "md",
    json: "json",
    sql: "sql",
    docker: "docker",
    text: "txt",
  };
  return map[language] ?? "txt";
}

const FENCE_SOURCE = /```([\w+-]*)[ \t]*\n?([\s\S]*?)```/g.source;

/**
 * Code artifacts for a step: structured `code_snippets` when the agent emitted
 * them (backend engineer), otherwise fenced code blocks parsed from markdown.
 */
export function extractCodeFiles(step: AgentStep | undefined): CodeFile[] {
  const output = step?.output;
  if (!output) {
    return [];
  }
  const snippets = output.code_snippets;
  if (Array.isArray(snippets)) {
    const files: CodeFile[] = [];
    for (const snippet of snippets) {
      const item = obj(snippet);
      const content = String(item.content ?? "");
      if (!content.trim()) {
        continue;
      }
      files.push({
        file: String(item.file ?? "snippet"),
        language: normalizeLanguage(String(item.language ?? "text")),
        content,
      });
    }
    if (files.length > 0) {
      return files;
    }
  }
  const markdown = stepMarkdown(step);
  if (!markdown) {
    return [];
  }
  const files: CodeFile[] = [];
  const regex = new RegExp(FENCE_SOURCE, "g");
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(markdown)) !== null) {
    const language = normalizeLanguage(match[1]);
    files.push({
      file: `block-${index + 1}.${extensionFor(language)}`,
      language,
      content: match[2].replace(/\n$/, ""),
    });
    index += 1;
  }
  return files;
}

// --- Download ----------------------------------------------------------------
//
// `downloadText` moved to the shared download lib (Phase 3.7) so the
// Architecture / Documentation / Deployment centers reuse one implementation.

export { downloadText } from "@/lib/download";
