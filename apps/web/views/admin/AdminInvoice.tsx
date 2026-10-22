import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import { currencySymbol, useStoreInfo } from "@/hooks/useStoreInfo";
import { ordersApi } from "@/lib/api/orders";
import { parseShippingAddress } from "@/lib/fraudDetection";
import { Link, useParams, useSearchParams } from "@/lib/router-compat";

interface Item {
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

const AdminInvoice = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const slip = params.get("type") === "slip";
  const { isAdmin } = useAdmin();
  const { data: store } = useStoreInfo(isAdmin);
  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-invoice", id],
    enabled: isAdmin && !!id,
    queryFn: async () => {
      if (!id) return null;
      const res = await ordersApi.get(id);
      return res.data;
    },
  });

  if (isLoading || !store)
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!order)
    return (
      <div className="p-10 text-center">
        Order not found.{" "}
        <Link to="/admin/orders" className="text-primary">
          Back to orders
        </Link>
      </div>
    );

  const cur = currencySymbol(store.currency);
  const items = (Array.isArray(order.items) ? order.items : []) as unknown as Item[];
  const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const total = Number(order.total_amount);
  const other = total - subtotal;
  const ship = parseShippingAddress(order.shipping_address);
  const date = new Date(order.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-muted print:bg-card">
      <div className="print:hidden sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-4 h-14">
          <Button variant="ghost" asChild>
            <Link to="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
              Orders
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/admin/orders/${order.id}/invoice${slip ? "" : "?type=slip"}`}>
                {slip ? "Invoice" : "Packing slip"}
              </Link>
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-8 print:p-0">
        <div className="bg-card rounded-2xl shadow-card p-6 sm:p-10 print:shadow-none print:rounded-none">
          <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
            <div className="min-w-0">
              {store.logoUrl && (
                <img src={store.logoUrl} alt="" className="h-12 mb-3 object-contain" />
              )}
              <p className="text-lg font-semibold">{store.legalName || store.name}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {[
                  store.address,
                  store.phone,
                  store.email,
                  store.taxId && `${store.taxLabel} no: ${store.taxId}`,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-2xl font-bold tracking-tight">
                {slip ? "Packing slip" : "Invoice"}
              </p>
              <p className="text-sm text-muted-foreground">
                {store.invoicePrefix}
                {order.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-sm text-muted-foreground">{date}</p>
              {!slip && (
                <p className="text-sm mt-1 capitalize">
                  Payment: {order.payment_method || "cod"} · {order.payment_status || "unpaid"}
                </p>
              )}
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Ship to</p>
            <p className="font-medium">{ship.name}</p>
            {ship.phone && <p className="text-sm">{ship.phone}</p>}
            <p className="text-sm text-muted-foreground">{ship.addressParts.join(", ")}</p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 font-medium text-center w-16">Qty</th>
                {!slip && <th className="py-2 font-medium text-right w-24">Price</th>}
                {!slip && <th className="py-2 font-medium text-right w-28">Total</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx} className="border-b border-border/60">
                  <td className="py-3">
                    {i.name}
                    {i.variant ? (
                      <span className="text-muted-foreground"> · {i.variant}</span>
                    ) : null}
                  </td>
                  <td className="py-3 text-center">{i.quantity}</td>
                  {!slip && (
                    <td className="py-3 text-right">
                      {cur}
                      {Number(i.price).toLocaleString()}
                    </td>
                  )}
                  {!slip && (
                    <td className="py-3 text-right">
                      {cur}
                      {(Number(i.price) * Number(i.quantity)).toLocaleString()}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {!slip && (
            <div className="mt-6 ml-auto w-full sm:w-64 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {cur}
                  {subtotal.toLocaleString()}
                </span>
              </div>
              {other !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {other > 0 ? "Shipping & fees" : "Discount"}
                  </span>
                  <span>
                    {cur}
                    {other.toLocaleString()}
                  </span>
                </div>
              )}
              {store.taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {store.taxLabel} {store.taxRate}%{store.taxInclusive ? " (included)" : ""}
                  </span>
                  <span>
                    {cur}
                    {Math.round(
                      store.taxInclusive
                        ? total - total / (1 + store.taxRate / 100)
                        : (subtotal * store.taxRate) / 100,
                    ).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span>
                  {cur}
                  {total.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <p className="mt-10 text-center text-xs text-muted-foreground whitespace-pre-line">
            {store.invoiceFooter || `Thank you for shopping with ${store.name}.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminInvoice;
