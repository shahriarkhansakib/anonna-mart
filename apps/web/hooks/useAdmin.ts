import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { analyticsApi } from "@/lib/api/analytics";
import { ordersApi } from "@/lib/api/orders";
import { productsApi } from "@/lib/api/products";
import { usersApi } from "@/lib/api/users";
import { CLOUDINARY_FALLBACK } from "@/lib/constants";
import type { AdminOrder } from "@/types/database";

export type AppRole = "admin" | "super_admin" | "user";

export const useAdmin = () => {
  const { roles, isLoading: roleLoading, isAdmin, isClinicOwner, isDoctor } = useUserRole();

  return {
    userRoles: roles.map((r) => ({ role: r })),
    roleLoading,
    isAdmin,
    isClinicOwner,
    isDoctor,
    roles,
  };
};

export const useAdminStats = () => {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      try {
        const stats = await analyticsApi.getDashboardStats();
        return {
          totalProducts: stats.totalProducts || 0,
          totalOrders: stats.totalOrders || 0,
          activeOrders: stats.activeOrders || 0,
          cancelledOrders: stats.cancelledOrders || 0,
          totalUsers: stats.totalUsers || 0,
          activeRevenue: Number(stats.activeRevenue) || 0,
          totalRevenue: Number(stats.totalRevenue) || 0,
          cancelledRevenue: Number(stats.cancelledRevenue) || 0,
          pendingOrders: stats.pendingOrders || 0,
          recentOrders: stats.recentOrders || [],
        };
      } catch (err) {
        console.error("Failed to fetch admin stats from API:", err);
        return {
          totalProducts: 0,
          totalOrders: 0,
          activeOrders: 0,
          cancelledOrders: 0,
          totalUsers: 0,
          activeRevenue: 0,
          totalRevenue: 0,
          cancelledRevenue: 0,
          pendingOrders: 0,
          recentOrders: [],
        };
      }
    },
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,
  });
};

export const useAdminProducts = () => {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      try {
        const res = await productsApi.list();
        return (res?.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          price: Number(p.price) || 0,
          compare_price:
            p.compare_price !== undefined
              ? Number(p.compare_price)
              : p.originalPrice !== undefined
                ? Number(p.originalPrice)
                : null,
          category: p.category || p.categoryName || "General",
          product_type: p.product_type || p.productType || "Physical",
          image_url:
            p.image_url ||
            (Array.isArray(p.images) && p.images[0]) ||
            CLOUDINARY_FALLBACK.defaultProduct,
          images: p.images || [],
          stock: p.stock !== undefined ? Number(p.stock) : Number(p.stockQuantity || 0),
          badge: p.badge || null,
          discount: p.discount ? Number(p.discount) : null,
          is_active: p.is_active !== undefined ? !!p.is_active : p.isActive !== false,
          is_featured: p.is_featured !== undefined ? !!p.is_featured : !!p.isFeatured,
          sku: p.sku || "",
          created_at: p.created_at || p.createdAt || new Date().toISOString(),
        }));
      } catch (err) {
        console.error("Failed to fetch admin products from API:", err);
        return [];
      }
    },
    enabled: isAdmin,
  });
};

export const useAdminOrders = (
  page = 0,
  pageSize = 50,
  filters?: { status?: string; search?: string; time?: string },
) => {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ["admin-orders", page, pageSize, filters],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      try {
        const res = await ordersApi.list({
          ...filters,
          page: page + 1,
          pageSize,
        });
        const ordersList: AdminOrder[] = (res?.orders || res?.data || []).map((o: any) => ({
          id: o.id,
          user_id: o.userId || o.user_id || o.id,
          items: o.items || [],
          total_amount: Number(o.totalAmount || o.total_amount || 0),
          status: o.status || "pending",
          shipping_address: o.shippingAddress || o.shipping_address || "",
          created_at: o.createdAt || o.created_at || new Date().toISOString(),
          tracking_id: o.trackingCode || o.tracking_code || o.tracking_id || null,
          payment_method: o.paymentMethod || o.payment_method || "cod",
          payment_status: o.paymentStatus || o.payment_status || "pending",
          trashed_at: o.trashedAt || o.trashed_at || null,
          consignment_id: o.consignmentId || o.consignment_id || null,
          rejection_reason: o.rejectionReason || o.rejection_reason || null,
          courier_name: o.courierName || o.courier_name || null,
          tracking_url: o.trackingUrl || o.tracking_url || null,
          profile: o.profile || {
            full_name: o.customerName || o.customer_name || "Customer",
            phone: o.customerPhone || o.customer_phone || "",
          },
        }));

        const totalCount = res?.pagination?.totalCount ?? res?.totalCount ?? ordersList.length;
        const totalPages = res?.pagination?.totalPages ?? (Math.ceil(totalCount / pageSize) || 1);

        return {
          orders: ordersList,
          totalCount,
          totalPages,
          hasNextPage: res?.pagination?.hasNextPage ?? page + 1 < totalPages,
          hasPrevPage: res?.pagination?.hasPrevPage ?? page > 0,
          page,
          pageSize,
        };
      } catch (err) {
        console.error("Failed to fetch admin orders from API:", err);
        return {
          orders: [],
          totalCount: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          page,
          pageSize,
        };
      }
    },
    enabled: isAdmin,
  });
};

export const useAdminUsers = (page = 0, pageSize = 50) => {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ["admin-users", page, pageSize],
    queryFn: async () => {
      try {
        const res = await usersApi.list();
        const usersList = (res?.users || res?.data || []).map((u: any) => ({
          user_id: u.id || u.user_id,
          full_name: u.full_name || u.name,
          phone: u.phone || "",
          avatar_url: u.avatar_url || u.image || "",
          address: u.address || "",
          division: u.division || "",
          district: u.district || "",
          thana: u.thana || "",
          created_at: u.created_at || u.createdAt || new Date().toISOString(),
          user_roles: u.user_roles || [{ role: u.role || "user" }],
        }));

        return {
          users: usersList,
          totalCount: res?.totalCount || usersList.length,
          page,
          pageSize,
        };
      } catch (err) {
        console.error("Failed to fetch admin users from API:", err);
        return {
          users: [],
          totalCount: 0,
          page,
          pageSize,
        };
      }
    },
    enabled: isAdmin,
  });
};
