import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Copy,
  DollarSign,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Ticket,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminRealtimeDashboard } from "@/hooks/useAdminRealtimeDashboard";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { couponsApi } from "@/lib/api/coupons";
import { useNavigate } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const emptyCoupon = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 0,
  min_order_amount: 0,
  max_discount_amount: null as number | null,
  usage_limit: null as number | null,
  is_active: true,
  expires_at: "",
};

const AdminCoupons = () => {
  useDocumentTitle("Coupons - Admin");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAdmin();
  useAdminRealtimeDashboard(isAdmin);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState(emptyCoupon);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      try {
        const res = await couponsApi.list();
        return (res?.data || []).map((c: any) => ({
          id: c.id,
          code: c.code,
          description: c.description || "",
          discount_type: c.discount_type || c.discountType || "percentage",
          discount_value:
            Number(c.discount_value !== undefined ? c.discount_value : c.discountValue) || 0,
          min_order_amount: c.min_order_amount !== undefined ? c.min_order_amount : c.minSpend,
          max_discount_amount:
            c.max_discount_amount !== undefined ? c.max_discount_amount : c.maxDiscount,
          usage_limit: c.usage_limit !== undefined ? c.usage_limit : c.usageLimit,
          used_count: c.used_count || c.usageCount || 0,
          is_active: c.is_active !== undefined ? c.is_active : (c.isActive ?? true),
          starts_at: c.starts_at || null,
          expires_at: c.expires_at || null,
          created_at: c.created_at || c.createdAt || new Date().toISOString(),
        })) as Coupon[];
      } catch (err) {
        console.error("Failed to fetch coupons:", err);
        return [] as Coupon[];
      }
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: data.discount_type === "free_delivery" ? 0 : data.discount_value,
        min_order_amount: data.min_order_amount || 0,
        max_discount_amount: data.max_discount_amount || null,
        usage_limit: data.usage_limit || null,
        is_active: data.is_active,
        expires_at: data.expires_at || null,
      };

      if (editingCoupon) {
        await couponsApi.update(editingCoupon.id, payload);
      } else {
        await couponsApi.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success(editingCoupon ? "Coupon updated" : "Coupon created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) =>
      toast.error(
        err.message?.includes("duplicate") ? "Coupon code already exists" : "Failed to save coupon",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await couponsApi.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon deleted");
    },
    onError: () => toast.error("Failed to delete coupon"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await couponsApi.update(id, { is_active: active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  const resetForm = () => {
    setFormData(emptyCoupon);
    setEditingCoupon(null);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || 0,
      max_discount_amount: coupon.max_discount_amount,
      usage_limit: coupon.usage_limit,
      is_active: coupon.is_active,
      expires_at: coupon.expires_at ? coupon.expires_at.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSubmit = () => {
    if (!formData.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (formData.discount_type !== "free_delivery" && formData.discount_value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }
    saveMutation.mutate(formData);
  };

  const getDiscountLabel = (c: Coupon) => {
    if (c.discount_type === "free_delivery") return "Free Delivery";
    if (c.discount_type === "percentage") return `${c.discount_value}% OFF`;
    return `৳${c.discount_value} OFF`;
  };

  const getTypeIcon = (type: string) => {
    if (type === "free_delivery") return <Truck className="h-4 w-4" />;
    if (type === "percentage") return <Percent className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const isExpired = (c: Coupon) => c.expires_at && new Date(c.expires_at) < new Date();
  const isUsedUp = (c: Coupon) => c.usage_limit !== null && c.used_count >= c.usage_limit;

  return (
    <AdminLayout title="Coupons" subtitle="Create and manage discount coupons">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          {
            key: "all",
            label: "Total Coupons",
            value: coupons.length,
            icon: Ticket,
            iconColor: "text-primary",
            iconBg: "bg-primary/10",
            bgClass: "bg-card border-border/70",
          },
          {
            key: "active",
            label: "Active",
            value: coupons.filter((c) => c.is_active && !isExpired(c) && !isUsedUp(c)).length,
            icon: ToggleRight,
            iconColor: "text-emerald-600 dark:text-emerald-400",
            iconBg: "bg-emerald-500/10",
            bgClass: "bg-card border-border/70",
          },
          {
            key: "expired",
            label: "Expired",
            value: coupons.filter((c) => isExpired(c)).length,
            icon: ToggleLeft,
            iconColor: "text-red-600 dark:text-red-400",
            iconBg: "bg-red-500/10",
            bgClass: "bg-card border-border/70",
          },
          {
            key: "used-up",
            label: "Used Up",
            value: coupons.filter((c) => isUsedUp(c)).length,
            icon: Check,
            iconColor: "text-amber-600 dark:text-amber-400",
            iconBg: "bg-amber-500/10",
            bgClass: "bg-card border-border/70",
          },
        ].map(({ key, label, value, icon: Icon, iconColor, iconBg, bgClass }) => (
          <div
            key={key}
            className={cn(
              "rounded-xl sm:rounded-2xl p-3 sm:p-4 border shadow-sm hover:shadow-md transition-all",
              bgClass,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight mb-0.5 sm:mb-1">
                  {label}
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{value}</p>
              </div>
              <div
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0",
                  iconBg,
                )}
              >
                <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end mb-4 sm:mb-6">
        <Dialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 min-h-[44px] sm:min-h-0">
              <Plus className="h-4 w-4" /> Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Coupon Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. SAVE20"
                    className="h-11 font-mono uppercase"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Discount Type</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(v) => setFormData({ ...formData, discount_type: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                      <SelectItem value="free_delivery">Free Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.discount_type !== "free_delivery" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      Discount Value {formData.discount_type === "percentage" ? "(%)" : "(৳)"}
                    </Label>
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_value: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-11"
                      min={0}
                      max={formData.discount_type === "percentage" ? 100 : 999999}
                    />
                  </div>
                  {formData.discount_type === "percentage" && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Max Discount (৳)</Label>
                      <Input
                        type="number"
                        value={formData.max_discount_amount ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_discount_amount: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="No limit"
                        className="h-11"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm">Description (optional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Summer sale 20% off"
                  className="h-11"
                  maxLength={200}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Min Order Amount (৳)</Label>
                  <Input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_order_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Usage Limit</Label>
                  <Input
                    type="number"
                    value={formData.usage_limit ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage_limit: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Expires On</Label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <Label className="text-sm">Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingCoupon ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No coupons yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first coupon to offer discounts to customers.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create Coupon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {coupons.map((coupon) => {
            const expired = isExpired(coupon);
            const usedUp = isUsedUp(coupon);
            const inactive = !coupon.is_active || expired || usedUp;

            return (
              <Card key={coupon.id} className={`transition-all ${inactive ? "opacity-60" : ""}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${inactive ? "bg-muted" : "bg-primary/10"}`}
                    >
                      {getTypeIcon(coupon.discount_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyCode(coupon.code, coupon.id)}
                          className="font-mono font-bold text-sm sm:text-base flex items-center gap-1.5 hover:text-primary transition-colors"
                        >
                          {coupon.code}
                          {copiedId === coupon.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                        <Badge variant={inactive ? "outline" : "default"} className="text-[10px]">
                          {getDiscountLabel(coupon)}
                        </Badge>
                        {expired && (
                          <Badge variant="destructive" className="text-[10px]">
                            Expired
                          </Badge>
                        )}
                        {usedUp && (
                          <Badge variant="destructive" className="text-[10px]">
                            Used Up
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {coupon.description || "No description"}
                        {coupon.min_order_amount ? ` • Min ৳${coupon.min_order_amount}` : ""}
                        {coupon.usage_limit
                          ? ` • ${coupon.used_count}/${coupon.usage_limit} used`
                          : ` • ${coupon.used_count} used`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={(c) => toggleMutation.mutate({ id: coupon.id, active: c })}
                        className="scale-90"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => openEdit(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this coupon?")) deleteMutation.mutate(coupon.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCoupons;
