import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Loader2,
  Search,
  ShoppingBag,
  User,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminRealtimeDashboard } from "@/hooks/useAdminRealtimeDashboard";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ordersApi } from "@/lib/api/orders";
import { type UserProfileItem, usersApi } from "@/lib/api/users";
import { downloadCSV } from "@/lib/csvParser";
import { SEGMENT_LABELS, type Segment } from "@/lib/customerSegments";
import { useNavigate } from "@/lib/router-compat";

type PaymentFilter = "all" | "paid" | "unpaid";

const SEGMENT_STYLE: Record<string, string> = {
  vip: "bg-primary/10 text-primary border-primary/20",
  high_spender: "bg-accent text-accent-foreground border-border",
  at_risk: "bg-destructive/10 text-destructive border-destructive/20",
  new: "bg-muted text-muted-foreground border-border",
};

const SegmentBadge = ({ s }: { s: string }) => {
  const style = SEGMENT_STYLE[s] || "bg-muted text-muted-foreground border-border";
  const label = SEGMENT_LABELS[s as Segment] || s.replace(/_/g, " ");
  return (
    <Badge
      variant="outline"
      className={`${style} text-[10px] px-1.5 py-0 font-medium border capitalize`}
    >
      {label}
    </Badge>
  );
};

// --- E-Commerce Role Badge ---
export const RoleBadge = ({ role }: { role: string }) => {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    super_admin: {
      label: "Super Admin",
      className:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      icon: <Building2 className="h-2.5 w-2.5" />,
    },
    admin: {
      label: "Admin",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: <User className="h-2.5 w-2.5" />,
    },
    staff: {
      label: "Staff",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: <Users className="h-2.5 w-2.5" />,
    },
    user: {
      label: "Customer",
      className: "bg-muted text-muted-foreground border-border",
      icon: <ShoppingBag className="h-2.5 w-2.5" />,
    },
  };
  const c = config[role] || config.user;
  return (
    <Badge
      variant="outline"
      className={`${c.className} text-[10px] px-1.5 py-0 font-medium gap-0.5 border`}
    >
      {c.icon}
      {c.label}
    </Badge>
  );
};

