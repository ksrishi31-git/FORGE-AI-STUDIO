"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MARK_CLASS = "workspace-search-mark";
const ACTIVE_CLASS = "workspace-search-mark-active";

function unwrapMark(mark: HTMLElement): void {
  const parent = mark.parentNode;
  if (!parent) {
    return;
  }
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  parent.removeChild(mark);
}

/**
 * Case-insensitive, in-document search. Highlights every occurrence of `query`
 * inside the container and exposes prev/next navigation. The effect re-runs
 * whenever `content` changes (fresh artifact) or the container is swapped
 * (e.g. entering fullscreen), so marks are never left on a detached node.
 */
export function useTextSearch(query: string, content: string, containerKey: string | number = "") {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const marksRef = useRef<HTMLElement[]>([]);
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const container = containerRef.current;
    for (const mark of marksRef.current) {
      unwrapMark(mark);
    }
    marksRef.current = [];
    setCount(0);
    setActive(-1);
    const trimmed = query.trim();
    if (!container || !trimmed) {
      return;
    }

    const needle = trimmed.toLowerCase();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node as Text);
      node = walker.nextNode();
    }

    const marks: HTMLElement[] = [];
    for (const textNode of textNodes) {
      let current: Text | null = textNode;
      while (current) {
        const text = current.nodeValue ?? "";
        const index = text.toLowerCase().indexOf(needle);
        if (index === -1) {
          break;
        }
        const mark = document.createElement("mark");
        mark.className = MARK_CLASS;
        const range = document.createRange();
        range.setStart(current, index);
        range.setEnd(current, index + trimmed.length);
        range.surroundContents(mark);
        marks.push(mark);
        // `surroundContents` leaves the remainder in the following sibling.
        current = current.nextSibling as Text | null;
      }
    }

    marksRef.current = marks;
    setCount(marks.length);
    setActive(marks.length > 0 ? 0 : -1);
    return () => {
      for (const mark of marksRef.current) {
        unwrapMark(mark);
      }
      marksRef.current = [];
    };
  }, [query, content, containerKey]);

  const scrollTo = useCallback((index: number) => {
    const marks = marksRef.current;
    if (marks.length === 0) {
      return;
    }
    const safe = (index + marks.length) % marks.length;
    marks.forEach((mark, markIndex) => {
      mark.classList.toggle(ACTIVE_CLASS, markIndex === safe);
    });
    marks[safe]?.scrollIntoView({ block: "center", behavior: "smooth" });
    setActive(safe);
  }, []);

  const next = useCallback(() => {
    const length = marksRef.current.length;
    if (length > 0) {
      scrollTo(active + 1);
    }
  }, [active, scrollTo]);

  const prev = useCallback(() => {
    const length = marksRef.current.length;
    if (length > 0) {
      scrollTo(active - 1);
    }
  }, [active, scrollTo]);

  return { containerRef, count, active, next, prev };
}
