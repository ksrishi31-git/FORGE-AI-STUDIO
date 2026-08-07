import { Badge } from "@/components/ui/badge";
import type { RunMode, RunStatus, StepStatus } from "@/services/agents";

const RUN_VARIANT: Record<RunStatus, "info" | "warning" | "success" | "destructive" | "muted"> = {
  queued: "info",
  running: "warning",
  completed: "success",
  failed: "destructive",
  cancelled: "muted",
};

const RUN_LABEL: Record<RunStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STEP_VARIANT: Record<StepStatus, "muted" | "warning" | "success" | "destructive"> = {
  pending: "muted",
  running: "warning",
  completed: "success",
  failed: "destructive",
  skipped: "muted",
  needs_revision: "warning",
};

const STEP_LABEL: Record<StepStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  skipped: "Skipped",
  needs_revision: "Needs revision",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <Badge variant={RUN_VARIANT[status]}>{RUN_LABEL[status]}</Badge>;
}

export function StepStatusBadge({ status }: { status: StepStatus }) {
  return <Badge variant={STEP_VARIANT[status]}>{STEP_LABEL[status]}</Badge>;
}

export function ModeBadge({ mode }: { mode: RunMode }) {
  return <Badge variant="outline">{mode === "llm" ? "LLM" : "Deterministic"}</Badge>;
}