// --- Payment Status Badge (clickable) ---
const PaymentStatusBadge = ({
  status,
  onUpdate,
  loading,
}: {
  status: string;
  onUpdate: (newStatus: string) => void;
  loading: boolean;
}) => {
  const badgeClass =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : status === "refunded"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

  const label = status === "paid" ? "Paid" : status === "refunded" ? "Refunded" : "Unpaid";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button disabled={loading} className="focus:outline-none">
          <Badge
            className={`${badgeClass} cursor-pointer hover:opacity-80 transition-opacity capitalize`}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {["paid", "unpaid", "refunded"].map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onUpdate(s)}
            className={`capitalize ${s === status ? "font-bold" : ""}`}
          >
            {s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// --- Bulk Action Bar ---
const BulkActionBar = ({
  count,
  onClear,
  onBulkPayment,
  onExportSelected,
  loading,
}: {
  count: number;
  onClear: () => void;
  onBulkPayment: (status: string) => void;
  onExportSelected: () => void;
  loading: boolean;
}) => (
  <div className="flex items-center gap-2 flex-wrap bg-primary/5 border border-primary/20 rounded-xl p-2 sm:p-3 mb-4 animate-in slide-in-from-top-2">
    <span className="text-sm font-medium text-primary">{count} selected</span>
    <div className="flex gap-2 flex-wrap ml-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs gap-1"
            disabled={loading}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Update Payment
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {["paid", "unpaid", "refunded"].map((s) => (
            <DropdownMenuItem key={s} onClick={() => onBulkPayment(s)} className="capitalize">
              Mark as {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="sm"
        variant="outline"
        className="h-8 rounded-lg text-xs gap-1"
        onClick={onExportSelected}
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
      <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={onClear}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

const AdminEcommerceCustomers = () => {
  useDocumentTitle("E-Commerce Customers — GrowMate Admin Panel");
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { isAdmin } = useAdmin();
  useAdminRealtimeDashboard(isAdmin);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [segmentFilter, setSegmentFilter] = useState<"all" | Segment>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, paymentFilter, segmentFilter, sortBy]);

  // Query server-side aggregated customer database
  const { data: customerResponse, isLoading } = useQuery({
    queryKey: [
      "admin-ecommerce-customers",
      page,
      pageSize,
      searchQuery,
      segmentFilter,
      paymentFilter,
      sortBy,
    ],
    queryFn: () =>
      usersApi.list({
        page,
        limit: pageSize,
        search: searchQuery,
        segment: segmentFilter,
        payment: paymentFilter,
        sortBy,
      }),
    enabled: isAdmin,
  });

  const customers = useMemo(() => customerResponse?.data || [], [customerResponse]);
  const stats = useMemo(
    () =>
      customerResponse?.stats || {
        totalCustomers: 0,
        totalSales: 0,
        paidSales: 0,
        pendingSales: 0,
        avgLtv: 0,
        totalCreditsOutstanding: 0,
      },
    [customerResponse],
  );

  const pagination = customerResponse?.pagination || {
    page: 1,
    pageSize: 25,
    totalCount: customers.length,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.user_id)));
    }
  }, [customers, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Update payment status for customer's latest order
  const updatePaymentStatus = useCallback(
    async (userId: string, newStatus: string) => {
      setUpdatingPayment(userId);
      try {
        const userRes = await usersApi.get(userId);
        const userOrders = userRes.data?.orders || [];
        const activeOrder = userOrders.find(
          (o: any) => o.status !== "cancelled" && o.status !== "rejected",
        );
        if (activeOrder) {
          await ordersApi.update(activeOrder.id, { paymentStatus: newStatus });
          queryClient.invalidateQueries({ queryKey: ["admin-ecommerce-customers"] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          toast.success(`Payment status set to ${newStatus}`);
        } else {
          toast.error("No active order found for this customer");
        }
      } catch {
        toast.error("Failed to update payment status");
      } finally {
        setUpdatingPayment(null);
      }
    },
    [queryClient],
  );

  // Bulk update
  const bulkUpdatePayment = useCallback(
    async (newStatus: string) => {
      if (!selectedIds.size) return;
      setBulkLoading(true);
      try {
        const ids = Array.from(selectedIds);
        for (const uid of ids) {
          const userRes = await usersApi.get(uid);
          const activeOrder = (userRes.data?.orders || []).find(
            (o: any) => o.status !== "cancelled" && o.status !== "rejected",
          );
          if (activeOrder) {
            await ordersApi.update(activeOrder.id, { paymentStatus: newStatus });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["admin-ecommerce-customers"] });
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        toast.success(`${ids.length} customers updated to ${newStatus}`);
        clearSelection();
      } catch {
        toast.error("Bulk update failed");
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, queryClient, clearSelection],
  );

  // Export
  const exportCustomers = useCallback((data: UserProfileItem[]) => {
    if (!data.length) return;
    const headers = [
      "Customer Name",
      "Email",
      "Phone",
      "Segment",
      "Orders Count",
      "Total Spent (BDT)",
      "Store Credit (BDT)",
      "Payment Method",
      "Payment Status",
      "Last Order Date",
      "Joined Date",
    ];
    const rows = data.map((c) => [
      c.full_name || c.name || "Unnamed",
      c.email || "",
      c.phone || "",
      c.segment ? SEGMENT_LABELS[c.segment as Segment] || c.segment : "New",
      (c.order_count ?? c.orders_count ?? 0).toString(),
      (c.total_spent ?? 0).toFixed(2),
      (c.store_credit_balance ?? 0).toFixed(2),
      c.last_payment_method || "cod",
      c.last_payment_status || "unpaid",
      c.last_order_date ? format(new Date(c.last_order_date), "yyyy-MM-dd") : "Never",
      c.created_at ? format(new Date(c.created_at), "yyyy-MM-dd") : "",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    downloadCSV(csvContent, `ecommerce-customers-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success("Customers exported to CSV");
  }, []);

  const handleExportCSV = useCallback(
    () => exportCustomers(customers),
    [exportCustomers, customers],
  );

  const handleExportSelected = useCallback(() => {
    const selected = customers.filter((c) => selectedIds.has(c.user_id));
    exportCustomers(selected);
  }, [exportCustomers, customers, selectedIds]);

  const formatBDT = (amount: number) =>
    `৳${amount.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const isAllSelected = customers.length > 0 && selectedIds.size === customers.length;
  const startRange = (pagination.page - 1) * pagination.pageSize + 1;
  const endRange = Math.min(pagination.page * pagination.pageSize, pagination.totalCount);

  return (
    <AdminLayout title="E-Commerce Customers" subtitle="Payments, buyers & revenue overview">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <AdminStatCard
          label="Total Sales"
          value={formatBDT(stats.totalSales)}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-500/10"
          bgClass="bg-card border-border/70"
          active={paymentFilter === "all"}
          onClick={() => setPaymentFilter("all")}
        />
        <AdminStatCard
          label="Paid"
          value={formatBDT(stats.paidSales)}
          icon={CreditCard}
          iconColor="text-blue-600"
          iconBg="bg-blue-500/10"
          bgClass="bg-card border-border/70"
          active={paymentFilter === "paid"}
          onClick={() => setPaymentFilter("paid")}
        />
        <AdminStatCard
          label="Pending"
          value={formatBDT(stats.pendingSales)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-500/10"
          bgClass="bg-card border-border/70"
          active={paymentFilter === "unpaid"}
          onClick={() => setPaymentFilter("unpaid")}
        />
        <AdminStatCard
          label="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-500/10"
          bgClass="bg-card border-border/70"
        />
      </div>

      {/* Search + Filter + Export */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 sm:h-11 rounded-xl text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentFilter)}>
            <SelectTrigger className="w-[130px] sm:w-[140px] h-10 sm:h-11 rounded-xl text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] sm:w-[150px] h-10 sm:h-11 rounded-xl text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="total_spent">Highest Spent</SelectItem>
              <SelectItem value="order_count">Most Orders</SelectItem>
              <SelectItem value="credit">Store Credit</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={!customers.length}
            className="h-10 sm:h-11 rounded-xl text-sm gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Segment Pills */}
      <div className="flex gap-2 overflow-x-auto mb-4 -mx-1 px-1">
        {(["all", "vip", "high_spender", "at_risk", "new"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={segmentFilter === s ? "default" : "outline"}
            className="rounded-full shrink-0"
            onClick={() => setSegmentFilter(s)}
          >
            {s === "all" ? "All Customers" : SEGMENT_LABELS[s]}
          </Button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onClear={clearSelection}
          onBulkPayment={bulkUpdatePayment}
          onExportSelected={handleExportSelected}
          loading={bulkLoading}
        />
      )}

      {/* Result count */}
      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
        Showing {pagination.totalCount > 0 ? startRange : 0}–{endRange} of {pagination.totalCount}{" "}
        customers
      </p>

      {/* Table */}
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground font-medium">No customers found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search query or segment filters
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="sm:hidden divide-y divide-border">
              {customers.map((customer) => (
                <div key={customer.user_id} className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSelect(customer.user_id)}
                      className="flex-shrink-0 text-muted-foreground"
                    >
                      {selectedIds.has(customer.user_id) ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {(customer.full_name || customer.name || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/admin/customers/${customer.user_id}`)}
                        className="font-medium text-sm truncate text-left hover:text-primary block max-w-full"
                      >
                        {customer.full_name || customer.name || "Unnamed"}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {customer.phone || customer.email || "No phone"}
                      </p>
                    </div>
                    <PaymentStatusBadge
                      status={customer.last_payment_status || "unpaid"}
                      onUpdate={(s) => updatePaymentStatus(customer.user_id, s)}
                      loading={updatingPayment === customer.user_id}
                    />
                  </div>
                  {/* Segment & Role Badges */}
                  <div className="flex gap-1 flex-wrap pl-7">
                    {customer.segment && <SegmentBadge s={customer.segment} />}
                    {customer.banned && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Banned
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Orders</p>
                      <p className="font-semibold">
                        {customer.order_count ?? customer.orders_count ?? 0}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Spent</p>
                      <p className="font-semibold">{formatBDT(customer.total_spent ?? 0)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Credit</p>
                      <p className="font-semibold text-primary">
                        {formatBDT(customer.store_credit_balance ?? 0)}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Last order:{" "}
                    {customer.last_order_date
                      ? format(new Date(customer.last_order_date), "PP")
                      : "Never"}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {isAllSelected ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                        ) : (
                          <Circle className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Role & Segment</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.user_id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest("button"))
                          navigate(`/admin/customers/${customer.user_id}`);
                      }}
                    >
                      <TableCell>
                        <button
                          onClick={() => toggleSelect(customer.user_id)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {selectedIds.has(customer.user_id) ? (
                            <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                          ) : (
                            <Circle className="h-4.5 w-4.5" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {(customer.full_name || customer.name || "U")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm">
                                {customer.full_name || customer.name || "Unnamed"}
                              </p>
                              {customer.banned && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                  Banned
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {customer.phone || customer.email || "No phone"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <RoleBadge role={customer.role || "user"} />
                          {customer.segment && <SegmentBadge s={customer.segment} />}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {customer.order_count ?? customer.orders_count ?? 0}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatBDT(customer.total_spent ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {(customer.store_credit_balance ?? 0) > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatBDT(customer.store_credit_balance!)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="uppercase text-xs font-medium text-muted-foreground">
                          {customer.last_payment_method || "cod"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge
                          status={customer.last_payment_status || "unpaid"}
                          onUpdate={(s) => updatePaymentStatus(customer.user_id, s)}
                          loading={updatingPayment === customer.user_id}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.last_order_date
                          ? format(new Date(customer.last_order_date), "PP")
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Server-Side Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-2">
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
              <SelectItem value="100">100</SelectItem>
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
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <span className="text-xs px-2 font-medium">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNextPage || isLoading}
            className="h-8 rounded-lg text-xs gap-1"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEcommerceCustomers;
