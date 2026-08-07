"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/providers/theme-provider";

/** Light/dark theme toggle (FAD §8.5) for the top bar. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex"
      >
        {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </motion.span>
    </button>
  );
}
