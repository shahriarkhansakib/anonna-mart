"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { formatTaka } from "@/components/storefront/types";
import { type OrderItem, ordersApi } from "@/lib/api/orders";

const ORDER_STEPS = [
  { key: "placed", label: "Order Placed", icon: Clock3 },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Package },
];

function getStepIndex(status: string) {
  const norm = status?.toLowerCase() || "";
  if (norm === "delivered") return 3;
  if (norm === "shipped" || norm === "in_transit") return 2;
  if (norm === "processing" || norm === "confirmed") return 1;
  return 0;
}

export function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id || "";

  const {
    data: orderResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: Boolean(orderId),
  });

  const order: OrderItem | null = orderResponse?.data || null;

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <section className="rounded-3xl border border-border bg-card p-10 text-center text-card-foreground">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-black text-foreground">Order Not Found</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Could not find details for order #{orderId}.
        </p>
        <Link
          href="/account/orders"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Orders
        </Link>
      </section>
    );
  }

  const currentStep = getStepIndex(order.status);
  const items = order.items || [];
  const displayId = order.orderNumber || order.order_number || order.id;

  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Link>

      <section className="rounded-3xl border border-border bg-card overflow-hidden shadow-xs text-card-foreground">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-6 sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Order Details</p>
            <h1 className="mt-1 font-mono text-2xl font-black text-foreground">#{displayId}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Placed on{" "}
              {new Date(order.createdAt || Date.now()).toLocaleDateString("en-BD", {
                dateStyle: "full",
              })}
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {order.status || "Pending"}
          </span>
        </div>

        {/* Status Stepper */}
        <div className="border-b border-border bg-muted/20 p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ORDER_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPastOrCurrent = idx <= currentStep;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                      isPastOrCurrent
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${isPastOrCurrent ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {idx <= currentStep ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Courier & Shipping Details */}
        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" /> Delivery Address
            </h2>
            <p className="mt-3 text-sm font-bold text-foreground">{order.customerName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {order.shippingAddress}
            </p>
            <p className="mt-2 text-xs text-muted-foreground font-mono">
              Phone: {order.customerPhone}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Truck className="h-4 w-4 text-primary" /> Courier & Fulfillment
            </h2>
            <p className="mt-3 text-sm font-bold text-foreground">
              {order.courierName || "Steadfast Courier"}
            </p>
            {order.trackingCode || order.tracking_code ? (
              <div className="mt-2">
                <span className="text-[11px] text-muted-foreground">Tracking Code:</span>
                <span className="ml-2 font-mono text-xs font-bold text-primary">
                  {order.trackingCode || order.tracking_code}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Awaiting consignment creation by fulfillment center.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Payment Method:{" "}
              <span className="font-bold text-foreground">{order.paymentMethod || "COD"}</span>
            </p>
          </div>
        </div>

        {/* Items Summary Table */}
        <div className="border-t border-border p-6 sm:p-8">
          <h2 className="text-sm font-black text-foreground">Order Items</h2>
          <div className="mt-4 divide-y divide-border">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {item.productName || item.name || "Product Item"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-foreground">
                  {formatTaka(Number(item.totalPrice || item.price || 0) * (item.quantity || 1))}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-semibold text-foreground">
                {formatTaka(Number(order.subtotal || 0))}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery Fee:</span>
              <span className="font-semibold text-foreground">
                {formatTaka(Number(order.shippingFee || 60))}
              </span>
            </div>
            {Number(order.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Discount Applied:</span>
                <span>-{formatTaka(Number(order.discountAmount))}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between text-base font-black text-foreground">
              <span>Total:</span>
              <span className="text-foreground">{formatTaka(Number(order.totalAmount || 0))}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
