"use client";

import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { signOut, useSession } from "@/lib/auth-client";

export function CustomerProfileMenu() {
  const router = useRouter();
  const sessionResult = useSession() as any;
  const user = sessionResult?.data?.user;
  const isPending = sessionResult?.isPending;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user && (user as any).role === "admin";
  const profileName: string = typeof user?.name === "string" ? user.name : "";
  const initials = profileName
    ? profileName
        .split(/\s+/)
        .filter((part) => part.length > 0)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toLocaleUpperCase()
    : "U";

  useEffect(() => {
    if (!open) return;

    const closeMenu = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setOpen(false);
      }
      if (
        event instanceof MouseEvent &&
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await (signOut as any)();
      toast.success("Signed out successfully");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Failed to sign out. Please try again.");
    }
  };

  if (isPending) {
    return <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-100" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-bold text-brand-900 transition-colors hover:bg-brand-50 sm:text-sm"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-900 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-950 sm:text-sm"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 text-slate-700 shadow-xs hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[120px] truncate text-left text-xs font-semibold sm:block">
          {user.name || user.email}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl animate-in fade-in-80 zoom-in-95 duration-150"
        >
          {/* User info banner */}
          <div className="border-b border-slate-100 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>

          <div className="py-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-brand-900 bg-brand-50/60 hover:bg-brand-50 transition-colors"
                role="menuitem"
              >
                <LayoutDashboard className="h-4 w-4 text-brand-800" />
                Store Admin Panel
              </Link>
            )}

            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              role="menuitem"
            >
              <User className="h-4 w-4 text-slate-400" />
              Account Overview
            </Link>

            <Link
              href="/account/orders"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              role="menuitem"
            >
              <Package className="h-4 w-4 text-slate-400" />
              My Orders
            </Link>

            <Link
              href="/account/addresses"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              role="menuitem"
            >
              <MapPin className="h-4 w-4 text-slate-400" />
              Delivery Addresses
            </Link>

            <Link
              href="/account/wishlist"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              role="menuitem"
            >
              <Heart className="h-4 w-4 text-slate-400" />
              My Wishlist
            </Link>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
