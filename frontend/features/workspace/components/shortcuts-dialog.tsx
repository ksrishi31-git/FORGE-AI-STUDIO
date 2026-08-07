"use client";

import { Keyboard } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { SHORTCUT_DEFS } from "../lib/shortcuts";

export interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Keyboard shortcut reference for the workspace (Phase 3.6). */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} titleId="shortcuts-title">
      <div className="mb-4">
        <h2 id="shortcuts-title" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Keyboard className="size-5 text-muted-foreground" aria-hidden="true" />
          Keyboard shortcuts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Modifier combos work everywhere, including while typing in the editor.
        </p>
      </div>
      <ul className="space-y-2">
        {SHORTCUT_DEFS.map((shortcut) => (
          <li key={shortcut.id} className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{shortcut.label}</span>
            <kbd className="shrink-0 rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
              {shortcut.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
