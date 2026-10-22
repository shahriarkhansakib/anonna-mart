import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export const metadata: Metadata = {
  title: {
    default: "Customer Account | Anonna Mart",
    template: "%s | Anonna Mart",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {/* Top Header with Logo on Top-Left and "Go back to landing page" on Right */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md px-4 sm:px-6 h-14 sm:h-16 flex items-center">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <Logo width={110} height={36} />

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs font-semibold text-foreground shadow-xs backdrop-blur-sm transition-all hover:bg-muted hover:border-emerald-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Go back to landing page</span>
              <span className="sm:hidden">Storefront</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Centered Auth Content */}
      <main className="flex-1 flex items-center justify-center p-4 py-8 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
