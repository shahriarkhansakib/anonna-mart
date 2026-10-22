import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useShippingRules } from "@/hooks/useShippingRules";
import { currencySymbol, useStoreInfo } from "@/hooks/useStoreInfo";
import { deliveryZonesApi } from "@/lib/api/delivery-zones";
import { ordersApi } from "@/lib/api/orders";
import { productsApi } from "@/lib/api/products";
import { useNavigate } from "@/lib/router-compat";
import { shippingQuote } from "@/lib/shippingRules";

interface Line {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  variant?: string;
  variantId?: string;
  stock: number;
}

const AdminNewOrder = () => {
  useDocumentTitle("Create order - Admin");
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: store } = useStoreInfo(isAdmin);
  const cur = currencySymbol(store?.currency);

  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", note: "" });
  const { data: shippingRules = [] } = useShippingRules(isAdmin);
  const [zoneId, setZoneId] = useState("");
  const [weight, setWeight] = useState(0);
  const [manualShipping, setManualShipping] = useState(false);
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState("cod");
  const [paid, setPaid] = useState("unpaid");
  const [saving, setSaving] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["new-order-products"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await productsApi.list();
      return (res.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        image_url: p.imageUrl || p.image_url || "",
        discount: Number(p.discount || 0),
        product_variants: p.variants || [],
      }));
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["new-order-zones"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await deliveryZonesApi.list();
      return (res.data ?? []).map((z: any) => ({
        id: z.id,
        zone_name: z.zoneName || z.zone_name,
        charge: Number(z.charge || 0),
      }));
    },
  });

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return products.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 8);
  }, [q, products]);

  const add = (l: Line) => {
    setLines((prev) => {
      const key = l.variantId || l.id;
      const found = prev.find((x) => (x.variantId || x.id) === key);
      if (found)
        return prev.map((x) =>
          (x.variantId || x.id) === key ? { ...x, quantity: x.quantity + 1 } : x,
        );
      return [...prev, l];
    });
    setQ("");
  };

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const quote = shippingQuote(
    shippingRules,
    zoneId,
    weight,
    Math.max(0, subtotal - discount),
    Number(zones.find((z) => z.id === zoneId)?.charge ?? 0),
  );
  useEffect(() => {
    if (!manualShipping) setShipping(quote.charge);
  }, [quote.charge, manualShipping]);
  const tax =
    store?.taxRate && !store.taxInclusive
      ? Math.round(((subtotal - discount) * store.taxRate) / 100)
      : 0;
  const total = Math.max(0, subtotal - discount + shipping + tax);

  const submit = async () => {
    if (!user) return;
    if (!lines.length) return toast.error("Add at least one product");
    if (!customer.name.trim() || !customer.phone.trim())
      return toast.error("Customer name and phone are required");
    setSaving(true);
    const items = lines.map((l) => ({
      id: l.id,
      name: l.name,
      price: l.price,
      quantity: l.quantity,
      image: l.image,
      variant: l.variant,
      variant_id: l.variantId,
    }));
    const address = [
      customer.name.trim(),
      customer.phone.trim(),
      customer.address.trim(),
      customer.note.trim() && `Note: ${customer.note.trim()}`,
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const res = await ordersApi.create({
        userId: user?.id,
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        shippingAddress: address,
        items: lines.map((l) => ({
          productId: l.id,
          productName: l.name,
          quantity: l.quantity,
          unitPrice: l.price,
          totalPrice: l.price * l.quantity,
        })),
        subtotal,
        shippingFee: shipping,
        discountAmount: discount,
        totalAmount: total,
        paymentMethod: payment,
        paymentStatus: paid,
        status: "pending",
      });

      // Update local product stocks
      await Promise.all(
        lines.map(async (l) => {
          try {
            await productsApi.update(l.id, {
              stock: Math.max(0, l.stock - l.quantity),
            });
          } catch {
            // Ignore individual stock update error
          }
        }),
      );

      setSaving(false);
      toast.success("Order created");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      const orderId = res.data?.id || res.data?.orderNumber;
      if (orderId) {
        navigate(`/admin/orders/${orderId}/invoice`);
      } else {
        navigate("/admin/orders");
      }
    } catch {
      setSaving(false);
      toast.error("Could not create the order");
    }
  };

  return (
    <AdminLayout title="Create order" subtitle="For phone, social media or walk-in customers">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 lg:gap-6">
        <div className="space-y-4 min-w-0">
          <section className="surface p-4 sm:p-5">
            <h2 className="font-semibold mb-3">Products</h2>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products to add"
                className="pl-10 h-11 rounded-xl"
              />
              {results.length > 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-popover shadow-hover overflow-hidden max-h-80 overflow-y-auto">
                  {results.map((p) => {
                    const variants = (p.product_variants ?? []) as {
                      id: string;
                      name: string;
                      price: number | null;
                      stock: number;
                    }[];
                    const base = Number(p.price) * (1 - (p.discount || 0) / 100);
                    const rows = variants.length
                      ? variants.map((v) => ({
                          key: v.id,
                          label: `${p.name} · ${v.name}`,
                          price: Number(v.price ?? base),
                          stock: v.stock,
                          line: {
                            id: p.id,
                            name: p.name,
                            variant: v.name,
                            variantId: v.id,
                            price: Number(v.price ?? base),
                            quantity: 1,
                            image: p.image_url,
                            stock: v.stock,
                          },
                        }))
                      : [
                          {
                            key: p.id,
                            label: p.name,
                            price: base,
                            stock: p.stock ?? 0,
                            line: {
                              id: p.id,
                              name: p.name,
                              price: base,
                              quantity: 1,
                              image: p.image_url,
                              stock: p.stock ?? 0,
                            },
                          },
                        ];
                    return rows.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => add(r.line)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted text-sm"
                      >
                        <span className="truncate">{r.label}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {cur}
                          {Math.round(r.price)} · {r.stock} left
                        </span>
                      </button>
                    ));
                  })}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Search above to add products
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border/60">
                {lines.map((l, i) => (
                  <li key={l.variantId || l.id} className="flex items-center gap-3 py-3">
                    <div className="h-11 w-11 rounded-lg bg-muted overflow-hidden shrink-0">
                      {l.image && (
                        <img src={l.image} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {l.name}
                        {l.variant && <span className="text-muted-foreground"> · {l.variant}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cur}
                        {Math.round(l.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          setLines((p) =>
                            p.map((x, j) =>
                              j === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x,
                            ),
                          )
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-7 text-center text-sm">{l.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          setLines((p) =>
                            p.map((x, j) => (j === i ? { ...x, quantity: x.quantity + 1 } : x)),
                          )
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold">Customer</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  inputMode="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={customer.note}
                onChange={(e) => setCustomer({ ...customer, note: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </section>
        </div>

        <aside className="surface p-4 sm:p-5 h-fit lg:sticky lg:top-20 space-y-4">
          <h2 className="font-semibold">Summary</h2>
          {zones.length > 0 && (
            <div>
              <Label>Delivery zone</Label>
              <Select
                value={zoneId}
                onValueChange={(v) => {
                  setZoneId(v);
                  setManualShipping(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.zone_name} — {cur}
                      {z.charge}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="parcel-weight">Parcel weight (kg)</Label>
            <Input
              id="parcel-weight"
              type="number"
              min="0"
              step="0.01"
              value={weight}
              onChange={(e) => {
                setWeight(Math.max(0, Number(e.target.value) || 0));
                setManualShipping(false);
              }}
            />
          </div>
          {!manualShipping && quote.rule && (
            <p className="text-xs text-muted-foreground">{quote.rule.name}</p>
          )}
          {manualShipping && (
            <Button variant="ghost" size="sm" onClick={() => setManualShipping(false)}>
              Use calculated shipping
            </Button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Shipping</Label>
              <Input
                type="number"
                value={shipping}
                min="0"
                onChange={(e) => {
                  setManualShipping(true);
                  setShipping(Math.max(0, Number(e.target.value) || 0));
                }}
              />
            </div>
            <div>
              <Label>Discount</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment</Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on delivery</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash (in store)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={paid} onValueChange={setPaid}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 text-sm border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                {cur}
                {Math.round(subtotal)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>
                  −{cur}
                  {discount}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {cur}
                {shipping}
              </span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {store?.taxLabel} ({store?.taxRate}%)
                </span>
                <span>
                  {cur}
                  {tax}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Total</span>
              <span>
                {cur}
                {Math.round(total)}
              </span>
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create order"}
          </Button>
        </aside>
      </div>
    </AdminLayout>
  );
};

export default AdminNewOrder;
