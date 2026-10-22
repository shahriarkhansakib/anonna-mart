/**
 * Image optimization utilities for Supabase storage URLs
 * Appends transform parameters for server-side resizing
 */

const SUPABASE_STORAGE_PATTERN = /supabase\.co\/storage\/v1\/object\/public\//;

export type ImagePreset = "thumbnail" | "medium" | "full" | "avatar";

const PRESETS: Record<ImagePreset, { width: number; quality: number }> = {
  thumbnail: { width: 300, quality: 75 },
  medium: { width: 800, quality: 80 },
  full: { width: 1600, quality: 85 },
  avatar: { width: 400, quality: 80 },
};

/**
 * Returns an optimized URL for Supabase storage images.
 * For non-Supabase URLs, returns the original URL unchanged.
 */
export function getOptimizedUrl(
  url: string | null | undefined,
  preset: ImagePreset = "thumbnail",
): string {
  if (!url) return "";

  // Only transform Supabase storage URLs
  if (!SUPABASE_STORAGE_PATTERN.test(url)) return url;

  const { width, quality } = PRESETS[preset];

  // Strip existing transform params
  const baseUrl = url.split("?")[0];

  return `${baseUrl}?width=${width}&quality=${quality}`;
}

/**
 * Route prefetch map - lazy import functions for each route
 */
const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  "/admin": () => import("@/views/admin/AdminDashboard"),
  "/admin/analytics": () => import("@/views/admin/AdminAnalytics"),
  "/admin/products": () => import("@/views/admin/AdminProducts"),
  "/admin/orders": () => import("@/views/admin/AdminOrders"),
  "/admin/ecommerce-customers": () => import("@/views/admin/AdminEcommerceCustomers"),
  "/admin/coupons": () => import("@/views/admin/AdminCoupons"),
  "/admin/delivery-zones": () => import("@/views/admin/AdminDeliveryZones"),
  "/admin/incomplete-orders": () => import("@/views/admin/AdminIncompleteOrders"),
  "/admin/recovery-analytics": () => import("@/views/admin/AdminRecoveryAnalytics"),
  "/admin/settings": () => import("@/views/admin/AdminSettings"),
};

const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's JS chunk on hover/touch.
 * Idempotent — only fetches once per session.
 */
export function prefetchRoute(path: string): void {
  // Normalize path to match keys
  const key = Object.keys(routePrefetchMap).find((k) => path === k || path.startsWith(k + "/"));
  if (!key || prefetchedRoutes.has(key)) return;
  prefetchedRoutes.add(key);
  routePrefetchMap[key]();
}
