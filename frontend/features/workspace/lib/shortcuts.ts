/** Canonical shortcut registry for the Agent Workspace (Phase 3.6). */

export interface ShortcutDef {
  id: string;
  label: string;
  keys: string;
}

export const SHORTCUT_DEFS: ShortcutDef[] = [
  { id: "run", label: "Run agents", keys: "Ctrl/⌘ + Enter" },
  { id: "save", label: "Save draft", keys: "Ctrl/⌘ + S" },
  { id: "pause", label: "Pause / resume live updates", keys: "Ctrl/⌘ + P" },
  { id: "cancel", label: "Cancel the active run", keys: "Ctrl/⌘ + Shift + X" },
  { id: "clear", label: "Clear workspace output", keys: "Ctrl/⌘ + Shift + K" },
  { id: "tab", label: "Switch artifact tab", keys: "Ctrl/⌘ + 1 … 9" },
  { id: "view", label: "Cycle viewer mode", keys: "Ctrl/⌘ + V" },
  { id: "fullscreen", label: "Toggle fullscreen viewer", keys: "Ctrl/⌘ + Shift + F" },
  { id: "help", label: "Show keyboard shortcuts", keys: "? or Ctrl/⌘ + /" },
];
