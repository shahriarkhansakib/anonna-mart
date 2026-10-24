import { apiFetch } from "../api-client";

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  category?: string;
  price: number;
  originalPrice: number | null;
  compare_price?: number | null;
  comparePrice?: number | null;
  costPrice?: number | null;
  sku: string;
  stockQuantity: number;
  stock?: number;
  lowStockThreshold: number;
  images: string[];
  imageUrl?: string | null;
  image_url?: string | null;
  badge?: string | null;
  productType?: string | null;
  product_type?: string | null;
  discount?: number | null;
  isFeatured: boolean;
  is_featured?: boolean;
  isActive: boolean;
  is_active?: boolean;
  variants?: any[];
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface ProductCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  product_count?: number;
  is_active?: boolean;
}

export const productsApi = {
  list: (params?: { search?: string; categoryId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.categoryId) sp.set("categoryId", params.categoryId);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<{ success: boolean; data: ProductItem[] }>(`/api/products${qs}`);
  },
  get: (id: string) => apiFetch<{ success: boolean; data: ProductItem }>(`/api/products/${id}`),
  create: (data: Partial<ProductItem>) =>
    apiFetch<{ success: boolean; data: ProductItem }>("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProductItem>) =>
    apiFetch<{ success: boolean; data: ProductItem }>(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/products/${id}`, {
      method: "DELETE",
    }),
  batchStock: (updates: { id: string; stock: number }[]) =>
    apiFetch<{ success: boolean; count: number }>("/api/products/batch-stock", {
      method: "POST",
      body: JSON.stringify({ updates }),
    }),
  listCategories: () =>
    apiFetch<{ success: boolean; data: ProductCategoryItem[] }>("/api/products/categories/all"),
  createCategory: (data: { name: string; slug: string; description?: string }) =>
    apiFetch<{ success: boolean; data: ProductCategoryItem }>("/api/products/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeCategory: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/products/categories/${id}`, {
      method: "DELETE",
    }),
  getVariants: (id: string) =>
    apiFetch<{ success: boolean; data: any[] }>(`/api/products/${id}/variants`),
  updateVariants: (id: string, variants: any[]) =>
    apiFetch<{ success: boolean; data: any[]; totalStock: number }>(
      `/api/products/${id}/variants`,
      {
        method: "PUT",
        body: JSON.stringify({ variants }),
      },
    ),
};
