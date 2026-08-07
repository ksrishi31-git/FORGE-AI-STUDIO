"use client";

import { useCallback, useRef } from "react";

/**
 * Pointer-drag primitive for the workspace's resizable panels (Phase 3.6).
 * The returned handlers attach to a splitter element; `onDrag` receives the
 * cumulative pointer delta in pixels along `axis`.
 */
export function useSplitDrag(axis: "x" | "y", onDrag: (deltaPx: number) => void) {
  const stateRef = useRef({ dragging: false, last: 0 });

  const coordinate = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) =>
      axis === "x" ? event.clientX : event.clientY,
    [axis],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      stateRef.current.dragging = true;
      stateRef.current.last = coordinate(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [coordinate],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!stateRef.current.dragging) {
        return;
      }
      const current = coordinate(event);
      onDrag(current - stateRef.current.last);
      stateRef.current.last = current;
    },
    [coordinate, onDrag],
  );

  const stop = useCallback(() => {
    stateRef.current.dragging = false;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp: stop, onPointerCancel: stop };
}
