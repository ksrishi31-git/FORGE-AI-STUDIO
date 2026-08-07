"use client";

import type { AgentStep, StepStatus } from "@/services/agents";

interface NodeSpec {
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
}

/**
 * Vertical pipeline layout (viewBox 720 × 650) in execution order: each agent
 * consumes the previous agent's artifact, ending at the Reviewer quality gate.
 */
const NODES: NodeSpec[] = [
  { key: "product_manager", label: "Product Manager", x: 360, y: 32, width: 230 },
  { key: "solution_architect", label: "Solution Architect", x: 360, y: 88, width: 230 },
  { key: "database_architect", label: "Database Architect", x: 360, y: 144, width: 230 },
  { key: "backend_engineer", label: "Backend Engineer", x: 360, y: 200, width: 230 },
  { key: "frontend_engineer", label: "Frontend Engineer", x: 360, y: 256, width: 230 },
  { key: "qa_engineer", label: "QA Engineer", x: 360, y: 312, width: 230 },
  { key: "security_auditor", label: "Security Auditor", x: 360, y: 368, width: 230 },
  { key: "devops_engineer", label: "DevOps Engineer", x: 360, y: 424, width: 230 },
  { key: "technical_writer", label: "Technical Writer", x: 360, y: 480, width: 230 },
  { key: "reviewer", label: "Reviewer", x: 360, y: 536, width: 230 },
];

const HEIGHT = 44;
const RADIUS = 8;

const STATUS_STYLE: Record<StepStatus, { fill: string; stroke: string; text: string }> = {
  pending: { fill: "fill-card", stroke: "stroke-border", text: "fill-muted-foreground" },
  running: { fill: "fill-warning/10", stroke: "stroke-warning", text: "fill-warning" },
  completed: { fill: "fill-success/10", stroke: "stroke-success", text: "fill-success" },
  failed: { fill: "fill-destructive/10", stroke: "stroke-destructive", text: "fill-destructive" },
  skipped: { fill: "fill-card", stroke: "stroke-border", text: "fill-muted-foreground" },
  needs_revision: { fill: "fill-warning/10", stroke: "stroke-warning", text: "fill-warning" },
};

function Arrow({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="none"
      className="stroke-muted-foreground/50"
      strokeWidth={1.5}
      markerEnd="url(#forgeai-arrow)"
    />
  );
}

export interface WorkflowGraphProps {
  steps: AgentStep[] | undefined;
  definitions: { key: string; name: string }[] | undefined;
  activeStep?: string;
  onSelectStep?: (agent: string) => void;
}

/**
 * SVG workflow diagram (FAD §9 — Diagram Viewer). Nodes reflect the selected
 * run's step statuses; the dashed edge is the reviewer's reflection loop.
 */
export function WorkflowGraph({
  steps,
  definitions,
  activeStep,
  onSelectStep,
}: WorkflowGraphProps) {
  // Latest step per agent wins: the feedback loop may re-run an agent, and the
  // reviewer marks its target with NEEDS_REVISION.
  const statusByAgent = new Map<string, StepStatus>();
  for (const step of steps ?? []) {
    if (step.status !== "skipped") {
      statusByAgent.set(step.agent, step.status);
    }
  }

  const labelFor = (key: string) =>
    definitions?.find((definition) => definition.key === key)?.name ?? key;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="0 0 720 650"
        role="img"
        aria-label="Multi-agent pipeline workflow"
        className="mx-auto h-auto w-full min-w-[560px] max-w-2xl"
      >
        <defs>
          <marker
            id="forgeai-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="fill-muted-foreground/50" />
          </marker>
          <marker
            id="forgeai-arrow-reflect"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="fill-destructive/70" />
          </marker>
        </defs>

        {/* Connectors: START and the linear artifact chain */}
        <Arrow d="M360 12 V15" />
        {[
          [76, 88],
          [132, 144],
          [188, 200],
          [244, 256],
          [300, 312],
          [356, 368],
          [412, 424],
          [468, 480],
          [524, 536],
        ].map(([from, to]) => (
          <path
            key={from}
            d={`M360 ${from} V${to}`}
            fill="none"
            className="stroke-muted-foreground/50"
            strokeWidth={1.5}
            markerEnd="url(#forgeai-arrow)"
          />
        ))}
        {/* Reviewer → quality gate loop (feedback routed to the responsible agent) */}
        <path
          d="M475 558 H660 V105 H475"
          fill="none"
          className="stroke-destructive/70"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          markerEnd="url(#forgeai-arrow-reflect)"
        />
        <text
          x="668"
          y="332"
          className="fill-destructive/80 text-[11px]"
          transform="rotate(90 668 332)"
          textAnchor="middle"
        >
          revise
        </text>

        {/* START / END markers */}
        <rect x="330" y="2" width="60" height="16" rx="8" className="fill-muted" />
        <text
          x="360"
          y="13"
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] font-medium"
        >
          START
        </text>
        <rect x="330" y="606" width="60" height="16" rx="8" className="fill-muted" />
        <text
          x="360"
          y="617"
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] font-medium"
        >
          END
        </text>

        {/* Agent nodes */}
        {NODES.map((node) => {
          const status = statusByAgent.get(node.key) ?? "pending";
          const style = STATUS_STYLE[status];
          const isActive = activeStep === node.key;
          return (
            <g
              key={node.key}
              onClick={() => onSelectStep?.(node.key)}
              className={onSelectStep ? "cursor-pointer" : undefined}
            >
              <rect
                x={node.x - node.width / 2}
                y={node.y}
                width={node.width}
                height={HEIGHT}
                rx={RADIUS}
                className={`${style.fill} ${style.stroke} transition-[stroke,fill]`}
                strokeWidth={isActive ? 2.5 : 1.25}
              />
              {status === "running" ? (
                <rect
                  x={node.x - node.width / 2}
                  y={node.y}
                  width={node.width}
                  height={HEIGHT}
                  rx={RADIUS}
                  className="stroke-warning/40"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              ) : null}
              <text
                x={node.x}
                y={node.y + HEIGHT / 2 + 4}
                textAnchor="middle"
                className={`${style.text} text-[12.5px] font-medium`}
              >
                {labelFor(node.key)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
