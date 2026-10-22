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
        <Loader2 className="h-8 w-8 animate-spin text-brand-800" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
        <Package className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-xl font-black text-slate-900">Order Not Found</h1>
        <p className="mt-1 text-xs text-slate-500">Could not find details for order #{orderId}.</p>
        <Link
          href="/account/orders"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-900 px-5 text-xs font-bold text-white hover:bg-brand-950"
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
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6 sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
              Order Details
            </p>
            <h1 className="mt-1 font-mono text-2xl font-black text-slate-900">#{displayId}</h1>
            <p className="mt-1 text-xs text-slate-500">
              Placed on{" "}
              {new Date(order.createdAt || Date.now()).toLocaleDateString("en-BD", {
                dateStyle: "full",
              })}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-900">
            {order.status || "Pending"}
          </span>
        </div>

        {/* Status Stepper */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ORDER_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPastOrCurrent = idx <= currentStep;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                      isPastOrCurrent
                        ? "bg-brand-900 text-white shadow-xs"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${isPastOrCurrent ? "text-slate-900" : "text-slate-400"}`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-slate-400">
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
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <MapPin className="h-4 w-4 text-brand-800" /> Delivery Address
            </h2>
            <p className="mt-3 text-sm font-bold text-slate-900">{order.customerName}</p>
            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{order.shippingAddress}</p>
            <p className="mt-2 text-xs text-slate-500 font-mono">Phone: {order.customerPhone}</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Truck className="h-4 w-4 text-brand-800" /> Courier & Fulfillment
            </h2>
            <p className="mt-3 text-sm font-bold text-slate-900">
              {order.courierName || "Steadfast Courier"}
            </p>
            {order.trackingCode || order.tracking_code ? (
              <div className="mt-2">
                <span className="text-[11px] text-slate-500">Tracking Code:</span>
                <span className="ml-2 font-mono text-xs font-bold text-brand-900">
                  {order.trackingCode || order.tracking_code}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Awaiting consignment creation by fulfillment center.
              </p>
            )}
            <p className="mt-2 text-xs text-slate-600">
              Payment Method:{" "}
              <span className="font-bold text-slate-900">{order.paymentMethod || "COD"}</span>
            </p>
          </div>
        </div>

        {/* Items Summary Table */}
        <div className="border-t border-slate-100 p-6 sm:p-8">
          <h2 className="text-sm font-black text-slate-900">Order Items</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {item.productName || item.name || "Product Item"}
                    </p>
                    <p className="text-[11px] text-slate-500">Quantity: {item.quantity}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-brand-950">
                  {formatTaka(Number(item.totalPrice || item.price || 0) * (item.quantity || 1))}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">
                {formatTaka(Number(order.subtotal || 0))}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee:</span>
              <span className="font-semibold text-slate-900">
                {formatTaka(Number(order.shippingFee || 60))}
              </span>
            </div>
            {Number(order.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount Applied:</span>
                <span>-{formatTaka(Number(order.discountAmount))}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-black text-slate-900">
              <span>Total:</span>
              <span className="text-brand-950">{formatTaka(Number(order.totalAmount || 0))}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
