"use client";

import { ChevronDown, ChevronUp, CornerDownLeft, TerminalSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AgentDefinition, AgentStep, RunStatusResponse } from "@/services/agents";
import {
  buildConsoleLines,
  buildRunEvents,
  formatTime,
  type ConsoleLine,
  type ConsoleTone,
  type WorkspaceEvent,
} from "../lib/events";
import type { BottomTab } from "../hooks/use-workspace-state";

export interface ConsolePanelProps {
  status: RunStatusResponse | undefined;
  steps: AgentStep[] | undefined;
  definitions: AgentDefinition[] | undefined;
  bottomTab: BottomTab;
  open: boolean;
  onBottomTabChange: (tab: BottomTab) => void;
  onToggleOpen: () => void;
}

const TONE_CLASS: Record<ConsoleTone, string> = {
  info: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  dim: "text-muted-foreground/60",
};

const LEVEL_CLASS: Record<WorkspaceEvent["level"], string> = {
  info: "border-border bg-muted/50 text-muted-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

const COMMANDS = ["help", "clear", "status", "runs", "mode", "artifacts"] as const;
type Command = (typeof COMMANDS)[number];

function commandResponse(
  command: Command,
  status: RunStatusResponse | undefined,
  steps: AgentStep[] | undefined,
  nameFor: (key: string) => string,
): ConsoleLine[] {
  const now = formatTime(new Date().toISOString());
  const base: ConsoleLine = { id: `cmd:${Date.now()}`, time: now, tone: "dim", text: `> ${command}` };
  switch (command) {
    case "help":
      return [
        base,
        { id: "help:1", time: now, tone: "dim", text: "Commands: help, clear, status, runs, mode, artifacts" },
      ];
    case "clear":
      return [base];
    case "status":
      return [
        base,
        status
          ? { id: "status:1", time: now, tone: "info", text: `Run ${status.id.slice(0, 8)} — ${status.status} (${status.progress}%)` }
          : { id: "status:1", time: now, tone: "dim", text: "No run selected." },
      ];
    case "runs": {
      const count = steps?.length ?? 0;
      const completed = steps?.filter((step) => step.status === "completed").length ?? 0;
      return [
        base,
        { id: "runs:1", time: now, tone: "info", text: `${completed} of ${count} agent steps completed.` },
      ];
    }
    case "mode":
      return [
        base,
        status
          ? { id: "mode:1", time: now, tone: "info", text: `Execution mode: ${status.mode}.` }
          : { id: "mode:1", time: now, tone: "dim", text: "No run selected." },
      ];
    case "artifacts": {
      const agents = [...new Set((steps ?? []).map((step) => step.agent))];
      return [
        base,
        agents.length > 0
          ? { id: "artifacts:1", time: now, tone: "info", text: `Artifacts: ${agents.map(nameFor).join(", ")}` }
          : { id: "artifacts:1", time: now, tone: "dim", text: "No artifacts yet." },
      ];
    }
  }
}

/** Bottom IDE panel — terminal Console and structured Event Log (Phase 3.6). */
export function ConsolePanel({
  status,
  steps,
  definitions,
  bottomTab,
  open,
  onBottomTabChange,
  onToggleOpen,
}: ConsolePanelProps) {
  const nameFor = useCallback(
    (key: string) => definitions?.find((definition) => definition.key === key)?.name ?? key,
    [definitions],
  );
  const runKey = status?.id ?? null;

  const [interactive, setInteractive] = useState<ConsoleLine[]>([]);
  const [feedHidden, setFeedHidden] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // A new run restores the live feed after a previous `clear`.
  useEffect(() => {
    setFeedHidden(false);
  }, [runKey]);

  const feed = useMemo(
    () => buildConsoleLines(status, steps, nameFor),
    [status, steps, nameFor],
  );

  const events = useMemo(
    () => buildRunEvents(status, steps, nameFor),
    [status, steps, nameFor],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [feed, interactive, feedHidden]);

  const runCommand = (raw: string) => {
    const now = formatTime(new Date().toISOString());
    const command = raw.trim().toLowerCase();
    if (!COMMANDS.includes(command as Command)) {
      setInteractive((current) => [
        ...current,
        { id: `cmd:${Date.now()}`, time: now, tone: "dim", text: `> ${command}` },
        {
          id: `err:${Date.now()}`,
          time: now,
          tone: "error",
          text: `Unknown command \u201C${command}\u201D. Type \u201Chelp\u201D for available commands.`,
        },
      ]);
      return;
    }
    const responses = commandResponse(command as Command, status, steps, nameFor);
    setInteractive((current) => [...current, ...responses]);
    if (command === "clear") {
      setFeedHidden(true);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <Tabs
        value={bottomTab}
        onValueChange={(value) => onBottomTabChange(value as BottomTab)}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="flex h-8 shrink-0 items-center border-b border-border bg-muted/40 px-1.5">
          <TabsList className="h-6 border-0 bg-transparent p-0">
            <TabsTrigger value="console" className="h-6 rounded px-2 text-[11px]">
              <TerminalSquare className="size-3" aria-hidden="true" />
              Console
            </TabsTrigger>
            <TabsTrigger value="events" className="h-6 rounded px-2 text-[11px]">
              Event Logs
            </TabsTrigger>
          </TabsList>
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={open}
            aria-label={open ? "Collapse console" : "Expand console"}
            className="ml-auto inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {open ? (
          <div className="min-h-0 flex-1">
          <TabsContent value="console" className="h-full">
            <div
              ref={scrollRef}
              className="workspace-scroll h-[calc(100%-2.25rem)] overflow-y-auto bg-card px-3 py-2 font-mono text-[11px] leading-relaxed"
            >
              {[...interactive, ...(feedHidden ? [] : feed)].map((line) => (
                <p key={line.id} className={cn("flex gap-2 whitespace-pre-wrap break-words", TONE_CLASS[line.tone])}>
                  <span className="shrink-0 tabular-nums text-muted-foreground/50">{line.time}</span>
                  <span>{line.text}</span>
                </p>
              ))}
            </div>
            <div className="flex h-9 items-center gap-2 border-t border-border bg-muted/30 px-3">
              <span className="shrink-0 font-mono text-xs text-success">&gt;</span>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && input.trim()) {
                    runCommand(input);
                    setInput("");
                  }
                }}
                placeholder="help · clear · status · runs · mode · artifacts"
                aria-label="Console command"
                className="h-6 min-w-0 flex-1 bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
            </div>
          </TabsContent>

          <TabsContent value="events" className="h-full">
            <div className="workspace-scroll h-full overflow-y-auto">
              {events.length === 0 ? (
                <p className="p-4 text-center text-[11px] text-muted-foreground">
                  Run the pipeline to see execution events.
                </p>
              ) : (
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-muted-foreground">
                      <th className="px-3 py-1.5 font-medium">Time</th>
                      <th className="px-3 py-1.5 font-medium">Level</th>
                      <th className="px-3 py-1.5 font-medium">Agent</th>
                      <th className="px-3 py-1.5 font-medium">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-t border-border/60">
                        <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-muted-foreground">
                          {formatTime(event.ts)}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              "rounded-full border px-1.5 py-px text-[10px] font-medium uppercase",
                              LEVEL_CLASS[event.level],
                            )}
                          >
                            {event.level}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-medium">
                          {event.agent ? nameFor(event.agent) : "pipeline"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{event.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
          </div>
        ) : null}
      </Tabs>
    </section>
  );
}
