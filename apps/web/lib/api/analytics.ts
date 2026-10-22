import { apiFetch } from "../api-client";

export interface AnalyticsOverview {
  totalRevenue: number;
  activeRevenue: number;
  cancelledRevenue: number;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockCount: number;
  totalCustomers?: number;
  totalUsers?: number;
  newUsersThisMonth?: number;
  averageOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  userGrowth: number;
  dailyTrends: { date: string; orders: number; revenue: number }[];
  orderStatusDistribution: { name: string; value: number; color: string }[];
  topProducts: {
    id: string;
    name: string;
    totalSold: number;
    revenue: number;
    category?: string;
    image_url?: string | null;
  }[];
  recentOrders?: any[];
  lowStockProducts?: {
    id: string;
    name: string;
    stock: number;
    price: number;
    image_url?: string | null;
  }[];
}

export const analyticsApi = {
  getOverview: () =>
    apiFetch<{ success: boolean; data: AnalyticsOverview }>("/api/analytics/overview"),
  getDashboardStats: () =>
    apiFetch<{
      totalProducts: number;
      totalOrders: number;
      activeOrders: number;
      cancelledOrders: number;
      totalUsers: number;
      activeRevenue: number;
      totalRevenue: number;
      cancelledRevenue: number;
      pendingOrders: number;
      recentOrders: any[];
    }>("/api/analytics/dashboard-stats"),
};
