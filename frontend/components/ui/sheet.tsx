"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
  titleId?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Slide-in panel with backdrop (FAD §3 — Drawer). Desktop layouts hide it. */
export function Sheet({
  open,
  onOpenChange,
  children,
  side = "left",
  className,
  titleId,
}: SheetProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-foreground/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: side === "left" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "left" ? "-100%" : "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className={cn(
              "absolute inset-y-0 flex w-72 flex-col border-r border-border bg-background shadow-xl",
              side === "left" ? "left-0" : "right-0",
              className,
            )}
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close navigation"
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="size-4" />
            </button>
            {children}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
