"use client";

import { Download, Focus, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { downloadBlob } from "@/lib/download";
import { renderMermaid } from "@/lib/mermaid";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export interface DiagramCanvasProps {
  source: string | null;
  label: string;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

/**
 * Pan/zoom canvas for Mermaid diagrams (Phase 3.7).
 *
 * The shared `renderMermaid` helper produces the SVG; this component wraps it
 * in a transformable viewport with wheel zoom, drag panning, fit-to-screen,
 * and SVG/PNG export.
 */
export function DiagramCanvas({ source, label }: DiagramCanvasProps) {
  const { theme } = useTheme();
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);

  // Render the diagram whenever the source or theme changes.
  useEffect(() => {
    if (!source) {
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    void (async () => {
      try {
        const svg = await renderMermaid(source, theme === "dark" ? "dark" : "light");
        if (cancelled) {
          return;
        }
        const container = innerRef.current;
        if (container) {
          container.innerHTML = svg;
          svgRef.current = container.querySelector("svg");
        }
        setState("ready");
        // A fresh diagram starts centered and fitted.
        fitToScreen();
      } catch (reason) {
        if (cancelled) {
          return;
        }
        setState("error");
        setError(reason instanceof Error ? reason.message : "Unable to render the diagram");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, theme]);

  const fitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    const inner = innerRef.current;
    const svg = svgRef.current;
    if (!viewport || !inner || !svg) {
      return;
    }
    const vb = svg.viewBox.baseVal;
    const width = vb.width > 0 ? vb.width : svg.getBoundingClientRect().width;
    const height = vb.height > 0 ? vb.height : svg.getBoundingClientRect().height;
    if (width === 0 || height === 0) {
      return;
    }
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scale = clampScale(Math.min((vw - 48) / width, (vh - 48) / height));
    const x = (vw - width * scale) / 2;
    const y = (vh - height * scale) / 2;
    setTransform({ x, y, scale });
  }, []);

  const reset = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    fitToScreen();
  }, [fitToScreen]);

  const zoomBy = useCallback((factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    setTransform((current) => {
      const scale = clampScale(current.scale * factor);
      const ratio = scale / current.scale;
      return {
        scale,
        // Zoom around the viewport center for a predictable UX.
        x: (current.x - viewport.clientWidth / 2) * ratio + viewport.clientWidth / 2,
        y: (current.y - viewport.clientHeight / 2) * ratio + viewport.clientHeight / 2,
      };
    });
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (state !== "ready") {
        return;
      }
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomBy(factor);
    },
    [state, zoomBy],
  );

  // React's delegated `onWheel` can be passive, which silently drops
  // preventDefault() and lets the page scroll under the diagram. Attach a
  // native non-passive listener so wheel zoom always works.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (state !== "ready" || event.button !== 0) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { startX: event.clientX, startY: event.clientY, tx: transform.x, ty: transform.y };
      setDragging(true);
    },
    [state, transform],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      setTransform({
        x: drag.tx + (event.clientX - drag.startX),
        y: drag.ty + (event.clientY - drag.startY),
        scale: transform.scale,
      });
    },
    [transform.scale],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  const downloadSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    downloadBlob(
      `${label.toLowerCase().replace(/\s+/g, "-")}.svg`,
      new Blob([xml], { type: "image/svg+xml;charset=utf-8" }),
    );
  }, [label]);

  const downloadPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const width = svg.viewBox.baseVal.width || image.width;
      const height = svg.viewBox.baseVal.height || image.height;
      const canvas = document.createElement("canvas");
      const scale = 2; // crisp export
      canvas.width = Math.max(1, width * scale);
      canvas.height = Math.max(1, height * scale);
      const context = canvas.getContext("2d");
      if (context) {
        // Dark theme diagrams look correct on a white canvas background.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((png) => {
          if (png) {
            downloadBlob(`${label.toLowerCase().replace(/\s+/g, "-")}.png`, png);
          }
          URL.revokeObjectURL(url);
        }, "image/png");
      } else {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }, [label]);

  const controls = (
    <div className="flex items-center gap-1 rounded-md border border-border bg-background/95 p-1 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        onClick={() => zoomBy(1.25)}
        className="size-7"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zoom out"
        onClick={() => zoomBy(1 / 1.25)}
        className="size-7"
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Fit to screen"
        onClick={fitToScreen}
        className="size-7"
      >
        <Focus className="size-3.5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Reset view"
        onClick={reset}
        className="size-7"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
      </Button>
      <div className="h-4 w-px bg-border" aria-hidden="true" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Download SVG"
        onClick={downloadSvg}
        className="size-7"
        disabled={state !== "ready"}
      >
        <Download className="size-3.5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Download PNG"
        onClick={downloadPng}
        className="size-7"
        disabled={state !== "ready"}
      >
        <Maximize2 className="size-3.5" aria-hidden="true" />
      </Button>
      <span
        className="w-12 text-center font-mono text-[10px] tabular-nums text-muted-foreground"
        aria-hidden="true"
      >
        {Math.round(transform.scale * 100)}%
      </span>
    </div>
  );

  return (
    <div
      ref={viewportRef}
      className="relative h-[560px] overflow-hidden rounded-md border border-border bg-card"
    >
      <div className="absolute right-3 top-3 z-10">{controls}</div>

      {state === "loading" ? (
        <div className="flex h-full items-center justify-center p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {state === "error" ? (
        <div className="flex h-full items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-md text-xs">
            {error}
          </Alert>
        </div>
      ) : null}

      {state === "idle" ? (
        <div className="flex h-full items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            Select a project to render its architecture diagram.
          </p>
        </div>
      ) : null}

      {state === "ready" ? (
        <div
          className={cn(
            "h-full w-full touch-none overflow-hidden",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label={`${label} diagram — drag to pan, scroll to zoom`}
        >
          <div
            className="min-h-full min-w-full"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <div ref={innerRef} className="inline-block [&_svg]:max-w-none" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
