// Clean e-commerce notification stub
// Real audit logs and status histories are recorded transactionally on the backend
// in the order_status_history and audit_logs tables.

export interface OrderNotificationParams {
  userId?: string;
  orderId: string;
  status: "confirmed" | "shipped" | "delivered" | "cancelled" | "rejected" | string;
  orderTotal?: number;
  [key: string]: any;
}

export const createOrderNotification = async (params: OrderNotificationParams): Promise<void> => {
  // Status changes are audited on the Hono backend orders pipeline.
  // Frontend toast notifications are surfaced via sonner toast.
};
