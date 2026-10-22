import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import { currencySymbol, useStoreInfo } from "@/hooks/useStoreInfo";
import { ordersApi } from "@/lib/api/orders";
import { parseShippingAddress } from "@/lib/fraudDetection";
import { Link, useSearchParams } from "@/lib/router-compat";

interface Item {
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

/** Simple Code-39-style visual bars from the order reference (visual aid, plus human-readable code). */
const Bars = ({ value }: { value: string }) => {
  const bits = Array.from(value).flatMap((c) =>
    c.charCodeAt(0).toString(2).padStart(8, "0").split(""),
  );
  return (
    <svg viewBox={`0 0 ${bits.length * 2} 40`} className="w-full h-12" preserveAspectRatio="none">
      {bits.map(
        (b, i) =>
          b === "1" && <rect key={i} x={i * 2} y={0} width={1.6} height={40} fill="currentColor" />,
      )}
    </svg>
  );
};

const AdminBatchPrint = () => {
  const [params] = useSearchParams();
  const type = params.get("type") === "invoice" ? "invoice" : "label";
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const { isAdmin } = useAdmin();
  const { data: store } = useStoreInfo(isAdmin);
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-batch-print", ids.join(",")],
    enabled: isAdmin && ids.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        ids.map((id) =>
          ordersApi
            .get(id)
            .then((r) => r.data)
            .catch(() => null),
        ),
      );
      return results.filter(Boolean);
    },
  });

  if (!ids.length)
    return (
      <div className="p-10 text-center">
        No orders selected.{" "}
        <Link to="/admin/orders" className="text-primary">
          Back
        </Link>
      </div>
    );
  if (isLoading || !store)
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const cur = currencySymbol(store.currency);

  return (
    <div className="min-h-screen bg-muted print:bg-card">
      <style>
        {type === "label"
          ? "@media print { @page { size: 4in 6in; margin: 0; } }"
          : "@media print { @page { size: A4; margin: 12mm; } }"}
      </style>
      <div className="print:hidden sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-4 h-14">
          <Button variant="ghost" asChild>
            <Link to="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
              Orders
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {orders?.length ?? 0} {type === "label" ? "labels (4×6 in)" : "invoices"}
          </p>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 p-4 print:p-0 print:gap-0">
        {orders?.map((order) => {
          const items = (Array.isArray(order.items) ? order.items : []) as unknown as Item[];
          const ship = parseShippingAddress(order.shipping_address);
          const ref = `${store.invoicePrefix}${order.id.slice(0, 8).toUpperCase()}`;
          const cod = (order.payment_method || "cod") === "cod" && order.payment_status !== "paid";
          const total = Number(order.total_amount);

          if (type === "label")
            return (
              <div
                key={order.id}
                className="bg-card text-foreground w-[4in] h-[6in] p-3 flex flex-col border border-border print:border-0 shadow-card print:shadow-none overflow-hidden"
                style={{ breakAfter: "page" }}
              >
                <div className="flex justify-between items-start border-b-2 border-foreground pb-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase">From</p>
                    <p className="text-sm font-bold truncate">{store.name}</p>
                    <p className="text-[10px] leading-tight">
                      {[store.phone, store.address].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="text-[10px] text-right shrink-0">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="py-3 border-b-2 border-foreground">
                  <p className="text-[10px] uppercase">Ship to</p>
                  <p className="text-lg font-bold leading-tight">{ship?.name || "Customer"}</p>
                  <p className="text-xl font-extrabold tracking-wide">{ship?.phone}</p>
                  <p className="text-sm leading-snug mt-1">
                    {ship?.addressParts?.join(", ") || order.shipping_address}
                  </p>
                </div>
                <div className="py-2 border-b-2 border-foreground text-center">
                  {cod ? (
                    <p className="text-2xl font-black">
                      COD {cur}
                      {total.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-2xl font-black">PREPAID</p>
                  )}
                </div>
                <div className="py-2 flex-1 overflow-hidden text-[11px] leading-tight">
                  {items.slice(0, 6).map((i, k) => (
                    <p key={k} className="truncate">
                      {i.quantity}× {i.name}
                      {i.variant ? ` (${i.variant})` : ""}
                    </p>
                  ))}
                  {items.length > 6 && <p>+{items.length - 6} more</p>}
                </div>
                <div className="pt-1 text-center">
                  <Bars value={order.tracking_id || ref} />
                  <p className="font-mono text-sm font-bold">{order.tracking_id || ref}</p>
                </div>
              </div>
            );

          const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
          return (
            <div
              key={order.id}
              className="bg-card w-full max-w-3xl rounded-2xl shadow-card p-8 print:shadow-none print:rounded-none print:p-0"
              style={{ breakAfter: "page" }}
            >
              <div className="flex justify-between gap-6 mb-6">
                <div>
                  <p className="text-lg font-semibold">{store.legalName || store.name}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {[store.address, store.phone, store.email].filter(Boolean).join("\n")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">Invoice</p>
                  <p className="text-sm text-muted-foreground">{ref}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-xs uppercase text-muted-foreground">Bill to</p>
              <p className="font-medium">{ship?.name}</p>
              <p className="text-sm text-muted-foreground mb-6">
                {[ship?.phone, ship?.addressParts?.join(", ")].filter(Boolean).join(" · ")}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i, k) => (
                    <tr key={k} className="border-b border-border/60">
                      <td className="py-2">
                        {i.name}
                        {i.variant ? ` (${i.variant})` : ""}
                      </td>
                      <td className="text-right">{i.quantity}</td>
                      <td className="text-right">
                        {cur}
                        {Number(i.price).toLocaleString()}
                      </td>
                      <td className="text-right">
                        {cur}
                        {(Number(i.price) * Number(i.quantity)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 ml-auto w-56 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {cur}
                    {subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping & other</span>
                  <span>
                    {cur}
                    {(total - subtotal).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-1">
                  <span>Total</span>
                  <span>
                    {cur}
                    {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminBatchPrint;
