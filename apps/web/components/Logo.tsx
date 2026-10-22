"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  to?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  variant?: "default" | "footer" | "admin";
}

const sizeClasses = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-14",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base sm:text-lg",
  lg: "text-lg sm:text-xl",
  xl: "text-xl sm:text-2xl",
};

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  (
    {
      to = "/",
      size = "md",
      showText = true,
      showSubtitle = false,
      className,
      variant = "default",
    },
    ref,
  ) => {
    const content = (
      <div ref={ref} className={cn("flex items-center gap-2 sm:gap-3 group", className)}>
        <div className="relative flex-shrink-0 flex items-center">
          <img
            src="/anonna-mart-logo.png"
            alt="Anonna Mart"
            className={cn(
              "w-auto object-contain transition-transform duration-300 group-hover:scale-105",
              sizeClasses[size],
            )}
          />
        </div>
        {showText && (
          <div className={cn(variant === "footer" && "text-card")}>
            <div
              className={cn(
                "font-extrabold tracking-tight leading-tight",
                textSizeClasses[size],
                variant === "default" && "text-foreground",
                variant === "footer" && "text-card",
                variant === "admin" &&
                  "bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent",
              )}
            >
              Anonna Mart
              {variant === "admin" && (
                <span className="text-[10px] ml-1.5 font-bold uppercase tracking-wider text-emerald-600">
                  Admin
                </span>
              )}
            </div>
            {showSubtitle && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Store & Operations
              </p>
            )}
          </div>
        )}
      </div>
    );

    if (to) {
      return (
        <Link href={to} className="inline-flex focus:outline-none">
          {content}
        </Link>
      );
    }

    return content;
  },
);

Logo.displayName = "Logo";

export default Logo;
