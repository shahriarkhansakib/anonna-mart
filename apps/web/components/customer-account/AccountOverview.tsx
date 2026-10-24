"use client";

import { ArrowRight, Heart, MapPin, Package, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { useWishlist } from "@/contexts/WishlistContext";
import { useSession } from "@/lib/auth-client";
import { OrderHistory } from "./OrderHistory";

const panelClass =
  "rounded-3xl border border-border bg-card p-5 sm:p-6 transition hover:border-primary/50 hover:shadow-md";

export function AccountOverview() {
  const sessionResult = useSession() as any;
  const user = sessionResult?.data?.user;
  const { wishlistIds } = useWishlist();

  const displayName = user?.name || "Customer";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Account Overview</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your orders, saved addresses, wishlist, and profile settings in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/account/orders" className={`${panelClass} group`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            My Orders
          </p>
          <p className="mt-1 font-bold text-card-foreground">Order History</p>
          <p className="mt-1 text-xs text-muted-foreground">Track shipments & courier delivery.</p>
        </Link>

        <Link href="/account/addresses" className={`${panelClass} group`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Addresses
          </p>
          <p className="mt-1 font-bold text-card-foreground">Saved Addresses</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage delivery addresses for fast checkout.
          </p>
        </Link>

        <Link href="/account/wishlist" className={`${panelClass} group`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Saved Items
          </p>
          <p className="mt-1 font-bold text-card-foreground">{wishlistIds.length} Wishlist Items</p>
          <p className="mt-1 text-xs text-muted-foreground">View items you bookmarked for later.</p>
        </Link>

        <Link href="/account/profile" className={`${panelClass} group`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Profile
          </p>
          <p className="mt-1 font-bold text-card-foreground truncate">
            {user?.name || "My Profile"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {user?.email || "Update your details."}
          </p>
        </Link>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs sm:p-7">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-black text-card-foreground">Recent Purchases</h2>
              <p className="text-xs text-muted-foreground">
                Your latest orders and live status updates.
              </p>
            </div>
          </div>
          <Link
            href="/account/orders"
            className="text-xs font-bold text-primary hover:text-primary/80"
          >
            All Orders
          </Link>
        </div>
        <OrderHistory compact />
      </section>
    </div>
  );
}
