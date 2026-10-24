import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  PackageCheck,
  Plus,
  Repeat,
  Search,
  Undo2,
  Wallet,
} from "lucide-react";
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
import { type OrderReturnItem, returnsApi } from "@/lib/api/returns";
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

const FILTERS: Array<"all" | ReturnStatus> = [
  "all",
  "requested",
  "approved",
  "received",
  "completed",
  "rejected",
];

const statusClass: Record<string, string> = {
  requested: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  received: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const asItems = (v: unknown): ReturnItem[] => (Array.isArray(v) ? (v as ReturnItem[]) : []);
const shortId = (id: string) => "#" + (id || "").slice(0, 8).toUpperCase();

const AdminReturns = () => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: store } = useStoreInfo(isAdmin);
  const cur = currencySymbol(store?.currency);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filter, setFilter] = useState<"all" | ReturnStatus>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<OrderReturnItem | null>(null);
  const [busy, setBusy] = useState(false);

  // Single unified returns query with backend stats and server-side filtering
  const { data: returnsResponse, isLoading } = useQuery({
    queryKey: ["admin-returns", page, pageSize, filter, search],
    enabled: isAdmin,
    queryFn: () =>
      returnsApi.list({
        page,
        limit: pageSize,
        status: filter,
        search,
      }),
  });

  const rows = useMemo(() => returnsResponse?.data || [], [returnsResponse]);
  const stats = useMemo(
    () =>
      returnsResponse?.stats || {
        pending: 0,
        awaiting: 0,
        received: 0,
        completed: 0,
        exchanges: 0,
        refunded: 0,
      },
    [returnsResponse],
  );

  const pagination = returnsResponse?.pagination || {
    page: 1,
    pageSize: 25,
    totalCount: rows.length,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-returns"] });

  // Advance return state with atomic backend execution
  const advance = async (r: OrderReturnItem, to: ReturnStatus) => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await returnsApi.update(r.id, { status: to });

      if (to === "received" && res.restocked) {
        toast.success("Items received & automatically restocked into active inventory");
      } else if (to === "completed" && r.refund_method === "store_credit") {
        toast.success(
          `Return marked completed & ${cur}${Number(r.refund_amount).toLocaleString()} store credit deposited to customer wallet`,
        );
      } else {
        toast.success(`Return status advanced to ${RETURN_STATUS_LABELS[to]}`);
      }

      setActive(null);
      refresh();
      qc.invalidateQueries({ queryKey: ["admin-store-credits"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-ecommerce-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: any) {
      toast.error(err?.message || "Could not update this return record");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Returns & Exchanges"
      subtitle="Review requests, restock inventory and issue refunds"
    >
      <div className="space-y-4 pb-24 md:pb-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Clock} label="Needs Review" value={String(stats.pending)} />
          <Stat icon={PackageCheck} label="Awaiting Item" value={String(stats.awaiting)} />
          <Stat icon={Repeat} label="Exchanges" value={String(stats.exchanges)} />
          <Stat
            icon={Wallet}
            label="Total Refunded"
            value={`${cur}${stats.refunded.toLocaleString()}`}
          />
        </div>

        {/* Search + New Return Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by order #, customer name, phone, or email..."
              className="pl-9 h-11"
            />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="h-11 gap-2">
            <Plus className="h-4 w-4" /> New return
          </Button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {FILTERS.map((f) => {
            const count =
              f === "all"
                ? pagination.totalCount
                : f === "requested"
                  ? stats.pending
                  : f === "approved"
                    ? stats.awaiting
                    : f === "received"
                      ? stats.received
                      : f === "completed"
                        ? stats.completed
                        : rows.filter((r) => r.status === f).length;

            return (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 h-9 text-sm font-medium transition-colors",
                  filter === f
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "All Returns" : RETURN_STATUS_LABELS[f]}{" "}
                <span className="opacity-60 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Table & Cards */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border bg-card py-16 px-6 text-center">
            <Undo2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 font-semibold">No returns found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || filter !== "all"
                ? "No return records match your search or filter."
                : "Create a return when a customer requests an exchange or refund."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
              {rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActive(r)}
                  className="w-full text-left rounded-2xl border bg-card p-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {r.customer?.name || r.customer?.full_name || "Customer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shortId(r.order_id)} · {format(new Date(r.created_at), "d MMM")}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusClass[r.status]}>
                      {RETURN_STATUS_LABELS[r.status as ReturnStatus] || r.status}
                    </Badge>
                  </div>
                  <p className="text-sm mt-2 line-clamp-1 text-muted-foreground">{r.reason}</p>
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      {r.kind === "exchange" ? (
                        <Repeat className="h-3.5 w-3.5" />
                      ) : (
                        <Undo2 className="h-3.5 w-3.5" />
                      )}
                      <span className="capitalize">{r.kind}</span> ·{" "}
                      {asItems(r.items).reduce((s, i) => s + Number(i.quantity || 1), 0)} item(s)
                    </span>
                    <span className="font-semibold text-foreground">
                      {cur}
                      {Number(r.refund_amount).toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-2xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Customer</th>
                    <th className="text-left font-medium px-4 py-3">Order</th>
                    <th className="text-left font-medium px-4 py-3">Type</th>
                    <th className="text-left font-medium px-4 py-3">Reason</th>
                    <th className="text-right font-medium px-4 py-3">Refund Amount</th>
                    <th className="text-left font-medium px-4 py-3">Restocked</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setActive(r)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {r.customer?.name || r.customer?.full_name || "Customer"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.customer?.phone || r.customer?.email || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{shortId(r.order_id)}</td>
                      <td className="px-4 py-3 capitalize font-medium">{r.kind}</td>
                      <td className="px-4 py-3 max-w-[220px] truncate text-muted-foreground">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {cur}
                        {Number(r.refund_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.restock ? (
                          r.restocked ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Restocked
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Pending</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusClass[r.status]}>
                          {RETURN_STATUS_LABELS[r.status as ReturnStatus] || r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {format(new Date(r.created_at), "d MMM yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-16 h-8 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="ml-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage || isLoading}
                    className="h-8 rounded-lg text-xs gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNextPage || isLoading}
                    className="h-8 rounded-lg text-xs gap-1"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
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

      {/* Return Detail Dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="capitalize">{active.kind}</span> {shortId(active.order_id)}
                  <Badge variant="outline" className={statusClass[active.status]}>
                    {RETURN_STATUS_LABELS[active.status as ReturnStatus] || active.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3.5 rounded-xl border border-border/50">
                  <Info
                    label="Customer"
                    value={active.customer?.name || active.customer?.full_name || "Customer"}
                  />
                  <Info label="Phone" value={active.customer?.phone || "—"} />
                  <Info label="Reason" value={active.reason} />
                  <Info
                    label="Refund Method"
                    value={`${cur}${Number(active.refund_amount).toLocaleString()} · ${
                      active.refund_method === "store_credit"
                        ? "Store Credit Wallet"
                        : active.refund_method === "original_payment"
                          ? "Original Payment"
                          : "No Refund"
                    }`}
                  />
                  <Info
                    label="Restock Policy"
                    value={
                      active.restock
                        ? active.restocked
                          ? "Done (Restocked)"
                          : "Auto-restock upon receipt"
                        : "No restock"
                    }
                  />
                  <Info
                    label="Created At"
                    value={format(new Date(active.created_at), "d MMM yyyy, HH:mm")}
                  />
                </div>

                {/* Returned Line Items */}
                <div className="rounded-xl border divide-y overflow-hidden">
                  <p className="bg-muted/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Returned Items
                  </p>
                  {asItems(active.items).map((i, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center px-3.5 py-2.5 text-xs"
                    >
                      <span className="truncate font-medium">
                        {i.name}
                        {i.variant ? ` · ${i.variant}` : ""} × {i.quantity}
                      </span>
                      <span className="font-semibold text-foreground">
                        {cur}
                        {(Number(i.price) * Number(i.quantity)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {active.notes && (
                  <p className="rounded-xl bg-muted/50 p-3 whitespace-pre-wrap text-xs text-muted-foreground border">
                    {active.notes}
                  </p>
                )}

                <div className="flex gap-2 text-xs pt-1">
                  {active.customer_user_id && (
                    <Link
                      to={`/admin/customers/${active.customer_user_id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      Open Customer Profile
                    </Link>
                  )}
                  <span className="text-muted-foreground">·</span>
                  <Link
                    to={`/admin/orders/${active.order_id}/invoice`}
                    className="text-primary hover:underline font-medium"
                  >
                    View Order Invoice
                  </Link>
                </div>
              </div>

              {/* Status Action Buttons */}
              {nextReturnStatuses(active.status as ReturnStatus).length > 0 && (
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 border-t mt-4">
                  {nextReturnStatuses(active.status as ReturnStatus).map((s) => (
                    <Button
                      key={s}
                      disabled={busy}
                      variant={s === "rejected" ? "outline" : "default"}
                      className="h-10 text-xs"
                      onClick={() => advance(active, s)}
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                      {s === "approved"
                        ? "Approve Request"
                        : s === "rejected"
                          ? "Reject Request"
                          : s === "received"
                            ? "Mark Received & Restock"
                            : "Complete & Deposit Refund"}
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
      <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground break-words mt-0.5">{value}</p>
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
      const res = await ordersApi.list({ search: q.trim(), limit: 10 });
      const list = res.orders || res.data || [];
      return list
        .filter(
          (o: any) =>
            ["delivered", "shipped", "confirmed"].includes(o.status) &&
            !o.trashedAt &&
            !o.trashed_at,
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
      toast.success("Return created successfully");
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
          <DialogTitle>New Return or Exchange</DialogTitle>
        </DialogHeader>
        {!order ? (
          <div className="space-y-3">
            <Label>Find the order</Label>
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type order # (e.g. 3F2A91C0)..."
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Only shipped, delivered, or confirmed orders can be returned.
            </p>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <div className="space-y-2">
              {matches.map((o: any) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setOrder(o);
                    setQty({});
                  }}
                  className="w-full flex justify-between items-center rounded-xl border p-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <span>
                    <span className="font-mono text-sm font-semibold">{shortId(o.id)}</span>
                    <span className="block text-xs text-muted-foreground capitalize">
                      {o.status} · {format(new Date(o.createdAt || o.created_at), "d MMM yyyy")}
                    </span>
                  </span>
                  <span className="font-semibold text-sm">
                    {cur}
                    {Number(o.totalAmount || o.total_amount).toLocaleString()}
                  </span>
                </button>
              ))}
              {q.trim().length >= 3 && !isFetching && matches.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No matching order found.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 border">
              <span className="font-mono text-sm font-semibold">{shortId(order.id)}</span>
              <button
                className="text-xs text-primary hover:underline font-medium"
                onClick={() => setOrder(null)}
              >
                Change Order
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["return", "exchange"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "h-11 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors",
                    kind === k
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/30",
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
                    <p className="text-sm font-medium truncate">
                      {i.name}
                      {i.variant ? ` · ${i.variant}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cur}
                      {Number(i.price).toLocaleString()} · purchased {i.quantity}
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
                      <SelectItem value="store_credit">Store Credit Wallet</SelectItem>
                      <SelectItem value="original_payment">Original Payment</SelectItem>
                      <SelectItem value="none">No Refund</SelectItem>
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
                <p className="text-sm font-medium">Restock items in inventory</p>
                <p className="text-xs text-muted-foreground">
                  Automatically restocks items upon marking as received
                </p>
              </div>
              <Switch checked={restock} onCheckedChange={setRestock} />
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private staff notes (optional)..."
              rows={2}
            />
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={onClose} className="h-11 sm:h-10">
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="h-11 sm:h-10">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create Return
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AdminReturns;
