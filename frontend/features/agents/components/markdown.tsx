"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-3 mt-2 border-b border-border pb-2 text-xl font-semibold tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-5 text-base font-semibold tracking-tight">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1.5 mt-4 text-sm font-semibold tracking-tight">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-2 text-sm leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 text-sm">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 text-sm">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-3 overflow-x-auto rounded-md border border-border bg-muted/60 p-3 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-b border-border/60 px-3 py-1.5 align-top">{children}</td>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 border-l-2 border-border pl-3 text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
};

/** Enterprise-styled Markdown renderer for agent artifacts (FAD §9). */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="min-w-0 text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
