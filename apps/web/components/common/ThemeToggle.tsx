"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`h-9 w-9 rounded-xl border border-border/60 bg-card/40 ${className || ""}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card/80 text-foreground backdrop-blur-sm transition-all hover:bg-muted hover:border-emerald-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 active:scale-95 shadow-xs ${className || ""}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-emerald-950 dark:text-emerald-100 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}
