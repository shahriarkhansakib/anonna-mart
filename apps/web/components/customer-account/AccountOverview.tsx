'use client';

import Link from 'next/link';
import { ArrowRight, Heart, MapPin, Package, ShoppingBag, UserRound } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useWishlist } from '@/contexts/WishlistContext';
import { OrderHistory } from './OrderHistory';

const panelClass =
  'rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 transition hover:border-brand-300 hover:shadow-md';

export function AccountOverview() {
  const sessionResult = useSession() as any;
  const user = sessionResult?.data?.user;
  const { wishlistIds } = useWishlist();

  const displayName = user?.name || 'Customer';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Account Overview</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your orders, saved addresses, wishlist, and profile settings in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/account/orders" className={`${panelClass} group`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <Package className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">My Orders</p>
          <p className="mt-1 font-bold text-slate-900">Order History</p>
          <p className="mt-1 text-xs text-slate-500">Track shipments & courier delivery.</p>
        </Link>

        <Link href="/account/addresses" className={`${panelClass} group`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <MapPin className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Addresses</p>
          <p className="mt-1 font-bold text-slate-900">Saved Addresses</p>
          <p className="mt-1 text-xs text-slate-500">Manage delivery addresses for fast checkout.</p>
        </Link>

        <Link href="/account/wishlist" className={`${panelClass} group`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <Heart className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Saved Items</p>
          <p className="mt-1 font-bold text-slate-900">{wishlistIds.length} Wishlist Items</p>
          <p className="mt-1 text-xs text-slate-500">View items you bookmarked for later.</p>
        </Link>

        <Link href="/account/profile" className={`${panelClass} group`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <UserRound className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Profile</p>
          <p className="mt-1 font-bold text-slate-900 truncate">{user?.name || 'My Profile'}</p>
          <p className="mt-1 text-xs text-slate-500 truncate">{user?.email || 'Update your details.'}</p>
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-brand-800" />
            <div>
              <h2 className="text-base font-black text-slate-900">Recent Purchases</h2>
              <p className="text-xs text-slate-500">Your latest orders and live status updates.</p>
            </div>
          </div>
          <Link
            href="/account/orders"
            className="text-xs font-bold text-brand-900 hover:text-brand-700"
          >
            All Orders
          </Link>
        </div>
        <OrderHistory compact />
      </section>
    </div>
  );
}
