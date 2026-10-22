import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Loader2, PackageCheck, Plus, Repeat, Search, Undo2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { currencySymbol, useStoreInfo } from "@/hooks/useStoreInfo";
import { ordersApi } from "@/lib/api/orders";
import { productsApi } from "@/lib/api/products";
import { returnsApi } from "@/lib/api/returns";
import { usersApi } from "@/lib/api/users";
import {
  nextReturnStatuses,
  RETURN_REASONS,
  RETURN_STATUS_LABELS,
  type ReturnItem,
  type ReturnStatus,
  returnItemsTotal,
  validateReturn,
} from "@/lib/returns";
import { Link } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  order_id: string;
  customer_user_id: string;
  kind: string;
  status: string;
  reason: string;
  items: unknown;
  refund_amount: number;
  refund_method: string;
  restock: boolean;
  restocked: boolean;
  notes: string | null;
  created_at: string;
};

const FILTERS: Array<"all" | ReturnStatus> = [
  "all",
  "requested",
  "approved",
  "received",
  "completed",
  "rejected",
];

const statusClass: Record<string, string> = {
  requested: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-primary/10 text-primary border-primary/30",
  received: "bg-accent text-accent-foreground border-border",
  completed: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const asItems = (v: unknown): ReturnItem[] => (Array.isArray(v) ? (v as ReturnItem[]) : []);
const shortId = (id: string) => "#" + id.slice(0, 8).toUpperCase();

const AdminReturns = () => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: store } = useStoreInfo(isAdmin);
  const cur = currencySymbol(store?.currency);
  const [filter, setFilter] = useState<"all" | ReturnStatus>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-returns"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await returnsApi.list();
      return (res.data ?? []) as Row[];
    },
  });

  const userIds = useMemo(() => Array.from(new Set(rows.map((r) => r.customer_user_id))), [rows]);
  const { data: names = {} } = useQuery({
    queryKey: ["admin-returns-names", userIds],
    enabled: isAdmin && userIds.length > 0,
    queryFn: async () => {
      const res = await usersApi.list();
      const list = res.users || res.data || [];
      return Object.fromEntries(
        list.map((p: any) => [p.user_id || p.id, { name: p.full_name || p.name, phone: p.phone }]),
      ) as Record<string, { name: string | null; phone: string | null }>;
    },
  });

  const stats = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "requested").length,
      awaiting: rows.filter((r) => r.status === "approved").length,
      exchanges: rows.filter((r) => r.kind === "exchange" && r.status !== "rejected").length,
      refunded: rows
        .filter((r) => r.status === "completed")
        .reduce((s, r) => s + Number(r.refund_amount || 0), 0),
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      const n = names[r.customer_user_id];
      return (
        r.order_id.toLowerCase().includes(q.replace("#", "")) ||
        (n?.name || "").toLowerCase().includes(q) ||
        (n?.phone || "").includes(q)
      );
    });
  }, [rows, filter, search, names]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-returns"] });

  const advance = async (r: Row, to: ReturnStatus) => {
    if (!user) return;
    setBusy(true);
    try {
      const patch: { status: string; restocked?: boolean } = { status: to };
      // Put items back on the shelf when they arrive.
      if (to === "received" && r.restock && !r.restocked) {
        for (const it of asItems(r.items)) {
          if (!it.product_id || !it.quantity) continue;
          try {
            const p = await productsApi.get(it.product_id);
            if (p?.data) {
              await productsApi.update(it.product_id, {
                stock: (p.data.stock ?? 0) + Number(it.quantity),
              });
            }
          } catch {
            // Ignore individual product update error
          }
        }
        patch.restocked = true;
      }
      if (to === "completed" && r.refund_method === "store_credit" && Number(r.refund_amount) > 0) {
        try {
          await usersApi.addCredit(
            r.customer_user_id,
            Number(r.refund_amount),
            `Refund for return on order ${shortId(r.order_id)}`,
            user.id,
          );
        } catch {
          // Ignore store credit failure
        }
      }
      await returnsApi.update(r.id, patch);
      toast.success(`Marked as ${RETURN_STATUS_LABELS[to].toLowerCase()}`);
      setActive(null);
      refresh();
      qc.invalidateQueries({ queryKey: ["admin-store-credits"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch {
      toast.error("Could not update this return");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Returns & Exchanges"
      subtitle="Review requests, restock items and refund customers"
    >
      <div className="space-y-4 pb-24 md:pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Clock} label="Needs review" value={String(stats.pending)} />
          <Stat icon={PackageCheck} label="Awaiting item" value={String(stats.awaiting)} />
          <Stat icon={Repeat} label="Exchanges" value={String(stats.exchanges)} />
          <Stat icon={Wallet} label="Refunded" value={`${cur}${stats.refunded.toLocaleString()}`} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, name or phone"
              className="pl-9 h-11"
            />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="h-11 gap-2">
            <Plus className="h-4 w-4" /> New return
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {FILTERS.map((f) => {
            const count = f === "all" ? rows.length : rows.filter((r) => r.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 h-9 text-sm font-medium transition-colors",
                  filter === f
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "All" : RETURN_STATUS_LABELS[f]}{" "}
                <span className="opacity-60 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border bg-card py-16 px-6 text-center">
            <Undo2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 font-medium">No returns here</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create one from a delivered order when a customer sends something back.
            </p>
          </div>
        ) : (
          <>
            {/* Phone cards */}
            <div className="space-y-3 md:hidden">
              {visible.map((r) => {
                const n = names[r.customer_user_id];
                return (
                  <button
                    key={r.id}
                    onClick={() => setActive(r)}
                    className="w-full text-left rounded-2xl border bg-card p-4 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{n?.name || "Customer"}</p>
                        <p className="text-xs text-muted-foreground">
                          {shortId(r.order_id)} · {format(new Date(r.created_at), "d MMM")}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusClass[r.status]}>
                        {RETURN_STATUS_LABELS[r.status as ReturnStatus]}
                      </Badge>
                    </div>
                    <p className="text-sm mt-2 line-clamp-1">{r.reason}</p>
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        {r.kind === "exchange" ? (
                          <Repeat className="h-3.5 w-3.5" />
                        ) : (
                          <Undo2 className="h-3.5 w-3.5" />
                        )}
                        {r.kind === "exchange" ? "Exchange" : "Return"} ·{" "}
                        {asItems(r.items).reduce((s, i) => s + Number(i.quantity), 0)} item(s)
                      </span>
                      <span className="font-semibold">
                        {cur}
                        {Number(r.refund_amount).toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-2xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Customer</th>
                    <th className="text-left font-medium px-4 py-3">Order</th>
                    <th className="text-left font-medium px-4 py-3">Type</th>
                    <th className="text-left font-medium px-4 py-3">Reason</th>
                    <th className="text-right font-medium px-4 py-3">Refund</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const n = names[r.customer_user_id];
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setActive(r)}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{n?.name || "Customer"}</p>
                          <p className="text-xs text-muted-foreground">{n?.phone}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{shortId(r.order_id)}</td>
                        <td className="px-4 py-3 capitalize">{r.kind}</td>
                        <td className="px-4 py-3 max-w-[220px] truncate">{r.reason}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {cur}
                          {Number(r.refund_amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusClass[r.status]}>
                            {RETURN_STATUS_LABELS[r.status as ReturnStatus]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(r.created_at), "d MMM yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {createOpen && (
        <CreateReturnDialog
          cur={cur}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            refresh();
          }}
        />
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {active.kind === "exchange" ? "Exchange" : "Return"} {shortId(active.order_id)}
                  <Badge variant="outline" className={statusClass[active.status]}>
                    {RETURN_STATUS_LABELS[active.status as ReturnStatus]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Info
                    label="Customer"
                    value={names[active.customer_user_id]?.name || "Customer"}
                  />
                  <Info label="Phone" value={names[active.customer_user_id]?.phone || "—"} />
                  <Info label="Reason" value={active.reason} />
                  <Info
                    label="Refund"
                    value={`${cur}${Number(active.refund_amount).toLocaleString()} · ${active.refund_method === "store_credit" ? "Store credit" : active.refund_method === "original_payment" ? "Original payment" : "No refund"}`}
                  />
                  <Info
                    label="Restock"
                    value={active.restock ? (active.restocked ? "Done" : "When received") : "No"}
                  />
                  <Info
                    label="Created"
                    value={format(new Date(active.created_at), "d MMM yyyy, HH:mm")}
                  />
                </div>
                <div className="rounded-xl border divide-y">
                  {asItems(active.items).map((i, idx) => (
                    <div key={idx} className="flex justify-between px-3 py-2">
                      <span className="truncate">
                        {i.name}
                        {i.variant ? ` · ${i.variant}` : ""} × {i.quantity}
                      </span>
                      <span>
                        {cur}
                        {(Number(i.price) * Number(i.quantity)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                {active.notes && (
                  <p className="rounded-xl bg-muted/50 p-3 whitespace-pre-wrap">{active.notes}</p>
                )}
                <div className="flex gap-2 text-xs">
                  <Link
                    to={`/admin/customers/${active.customer_user_id}`}
                    className="text-primary hover:underline"
                  >
                    Open customer
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link
                    to={`/admin/orders/${active.order_id}/invoice`}
                    className="text-primary hover:underline"
                  >
                    View invoice
                  </Link>
                </div>
              </div>
              {nextReturnStatuses(active.status as ReturnStatus).length > 0 && (
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  {nextReturnStatuses(active.status as ReturnStatus).map((s) => (
                    <Button
                      key={s}
                      disabled={busy}
                      variant={s === "rejected" ? "outline" : "default"}
                      className="h-11 sm:h-10"
                      onClick={() => advance(active, s)}
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {s === "approved"
                        ? "Approve"
                        : s === "rejected"
                          ? "Reject"
                          : s === "received"
                            ? "Item received"
                            : "Complete & refund"}
                    </Button>
                  ))}
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="text-xl sm:text-2xl font-semibold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}

function CreateReturnDialog({
  cur,
  onClose,
  onCreated,
}: {
  cur: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<any | null>(null);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [kind, setKind] = useState<"return" | "exchange">("return");
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [method, setMethod] = useState<"store_credit" | "original_payment" | "none">(
    "store_credit",
  );
  const [refund, setRefund] = useState("");
  const [restock, setRestock] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: matches = [], isFetching } = useQuery({
    queryKey: ["return-order-search", q],
    enabled: q.trim().length >= 3 && !order,
    queryFn: async () => {
      const res = await ordersApi.list();
      const list = res.orders || res.data || [];
      const eligible = list.filter(
        (o: any) => ["delivered", "shipped"].includes(o.status) && !o.trashedAt && !o.trashed_at,
      );
      const s = q.trim().toLowerCase().replace("#", "");
      return eligible
        .filter(
          (o: any) =>
            (o.id || "").toLowerCase().startsWith(s) ||
            (o.orderNumber || o.order_number || "").toLowerCase().includes(s),
        )
        .slice(0, 8);
    },
  });

  const orderItems = order ? asItems(order.items) : [];
  const selected: ReturnItem[] = orderItems
    .map((i, idx) => ({
      product_id:
        (i as ReturnItem & { id?: string }).product_id ?? (i as { id?: string }).id ?? null,
      name: i.name,
      price: Number(i.price),
      quantity: qty[idx] ?? 0,
      variant: i.variant,
    }))
    .filter((i) => i.quantity > 0);
  const suggested = returnItemsTotal(selected);

  const save = async () => {
    if (!order || !user) return;
    const amount =
      method === "none" || kind === "exchange" ? 0 : refund === "" ? suggested : Number(refund);
    const err = validateReturn({
      reason,
      items: selected,
      refund: amount,
      orderTotal: Number(order.total_amount || order.totalAmount || 0),
    });
    if (err) return toast.error(err);
    setSaving(true);
    try {
      await returnsApi.create({
        order_id: order.id,
        customer_user_id: order.user_id || order.userId || order.id,
        kind,
        reason,
        items: selected as never,
        refund_amount: amount,
        refund_method: kind === "exchange" ? "none" : method,
        restock,
        notes: notes.trim() || null,
      });
      toast.success("Return created");
      onCreated();
    } catch {
      toast.error("Could not create return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New return or exchange</DialogTitle>
        </DialogHeader>
        {!order ? (
          <div className="space-y-3">
            <Label>Find the order</Label>
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type the order number, e.g. 3F2A91C0"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Only shipped or delivered orders can be returned.
            </p>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <div className="space-y-2">
              {matches.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setOrder(o);
                    setQty({});
                  }}
                  className="w-full flex justify-between items-center rounded-xl border p-3 text-left hover:bg-muted/40"
                >
                  <span>
                    <span className="font-mono text-sm">{shortId(o.id)}</span>
                    <span className="block text-xs text-muted-foreground capitalize">
                      {o.status} · {format(new Date(o.created_at), "d MMM yyyy")}
                    </span>
                  </span>
                  <span className="font-medium">
                    {cur}
                    {Number(o.total_amount).toLocaleString()}
                  </span>
                </button>
              ))}
              {q.trim().length >= 3 && !isFetching && matches.length === 0 && (
                <p className="text-sm text-muted-foreground">No matching order.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
              <span className="font-mono text-sm">{shortId(order.id)}</span>
              <button className="text-xs text-primary" onClick={() => setOrder(null)}>
                Change
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["return", "exchange"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "h-11 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2",
                    kind === k
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {k === "return" ? <Undo2 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                  {k === "return" ? "Return" : "Exchange"}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Items coming back</Label>
              {orderItems.map((i, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl border p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {i.name}
                      {i.variant ? ` · ${i.variant}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cur}
                      {Number(i.price).toLocaleString()} · bought {i.quantity}
                    </p>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={i.quantity}
                    value={qty[idx] ?? 0}
                    onChange={(e) =>
                      setQty({
                        ...qty,
                        [idx]: Math.max(
                          0,
                          Math.min(Number(i.quantity), Number(e.target.value) || 0),
                        ),
                      })
                    }
                    className="w-20 h-10 text-center"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {kind === "return" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Refund as</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="store_credit">Store credit</SelectItem>
                      <SelectItem value="original_payment">Original payment</SelectItem>
                      <SelectItem value="none">No refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {method !== "none" && (
                  <div className="space-y-2">
                    <Label>Refund amount ({cur})</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={refund}
                      placeholder={String(suggested)}
                      onChange={(e) => setRefund(e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Put items back in stock</p>
                <p className="text-xs text-muted-foreground">
                  Happens when you mark the item as received
                </p>
              </div>
              <Switch checked={restock} onCheckedChange={setRestock} />
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
            />
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={onClose} className="h-11 sm:h-10">
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="h-11 sm:h-10">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AdminReturns;
