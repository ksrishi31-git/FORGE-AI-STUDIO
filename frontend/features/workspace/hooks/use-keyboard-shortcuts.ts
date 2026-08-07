"use client";

import { useEffect, useRef } from "react";

export interface ShortcutBinding {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutAction {
  id: string;
  binding: ShortcutBinding;
  action: () => void;
  /** Skip while the user is typing and no modifier key is held. */
  preventWhileTyping?: boolean;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
}

function matches(event: KeyboardEvent, binding: ShortcutBinding): boolean {
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) {
    return false;
  }
  const checks: Array<[boolean | undefined, boolean]> = [
    [binding.ctrl, event.ctrlKey],
    [binding.meta, event.metaKey],
    [binding.shift, event.shiftKey],
    [binding.alt, event.altKey],
  ];
  return checks.every(([expected, actual]) => (expected ?? false) === actual);
}

/**
 * Register keyboard shortcuts scoped to the workspace (Phase 3.6).
 * Modifier combos (e.g. Ctrl/⌘+Enter to run) fire even while typing; plain-key
 * combos (e.g. `?` for help) are suppressed inside inputs unless enabled.
 */
export function useKeyboardShortcuts(actions: ShortcutAction[], enabled = true) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of actionsRef.current) {
        if (!matches(event, shortcut.binding)) {
          continue;
        }
        const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
        if (
          !hasModifier &&
          shortcut.preventWhileTyping &&
          isTypingTarget(event.target)
        ) {
          continue;
        }
        event.preventDefault();
        shortcut.action();
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
