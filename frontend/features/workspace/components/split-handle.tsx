"use client";

import type { KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { useSplitDrag } from "../hooks/use-split-drag";

export interface SplitHandleProps {
  axis: "x" | "y";
  label: string;
  onDrag: (deltaPx: number) => void;
  className?: string;
}

/** Divider between resizable workspace panels (keyboard + pointer accessible). */
export function SplitHandle({ axis, label, onDrag, className }: SplitHandleProps) {
  const drag = useSplitDrag(axis, onDrag);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 8;
    let delta = 0;
    if (axis === "x") {
      if (event.key === "ArrowLeft") {
        delta = -step;
      } else if (event.key === "ArrowRight") {
        delta = step;
      }
    } else if (event.key === "ArrowUp") {
      delta = -step;
    } else if (event.key === "ArrowDown") {
      delta = step;
    }
    if (delta !== 0) {
      event.preventDefault();
      onDrag(delta);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...drag}
      className={cn(
        "group relative z-10 shrink-0 touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        axis === "x" ? "w-1 cursor-col-resize" : "h-1.5 cursor-row-resize",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute rounded-full transition-colors",
          axis === "x"
            ? "inset-y-0 left-1/2 w-1 -translate-x-1/2"
            : "inset-x-0 top-1/2 h-1 -translate-y-1/2",
          "bg-border/60 group-hover:bg-primary/40 group-active:bg-primary/50 group-focus-visible:bg-primary/50",
        )}
      />
    </div>
  );
}
