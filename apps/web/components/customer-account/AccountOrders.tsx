"use client";

import { OrderHistory } from "./OrderHistory";

export function AccountOrders() {
  return (
    <section
      className="rounded-3xl border border-border bg-card p-6 shadow-xs sm:p-8 text-card-foreground"
      aria-labelledby="orders-heading"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Orders</p>
        <h1 id="orders-heading" className="mt-1 text-2xl font-black tracking-tight text-foreground">
          My Order History
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Track fulfillment status, invoice numbers, and Steadfast courier tracking updates.
        </p>
      </div>

      <OrderHistory />
    </section>
  );
}
