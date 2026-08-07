/** Safe localStorage helpers for workspace session persistence (Phase 3.6). */

export function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or unavailable (private mode); the session still works.
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

/** Per-project workspace draft key; standalone runs share one key. */
export function workspaceStorageKey(projectId: string | null | undefined): string {
  return `forgeai.workspace.v1.${projectId ?? "standalone"}`;
}
