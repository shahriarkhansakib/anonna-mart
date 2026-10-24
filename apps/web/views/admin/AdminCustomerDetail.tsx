import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  ShoppingBag,
  Trash2,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  type Segment,
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
  const [savingNote, setSavingNote] = useState(false);
  const [creditAmt, setCreditAmt] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [savingCredit, setSavingCredit] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [processingModeration, setProcessingModeration] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer", id],
    enabled: isAdmin && !!id,
    queryFn: async () => {
      if (!id) return { profile: null, orders: [], notes: [], credits: [], balance: 0 };
      const res = await usersApi.get(id);
      const resData = res.data;
      return {
        profile: resData.profile || resData,
        orders: resData.orders || [],
        notes: resData.notes || resData.customer_notes || [],
        credits: resData.credits || resData.store_credits || [],
        balance:
          resData.store_credit_balance ?? resData.balance ?? creditBalance(resData.credits ?? []),
      };
    },
  });

  const profile = data?.profile;
  const balance = data?.balance ?? creditBalance(data?.credits ?? []);

  // --- Add Staff Note ---
  const addNote = async () => {
    if (!note.trim() || !user || !id) return;
    setSavingNote(true);
    try {
      await usersApi.addNote(id, note.trim(), user.id);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      toast.success("Note saved successfully");
    } catch {
      toast.error("Could not save note");
    } finally {
      setSavingNote(false);
    }
  };

  // --- Delete Staff Note ---
  const delNote = async (nid: string) => {
    if (!id) return;
    try {
      await usersApi.deleteNote(id, nid);
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      toast.success("Note deleted");
    } catch {
      toast.error("Could not delete note");
    }
  };

  // --- Add / Deduct Store Credit ---
  const handleCreditTransaction = async (isDeduction = false) => {
    if (!user || !id) return;
    const rawAmt = Math.abs(Number(creditAmt));
    if (isNaN(rawAmt) || rawAmt <= 0) {
      return toast.error("Please enter a valid credit amount");
    }

    const amt = isDeduction ? -rawAmt : rawAmt;
    if (isDeduction && balance - rawAmt < 0) {
      return toast.error(`Cannot deduct ৳${rawAmt}. Current balance is ৳${balance}`);
    }

    setSavingCredit(true);
    try {
      const defaultReason = isDeduction ? "Store Credit Deduction" : "Store Courtesy Credit";
      await usersApi.addCredit(id, amt, (creditReason || defaultReason).trim(), user.id);
      toast.success(amt > 0 ? `Added ৳${rawAmt} store credit` : `Deducted ৳${rawAmt} store credit`);
      setCreditAmt("");
      setCreditReason("");
      qc.invalidateQueries({ queryKey: ["admin-store-credits"] });
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      qc.invalidateQueries({ queryKey: ["admin-ecommerce-customers"] });
    } catch (err: any) {
      toast.error(err?.message || "Could not process credit transaction");
    } finally {
      setSavingCredit(false);
    }
  };

  // --- Moderation: Ban Customer ---
  const handleBanCustomer = async () => {
    if (!id) return;
    setProcessingModeration(true);
    try {
      await usersApi.ban(id, banReason.trim() || "Administrative account suspension");
      toast.success("Customer account banned");
      setBanDialogOpen(false);
      setBanReason("");
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      qc.invalidateQueries({ queryKey: ["admin-ecommerce-customers"] });
    } catch {
      toast.error("Failed to ban account");
    } finally {
      setProcessingModeration(false);
    }
  };

  // --- Moderation: Unban Customer ---
  const handleUnbanCustomer = async () => {
    if (!id) return;
    setProcessingModeration(true);
    try {
      await usersApi.unban(id);
      toast.success("Customer account restored to active");
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      qc.invalidateQueries({ queryKey: ["admin-ecommerce-customers"] });
    } catch {
      toast.error("Failed to restore account");
    } finally {
      setProcessingModeration(false);
    }
  };

  const orders = data?.orders ?? [];
  const last = orders[0] ? parseShippingAddress(orders[0].shipping_address) : null;
  const name = profile?.full_name || profile?.name || last?.name || "Customer";
  const email = profile?.email || "";
  const phone = profile?.phone || last?.phone || "";
  const address =
    [profile?.address, profile?.thana, profile?.district, profile?.division]
      .filter(Boolean)
      .join(", ") ||
    last?.addressParts.join(", ") ||
    "";

  const activeOrders = orders.filter((o) => !["cancelled", "rejected"].includes(o.status || ""));
  const spent = activeOrders.reduce((s, o) => s + Number(o.total_amount), 0);
  const segments = customerSegments({
    order_count: activeOrders.length,
    total_spent: spent,
    last_order_date: activeOrders[0]?.created_at ?? null,
  });

  const isBanned = !!profile?.banned;

  return (
    <AdminLayout title={name} subtitle={`Customer profile · ${email || phone || "User"}`}>
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Button variant="ghost" asChild className="-ml-2 h-9 text-xs gap-1">
          <Link to="/admin/ecommerce-customers">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {isBanned ? (
            <Badge variant="destructive" className="gap-1 px-2.5 py-1 text-xs">
              <Ban className="h-3.5 w-3.5" />
              Banned Account
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 px-2.5 py-1 text-xs"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Active Account
            </Badge>
          )}

          {isBanned ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnbanCustomer}
              disabled={processingModeration}
              className="h-8 text-xs gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Restore Account
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBanDialogOpen(true)}
              disabled={processingModeration}
              className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Ban className="h-3.5 w-3.5" />
              Ban Account
            </Button>
          )}
        </div>
      </div>

      {/* Ban Reason Alert Banner if Banned */}
      {isBanned && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Account is banned:</strong> {profile?.ban_reason || "Administrative suspension"}
          </span>
        </div>
      )}

      {/* Segment Badges */}
      {segments.length > 0 && (
        <div className="flex gap-1.5 mb-4">
          {segments.map((g) => (
            <Badge key={g} variant="secondary" className="capitalize text-xs">
              {SEGMENT_LABELS[g]}
            </Badge>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          Loading customer record…
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 lg:gap-6">
          {/* Main Column */}
          <div className="space-y-4 min-w-0">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Total Orders", orders.length],
                ["Lifetime Spent (LTV)", `${cur}${spent.toLocaleString()}`],
                [
                  "Avg. Order Value",
                  `${cur}${activeOrders.length ? Math.round(spent / activeOrders.length).toLocaleString() : 0}`,
                ],
              ].map(([label, val]) => (
                <div key={label as string} className="surface p-4 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg sm:text-2xl font-bold truncate mt-1 text-foreground">
                    {val}
                  </p>
                </div>
              ))}
            </div>

            {/* Orders Table */}
            <section className="surface rounded-xl border border-border overflow-hidden">
              <div className="p-4 sm:p-5 pb-3 border-b border-border/60 flex items-center justify-between">
                <h2 className="font-semibold text-base">Order History ({orders.length})</h2>
              </div>

              {orders.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  No orders placed yet
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {orders.map((o: any) => (
                    <li key={o.id}>
                      <Link
                        to={`/admin/orders/${o.id}/invoice`}
                        className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-muted/60 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold group-hover:text-primary transition-colors flex items-center gap-1.5">
                            #{o.id.slice(0, 8).toUpperCase()}
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString()} ·{" "}
                            <span className="uppercase">{o.payment_method || "COD"}</span> ·{" "}
                            <span className="capitalize">{o.payment_status || "Unpaid"}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <Badge variant="outline" className="capitalize text-xs">
                            {o.status}
                          </Badge>
                          <span className="text-sm font-semibold">
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

          {/* Sidebar / Aside Column */}
          <aside className="space-y-4">
            {/* Contact & Address Card */}
            <section className="surface p-4 sm:p-5 space-y-3 rounded-xl border border-border text-sm">
              <div className="flex items-center gap-3 pb-2 border-b border-border/60">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-base truncate">{name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {profile?.role || "Customer"}
                  </p>
                </div>
              </div>

              {email && (
                <div className="flex items-center gap-2 text-muted-foreground truncate">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a href={`mailto:${email}`} className="hover:underline truncate">
                    {email}
                  </a>
                </div>
              )}

              {phone ? (
                <div className="flex items-center gap-2 text-primary">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${phone}`} className="hover:underline font-medium">
                    {phone}
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No phone recorded</p>
              )}

              {address ? (
                <div className="flex gap-2 text-muted-foreground text-xs pt-1">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>{address}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No shipping address recorded</p>
              )}
            </section>

            {/* Store Credit Wallet */}
            <section className="surface p-4 sm:p-5 space-y-3 rounded-xl border border-border">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h2 className="font-semibold flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-primary" />
                  Store Credit Wallet
                </h2>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {cur}
                  {balance.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={creditAmt}
                    onChange={(e) => setCreditAmt(e.target.value)}
                    placeholder="Amount (৳)"
                    className="w-28 text-sm h-9"
                  />
                  <Input
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="Reason (e.g. Refund, Loyalty)"
                    className="flex-1 text-sm h-9"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleCreditTransaction(false)}
                    disabled={savingCredit || !creditAmt}
                    className="flex-1 text-xs h-8 gap-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />+ Grant Credit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreditTransaction(true)}
                    disabled={savingCredit || !creditAmt || balance <= 0}
                    className="flex-1 text-xs h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    − Deduct Credit
                  </Button>
                </div>
              </div>

              {/* Credit Transactions Ledger */}
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Transaction Ledger ({data?.credits.length || 0})
                </p>
                {data?.credits.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No credit transactions</p>
                ) : (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                    {data?.credits.map((c: any) => {
                      const isNegative = Number(c.amount) < 0;
                      return (
                        <li
                          key={c.id}
                          className="flex justify-between items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 border border-border/40"
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-medium text-foreground block truncate">
                              {c.reason}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span
                            className={
                              isNegative
                                ? "text-destructive font-bold text-xs shrink-0"
                                : "text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0"
                            }
                          >
                            {isNegative ? "−" : "+"}
                            {cur}
                            {Math.abs(Number(c.amount)).toLocaleString()}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* Persistent Staff Notes */}
            <section className="surface p-4 sm:p-5 space-y-3 rounded-xl border border-border">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h2 className="font-semibold text-sm">Private Staff Notes</h2>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {data?.notes.length || 0}
                </Badge>
              </div>

              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add private staff observation about this customer..."
                className="text-xs rounded-lg"
              />
              <Button
                size="sm"
                onClick={addNote}
                disabled={!note.trim() || savingNote}
                className="w-full text-xs h-8"
              >
                {savingNote ? "Saving Note…" : "Save Customer Note"}
              </Button>

              <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {data?.notes.map((n: any) => (
                  <li
                    key={n.id}
                    className="rounded-xl bg-muted/60 border border-border/50 p-2.5 text-xs flex gap-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="whitespace-pre-wrap break-words text-foreground font-normal">
                        {n.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => delNote(n.id)}
                      className="text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100 transition-opacity self-start p-0.5"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}

      {/* Account Ban Confirmation Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Suspend Customer Account
            </DialogTitle>
            <DialogDescription>
              Suspending <strong>{name}</strong> will prevent them from signing in or placing new
              orders. Existing orders remain accessible in the admin panel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-foreground">Reason for Suspension</label>
            <Input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Fraudulent order attempts, abusive behavior"
              className="text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBanDialogOpen(false)}
              disabled={processingModeration}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBanCustomer}
              disabled={processingModeration}
            >
              {processingModeration ? "Suspending…" : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCustomerDetail;
