"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, PackageOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatTaka } from "@/components/storefront/types";
import { type OrderItem, ordersApi } from "@/lib/api/orders";

function statusClasses(status: string) {
  const norm = status?.toLowerCase() || "";
  if (norm === "delivered") return "bg-emerald-50 text-emerald-800";
  if (norm === "cancelled" || norm === "rejected") return "bg-rose-50 text-rose-700";
  if (norm === "shipped" || norm === "in_transit" || norm === "processing")
    return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function OrderCard({ order }: { order: OrderItem }) {
  const displayId = order.orderNumber || order.order_number || order.id;
  const itemsCount = order.items?.length || 1;
  const total = Number(order.totalAmount || order.total_amount || order.subtotal || 0);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-bold text-slate-900">#{displayId}</p>
          <p className="mt-1 text-xs text-slate-500">
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-slate-600">
            {itemsCount} {itemsCount === 1 ? "item" : "items"} ·{" "}
            <span className="font-bold text-brand-950">{formatTaka(total)}</span>
          </p>
          <span className="text-xs text-slate-400">({order.paymentMethod || "COD"})</span>
        </div>

        <Link
          href={`/account/orders/${encodeURIComponent(order.id)}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-brand-900 px-4 text-xs font-bold text-brand-900 transition-colors hover:bg-brand-50"
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
        <Loader2 className="h-6 w-6 animate-spin text-brand-800" />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
        <PackageOpen className="mx-auto h-10 w-10 text-brand-800" aria-hidden="true" />
        <h3 className="mt-3 font-bold text-slate-900">No recent orders yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
          When you place an order, you will be able to track live delivery and status updates here.
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-900 px-5 text-xs font-bold text-white hover:bg-brand-950"
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
          className="inline-flex items-center gap-2 text-xs font-bold text-brand-900 hover:text-brand-700"
        >
          View all {orders.length} orders <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
