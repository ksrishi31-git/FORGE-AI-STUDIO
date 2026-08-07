"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
  toggle: () => void;
  triggerId: string;
  contentId: string;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown(): DropdownContextValue {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown subcomponents must be rendered within <DropdownMenu>");
  }
  return context;
}

/** Lightweight accessible menu (FAD §3) — outside click, Escape, aria wiring. */
export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, close, toggle, triggerId, contentId }}>
      <div ref={rootRef} className="relative inline-block text-left">
        {typeof children === "function"
          ? (children as (value: { open: boolean; toggle: () => void }) => ReactNode)({
              open,
              toggle,
            })
          : children}
      </div>
    </DropdownContext.Provider>
  );
}

export interface DropdownMenuTriggerProps extends Omit<ComponentProps<"button">, "children"> {
  children: ReactNode | ((state: { open: boolean; toggle: () => void }) => ReactNode);
}

export function DropdownMenuTrigger({ children, className, ...props }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerId, contentId } = useDropdown();
  return (
    <button
      id={triggerId}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={() => setOpen(!open)}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    >
      {typeof children === "function"
        ? (children as (state: { open: boolean; toggle: () => void }) => ReactNode)({
            open,
            toggle: () => setOpen(!open),
          })
        : children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const { open, contentId } = useDropdown();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          id={contentId}
          role="menu"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className={cn(
            "absolute z-50 mt-1.5 min-w-52 origin-top overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export interface DropdownMenuItemProps extends ComponentProps<"button"> {
  onSelect?: () => void;
}

export function DropdownMenuItem({
  onSelect,
  onClick,
  className,
  ...props
}: DropdownMenuItemProps) {
  const { close } = useDropdown();
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    onSelect?.();
    close();
  };
  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-2.5 pb-1.5 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}
