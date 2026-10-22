"use client";

import {
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  Shield,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { CustomerProfileMenu } from "@/components/common/CustomerProfileMenu";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { formatTaka } from "@/components/storefront/types";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { signOut, useSession } from "@/lib/auth-client";

const accountLinks = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/addresses", label: "Saved Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/profile", label: "My Profile", icon: UserRound },
];

export function CustomerAccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sessionResult = useSession() as any;
  const user = sessionResult?.data?.user;
  const { count: cartCount } = useCart();
  const { wishlistIds } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = (user as any)?.role === "admin";

  const handleSignOut = async () => {
    try {
      await (signOut as any)();
      toast.success("Signed out");
      router.push("/");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <Logo width={110} height={36} />

          <form
            role="search"
            onSubmit={handleSearch}
            className="hidden min-w-0 max-w-xl flex-1 items-center rounded-xl border border-border bg-muted/50 px-3.5 transition focus-within:border-emerald-600 focus-within:bg-card focus-within:ring-2 focus-within:ring-emerald-600/15 sm:flex"
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or catalog..."
              className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="hidden text-xs font-bold text-muted-foreground hover:text-foreground sm:block"
            >
              Storefront
            </Link>
            <Link
              href="/account/wishlist"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistIds.length > 0 && (
                <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold text-white">
                  {wishlistIds.length}
                </span>
              )}
            </Link>
            <Link
              href="/checkout"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-emerald-700 dark:bg-emerald-500 px-1 text-center text-[10px] font-bold text-white dark:text-emerald-950">
                  {cartCount}
                </span>
              )}
            </Link>
            <CustomerProfileMenu />
          </div>
        </div>
      </header>

      {/* Account Workspace Layout */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-xs text-card-foreground">
              <div className="border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-800 dark:bg-emerald-600 text-sm font-bold text-white shadow-xs">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {user?.name || "Customer"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="mt-3">
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                    >
                      <Shield className="h-4 w-4 text-amber-700" />
                      Admin Control Panel
                    </Link>
                  </div>
                )}
              </div>

              <nav className="mt-4 space-y-1" aria-label="Account navigation">
                {accountLinks.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                        active
                          ? "bg-brand-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-brand-900"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                      <span>{label}</span>
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors sm:text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
