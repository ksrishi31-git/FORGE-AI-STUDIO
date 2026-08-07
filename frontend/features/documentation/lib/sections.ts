/**
 * Documentation Center sections (Phase 3.8).
 *
 * Each section maps to a pipeline artifact. The `markdown` field of the agent
 * output is the canonical content; a few sections derive content from the
 * structured output (e.g. APIs from the backend endpoint contract) so the
 * center is useful even before an LLM is configured.
 */
import { stepForAgent } from "@/features/workspace/lib/artifacts";
import { stepMarkdown, type AgentStep } from "@/services/agents";

export interface DocSection {
  key: string;
  label: string;
  /** Pipeline agent whose artifact feeds this section. */
  agentKey: string;
  description: string;
}

export const DOC_SECTIONS: DocSection[] = [
  {
    key: "overview",
    label: "Project Overview",
    agentKey: "product_manager",
    description: "Product brief, features, and acceptance criteria.",
  },
  {
    key: "requirements",
    label: "Requirements",
    agentKey: "product_manager",
    description: "The original business requirements and scope.",
  },
  {
    key: "architecture",
    label: "Architecture",
    agentKey: "solution_architect",
    description: "System components, data flow, and technology decisions.",
  },
  {
    key: "database",
    label: "Database",
    agentKey: "database_architect",
    description: "Relational schema, relationships, and migration notes.",
  },
  {
    key: "backend",
    label: "Backend",
    agentKey: "backend_engineer",
    description: "Module map, endpoints, and service design.",
  },
  {
    key: "frontend",
    label: "Frontend",
    agentKey: "frontend_engineer",
    description: "Pages, component library, and data layer.",
  },
  {
    key: "apis",
    label: "APIs",
    agentKey: "backend_engineer",
    description: "Endpoint contract derived from the backend artifact.",
  },
  {
    key: "testing",
    label: "Testing",
    agentKey: "qa_engineer",
    description: "Test plan, cases, and coverage matrix.",
  },
  {
    key: "security",
    label: "Security",
    agentKey: "security_auditor",
    description: "Findings and hardening checklist.",
  },
  {
    key: "deployment",
    label: "Deployment",
    agentKey: "devops_engineer",
    description: "Services, environment, CI/CD, and rollback.",
  },
  {
    key: "review",
    label: "Final Review",
    agentKey: "reviewer",
    description: "Quality gate verdict and feedback.",
  },
];

export function docSectionByKey(key: string | undefined): DocSection {
  return DOC_SECTIONS.find((section) => section.key === key) ?? DOC_SECTIONS[0];
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** API reference markdown derived from the backend artifact's endpoint list. */
function apiSectionMarkdown(step: AgentStep | undefined): string {
  const output = step?.output;
  const endpoints = output ? arr(output.api_endpoints) : [];
  if (endpoints.length === 0) {
    return (step ? stepMarkdown(step) : "") || "No API endpoint contract was produced.";
  }
  const lines = ["# API Reference", "", "## Endpoints", ""];
  for (const endpoint of endpoints) {
    const text = str(endpoint);
    const match = /^(GET|POST|PATCH|PUT|DELETE)\s+(.+)$/.exec(text.trim());
    if (match) {
      lines.push(`### \`${match[1]} ${match[2]}\``);
    } else {
      lines.push(`- \`${text}\``);
    }
  }
  const deps = output ? arr(output.dependencies) : [];
  if (deps.length > 0) {
    lines.push("", "## Dependencies", "");
    lines.push(...deps.map((dependency) => `- ${str(dependency)}`));
  }
  return lines.join("\n");
}

/** Resolve the markdown content for a documentation section. */
export function sectionMarkdown(step: AgentStep | undefined, section: DocSection): string {
  if (section.key === "apis") {
    return apiSectionMarkdown(step);
  }
  return (step ? stepMarkdown(step) : "") ||
    "This section has no content yet — run the pipeline to generate it.";
}

/** Resolve the agent step feeding a section (the latest execution wins). */
export function sectionStep(steps: AgentStep[] | undefined, section: DocSection): AgentStep | undefined {
  return stepForAgent(steps, section.agentKey);
}

/** Assemble the full document as a single markdown file (for download). */
export function assembleMarkdown(
  steps: AgentStep[] | undefined,
  projectName: string,
  requirements: string | null,
): string {
  const lines = [`# ${projectName} — Generated Documentation`, ""];
  for (const section of DOC_SECTIONS) {
    const step = sectionStep(steps, section);
    let content = sectionMarkdown(step, section);
    if (section.key === "requirements" && requirements && step === undefined) {
      content = requirements;
    }
    lines.push(`---`, "", `## ${section.label}`, "", content.trim(), "");
  }
  return lines.join("\n");
}
