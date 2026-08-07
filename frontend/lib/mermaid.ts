/**
 * Shared Mermaid rendering (Phase 3.7).
 *
 * `mermaid` is heavy (~1 MB), so it is imported lazily here and shared by the
 * Agent Workspace viewer and the Architecture Viewer. Every call re-initializes
 * the engine with the current theme and returns the rendered SVG string so
 * callers can inject it into the DOM (workspace) or a pan/zoom canvas
 * (architecture viewer).
 */
export async function renderMermaid(source: string, theme: "light" | "dark"): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === "dark" ? "dark" : "default",
    securityLevel: "strict",
    fontFamily: "inherit",
    themeVariables: { fontSize: "13px" },
  });
  const id = `forgeai-mermaid-${Math.random().toString(36).slice(2)}`;
  const { svg } = await mermaid.render(id, source);
  return svg;
}
