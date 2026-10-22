import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { incompleteOrdersApi, type IncompleteOrderItem } from "@/lib/api/incomplete-orders";
import { ordersApi } from "@/lib/api/orders";

export type IncompleteOrder = IncompleteOrderItem;

export function useIncompleteOrders() {
  const queryClient = useQueryClient();

  const { data: incompleteOrders = [], isLoading } = useQuery({
    queryKey: ["incomplete-orders"],
    queryFn: async () => {
      try {
        const res = await incompleteOrdersApi.list();
        return (res.data || []).map((o: any) => ({
          ...o,
          customer_name: o.customerName || o.customer_name,
          customer_phone: o.customerPhone || o.customer_phone,
          customer_email: o.customerEmail || o.customer_email,
          shipping_address: o.shippingAddress || o.shipping_address,
          total_amount: Number(o.totalAmount || o.total_amount || 0),
          created_at: o.createdAt || o.created_at,
          recovered_at: o.recoveredAt || o.recovered_at,
        }));
      } catch (err) {
        console.error("Failed to fetch incomplete orders:", err);
        return [];
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      await incompleteOrdersApi.update(id, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomplete-orders"] });
      toast.success("Incomplete order updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update incomplete order");
    },
  });

  const deleteIncompleteOrder = useMutation({
    mutationFn: async (id: string) => {
      await incompleteOrdersApi.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomplete-orders"] });
      toast.success("Record deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete record");
    },
  });

  const convertToOrder = useMutation({
    mutationFn: async (param: any) => {
      const order = param.order || param;
      const edited = param.editedData || {};
      const customerName = edited.customer_name || order.customerName || order.customer_name;
      const customerPhone = edited.customer_phone || order.customerPhone || order.customer_phone;
      const customerEmail = edited.customer_email || order.customerEmail || order.customer_email || "customer@example.com";
      const shippingAddress = edited.shipping_address || order.shippingAddress || order.shipping_address || "Pending customer confirmation";
      const totalAmount = param.grandTotal || order.totalAmount || order.total_amount || 0;

      await ordersApi.create({
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        totalAmount,
        subtotal: order.cart_total || order.totalAmount || order.total_amount || totalAmount,
        shippingFee: param.deliveryCharge || 60,
        items: order.items || [],
        status: "pending",
      });
      await incompleteOrdersApi.update(order.id, { status: "recovered" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomplete-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Converted to active order!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to convert to order");
    },
  });

  const orders = incompleteOrders.filter((o) => o.status !== "trashed");
  const trashedOrders = incompleteOrders.filter((o) => o.status === "trashed");

  const totalIncomplete = orders.filter((o) => o.status === "incomplete" || o.status === "pending").length;
  const totalRecovered = orders.filter((o) => o.status === "recovered").length;
  const totalTrashed = trashedOrders.length;
  const recoveryRate = orders.length ? Math.round((totalRecovered / orders.length) * 100) : 0;
  const lostRevenue = orders
    .filter((o) => o.status !== "recovered")
    .reduce((s, o) => s + (Number(o.totalAmount || o.total_amount) || 0), 0);
  const recoveredRevenue = orders
    .filter((o) => o.status === "recovered")
    .reduce((s, o) => s + (Number(o.totalAmount || o.total_amount) || 0), 0);

  return {
    incompleteOrders,
    orders,
    trashedOrders,
    isLoading,
    totalIncomplete,
    totalRecovered,
    totalTrashed,
    recoveryRate,
    lostRevenue,
    recoveredRevenue,
    trashOrder: (id: string) => updateStatus.mutateAsync({ id, status: "trashed" }),
    restoreOrder: (id: string) => updateStatus.mutateAsync({ id, status: "incomplete" }),
    permanentlyDelete: (id: string) => deleteIncompleteOrder.mutateAsync(id),
    convertOrder: (param: any) => convertToOrder.mutateAsync(param),
    isConverting: convertToOrder.isPending,
    updateStatus,
    deleteIncompleteOrder,
    convertToOrder,
  };
}
