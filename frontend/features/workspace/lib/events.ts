/**
 * Execution events and console feed for the Agent Workspace (Phase 3.6).
 *
 * The backend persists step rows and run lifecycle timestamps; this module
 * derives a chronological event stream and terminal-style console lines from
 * them so the workspace can replay execution without a streaming channel.
 */
import type { AgentStep, RunStatusResponse } from "@/services/agents";

export type EventLevel = "info" | "success" | "warning" | "error";

export interface WorkspaceEvent {
  id: string;
  ts: string;
  level: EventLevel;
  agent: string | null;
  message: string;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString(undefined, { hour12: false });
}

/** Chronological lifecycle + per-step events for a run. */
export function buildRunEvents(
  status: RunStatusResponse | undefined,
  steps: AgentStep[] | undefined,
  nameFor: (agentKey: string) => string,
): WorkspaceEvent[] {
  const events: WorkspaceEvent[] = [];
  if (status) {
    events.push({
      id: "run:queued",
      ts: status.created_at,
      level: "info",
      agent: null,
      message: `Pipeline queued (${status.mode} mode)`,
    });
    if (status.started_at) {
      events.push({
        id: "run:started",
        ts: status.started_at,
        level: "info",
        agent: null,
        message: "Pipeline execution started",
      });
    }
    if (status.finished_at) {
      if (status.status === "completed") {
        events.push({
          id: "run:finished",
          ts: status.finished_at,
          level: "success",
          agent: null,
          message: "Pipeline completed",
        });
      } else if (status.status === "failed") {
        events.push({
          id: "run:failed",
          ts: status.finished_at,
          level: "error",
          agent: null,
          message: status.error ? `Pipeline failed: ${status.error}` : "Pipeline failed",
        });
      } else if (status.status === "cancelled") {
        events.push({
          id: "run:cancelled",
          ts: status.finished_at,
          level: "warning",
          agent: null,
          message: "Pipeline cancelled by user",
        });
      }
    }
  }
  for (const step of steps ?? []) {
    if (step.started_at) {
      events.push({
        id: `step:${step.id}:start`,
        ts: step.started_at,
        level: "info",
        agent: step.agent,
        message: `${nameFor(step.agent)} started`,
      });
    }
    if (step.finished_at && step.status === "completed") {
      const duration =
        step.duration_ms !== null && step.duration_ms !== undefined
          ? ` in ${(step.duration_ms / 1000).toFixed(1)}s`
          : "";
      events.push({
        id: `step:${step.id}:done`,
        ts: step.finished_at,
        level: "success",
        agent: step.agent,
        message: `${nameFor(step.agent)} completed${duration}`,
      });
    }
    if (step.finished_at && step.status === "failed") {
      events.push({
        id: `step:${step.id}:failed`,
        ts: step.finished_at,
        level: "error",
        agent: step.agent,
        message: `${nameFor(step.agent)} failed`,
      });
    }
  }
  return events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

export type ConsoleTone = "info" | "success" | "warning" | "error" | "dim";

export interface ConsoleLine {
  id: string;
  time: string;
  tone: ConsoleTone;
  text: string;
}

function toneForLevel(level: EventLevel): ConsoleTone {
  if (level === "error") {
    return "error";
  }
  if (level === "warning") {
    return "warning";
  }
  if (level === "success") {
    return "success";
  }
  return "info";
}

/** Terminal-style feed rendered from the same event stream. */
export function buildConsoleLines(
  status: RunStatusResponse | undefined,
  steps: AgentStep[] | undefined,
  nameFor: (agentKey: string) => string,
  extra: ConsoleLine[] = [],
): ConsoleLine[] {
  const events = buildRunEvents(status, steps, nameFor);
  const lines = events.map<ConsoleLine>((event) => ({
    id: event.id,
    time: formatTime(event.ts),
    tone: toneForLevel(event.level),
    text: event.agent ? `[${nameFor(event.agent)}] ${event.message}` : event.message,
  }));
  return [...extra, ...lines];
}
