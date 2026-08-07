"use client";

import { FileCode2 } from "lucide-react";
import { useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import type { CodeFile } from "../../lib/artifacts";

// Register once at module scope (PrismLight starts with an empty grammar set).
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("docker", docker);
SyntaxHighlighter.registerLanguage("markdown", markdown);

export interface CodeViewProps {
  files: CodeFile[];
}

const SUPPORTED_LANGUAGES = new Set([
  "python",
  "typescript",
  "tsx",
  "javascript",
  "json",
  "bash",
  "yaml",
  "sql",
  "docker",
  "markdown",
]);

/** Code viewer — file navigator + syntax-highlighted listing (FAD §9). */
export function CodeView({ files }: CodeViewProps) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState(0);
  const file = files[Math.min(selected, files.length - 1)];
  const prismLanguage = file && SUPPORTED_LANGUAGES.has(file.language) ? file.language : "text";

  if (files.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        This artifact does not contain code listings.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {files.length > 1 ? (
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Code files">
          {files.map((item, index) => (
            <button
              key={`${item.file}-${index}`}
              type="button"
              role="tab"
              aria-selected={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                "inline-flex max-w-52 items-center gap-1.5 truncate rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                index === selected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <FileCode2 className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.file}</span>
            </button>
          ))}
        </div>
      ) : null}

      {file ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {file.file}
            </span>
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
              {file.language}
            </span>
          </div>
          <SyntaxHighlighter
            language={prismLanguage}
            style={theme === "dark" ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              background: "transparent",
              fontSize: "12px",
              padding: "12px",
            }}
            codeTagProps={{ style: { fontFamily: "var(--font-mono, monospace)" } }}
            showLineNumbers
          >
            {file.content}
          </SyntaxHighlighter>
        </div>
      ) : null}
    </div>
  );
}
