import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Phone, ShoppingBag, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { currencySymbol, useStoreInfo } from "@/hooks/useStoreInfo";
import { usersApi } from "@/lib/api/users";
import {
  creditBalance,
  customerSegments,
  SEGMENT_LABELS,
  validateCredit,
} from "@/lib/customerSegments";
import { parseShippingAddress } from "@/lib/fraudDetection";
import { Link, useParams } from "@/lib/router-compat";

const AdminCustomerDetail = () => {
  const { id } = useParams();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: store } = useStoreInfo(isAdmin);
  const cur = currencySymbol(store?.currency);
  const [note, setNote] = useState("");
  const [creditAmt, setCreditAmt] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [savingCredit, setSavingCredit] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer", id],
    enabled: isAdmin && !!id,
    queryFn: async () => {
      if (!id) return { profile: null, orders: [], notes: [], credits: [] };
      const res = await usersApi.get(id);
      const resData = res.data;
      return {
        profile: resData.profile || resData,
        orders: resData.orders || [],
        notes: resData.notes || [],
        credits: resData.credits || [],
      };
    },
  });

  const addNote = async () => {
    if (!note.trim() || !user || !id) return;
    try {
      await usersApi.addNote(id, note.trim(), user.id);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
    } catch {
      toast.error("Could not save note");
    }
  };
  const delNote = async (nid: string) => {
    if (!id) return;
    try {
      await usersApi.deleteNote(id, nid);
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
    } catch {
      toast.error("Could not delete note");
    }
  };

  const balance = creditBalance(data?.credits ?? []);
  const addCredit = async () => {
    if (!user || !id) return;
    const amt = Number(creditAmt);
    const err = validateCredit(amt, balance, creditReason);
    if (err) return toast.error(err);
    setSavingCredit(true);
    try {
      await usersApi.addCredit(id, amt, creditReason.trim(), user.id);
      toast.success(amt > 0 ? "Credit added" : "Credit deducted");
      setCreditAmt("");
      setCreditReason("");
      qc.invalidateQueries({ queryKey: ["admin-store-credits"] });
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
    } catch {
      toast.error("Could not save credit");
    } finally {
      setSavingCredit(false);
    }
  };

  const orders = data?.orders ?? [];
  const last = orders[0] ? parseShippingAddress(orders[0].shipping_address) : null;
  const name = data?.profile?.full_name || last?.name || "Customer";
  const phone = data?.profile?.phone || last?.phone || "";
  const address =
    [data?.profile?.address, data?.profile?.thana, data?.profile?.district, data?.profile?.division]
      .filter(Boolean)
      .join(", ") ||
    last?.addressParts.join(", ") ||
    "";
  const active = orders.filter((o) => !["cancelled", "rejected"].includes(o.status || ""));
  const spent = active.reduce((s, o) => s + Number(o.total_amount), 0);
  const segments = customerSegments({
    order_count: active.length,
    total_spent: spent,
    last_order_date: active[0]?.created_at ?? null,
  });

  return (
    <AdminLayout title={name} subtitle="Customer profile">
      <Button variant="ghost" asChild className="mb-3 -ml-2">
        <Link to="/admin/ecommerce-customers">
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
      </Button>
      {segments.length > 0 && (
        <div className="flex gap-1.5 mb-3">
          {segments.map((g) => (
            <Badge key={g} variant="secondary">
              {SEGMENT_LABELS[g]}
            </Badge>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="p-10 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-6">
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Orders", orders.length],
                ["Total spent", `${cur}${spent.toLocaleString()}`],
                [
                  "Avg. order",
                  `${cur}${active.length ? Math.round(spent / active.length).toLocaleString() : 0}`,
                ],
              ].map(([l, v]) => (
                <div key={l as string} className="surface p-4">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="text-lg sm:text-2xl font-semibold truncate">{v}</p>
                </div>
              ))}
            </div>
            <section className="surface overflow-hidden">
              <h2 className="font-semibold p-4 sm:p-5 pb-2">Orders</h2>
              {orders.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No orders yet
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {orders.map((o) => (
                    <li key={o.id}>
                      <Link
                        to={`/admin/orders/${o.id}/invoice`}
                        className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-muted/60"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">#{o.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="capitalize">
                            {o.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {cur}
                            {Number(o.total_amount).toLocaleString()}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <aside className="space-y-4">
            <section className="surface p-4 sm:p-5 space-y-3 text-sm">
              <h2 className="font-semibold text-base">Contact</h2>
              {phone ? (
                <a href={`tel:${phone}`} className="flex items-center gap-2 text-primary">
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
              ) : (
                <p className="text-muted-foreground">No phone</p>
              )}
              {address && (
                <p className="flex gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  {address}
                </p>
              )}
            </section>
            <section className="surface p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Store credit
                </h2>
                <span className="text-lg font-semibold">
                  {cur}
                  {balance.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={creditAmt}
                  onChange={(e) => setCreditAmt(e.target.value)}
                  placeholder="± Amount"
                  className="w-28"
                />
                <Input
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Reason, e.g. goodwill"
                />
              </div>
              <Button size="sm" onClick={addCredit} disabled={savingCredit}>
                Save credit
              </Button>
              <ul className="space-y-1.5 text-sm">
                {data?.credits.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between gap-2 rounded-lg bg-muted px-3 py-2"
                  >
                    <span className="min-w-0 truncate">
                      {c.reason}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <span
                      className={
                        Number(c.amount) < 0
                          ? "text-destructive font-medium"
                          : "text-primary font-medium"
                      }
                    >
                      {Number(c.amount) > 0 ? "+" : "−"}
                      {cur}
                      {Math.abs(Number(c.amount)).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="surface p-4 sm:p-5 space-y-3">
              <h2 className="font-semibold">Notes</h2>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Private note about this customer"
              />
              <Button size="sm" onClick={addNote} disabled={!note.trim()}>
                Add note
              </Button>
              <ul className="space-y-2">
                {data?.notes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-muted p-3 text-sm flex gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="whitespace-pre-wrap break-words">{n.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => delNote(n.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCustomerDetail;
