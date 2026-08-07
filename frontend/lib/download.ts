/** Shared browser download helpers (Phase 3.7+). */

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadText(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  downloadBlob(filename, new Blob([content], { type: mime }));
}
