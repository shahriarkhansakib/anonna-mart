"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, PackageOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatTaka } from "@/components/storefront/types";
import { type OrderItem, ordersApi } from "@/lib/api/orders";

function statusClasses(status: string) {
  const norm = status?.toLowerCase() || "";
  if (norm === "delivered")
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  if (norm === "cancelled" || norm === "rejected")
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
  if (norm === "shipped" || norm === "in_transit" || norm === "processing")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
  return "bg-muted text-muted-foreground border border-border";
}

function OrderCard({ order }: { order: OrderItem }) {
  const displayId = order.orderNumber || order.order_number || order.id;
  const itemsCount = order.items?.length || 1;
  const total = Number(order.totalAmount || order.total_amount || order.subtotal || 0);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-bold text-foreground">#{displayId}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Placed{" "}
            {new Date(order.createdAt || order.created_at || Date.now()).toLocaleDateString(
              "en-BD",
              { dateStyle: "medium" },
            )}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClasses(order.status)}`}
        >
          {order.status || "Pending"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {itemsCount} {itemsCount === 1 ? "item" : "items"} ·{" "}
            <span className="font-bold text-foreground">{formatTaka(total)}</span>
          </p>
          <span className="text-xs text-muted-foreground">({order.paymentMethod || "COD"})</span>
        </div>

        <Link
          href={`/account/orders/${encodeURIComponent(order.id)}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/40 bg-card px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
        >
          Track Order <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function OrderHistory({ compact = false }: { compact?: boolean }) {
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => ordersApi.list(),
  });

  const orders: OrderItem[] = ordersResponse?.orders || ordersResponse?.data || [];

  if (isLoading) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
        <PackageOpen className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h3 className="mt-3 font-bold text-foreground">No recent orders yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          When you place an order, you will be able to track live delivery and status updates here.
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
        >
          Start Shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const visibleOrders = compact ? orders.slice(0, 3) : orders;

  return (
    <div className="mt-4 space-y-3">
      {visibleOrders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
      {compact && orders.length > visibleOrders.length && (
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
        >
          View all {orders.length} orders <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
