"use client";

import { OrderHistory } from "./OrderHistory";

export function AccountOrders() {
  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
      aria-labelledby="orders-heading"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Orders</p>
        <h1 id="orders-heading" className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          My Order History
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Track fulfillment status, invoice numbers, and Steadfast courier tracking updates.
        </p>
      </div>

      <OrderHistory />
    </section>
  );
}
