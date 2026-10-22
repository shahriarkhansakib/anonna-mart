export interface StorefrontProduct {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  slug?: string;
  sku?: string;
  image?: string;
  images?: string[];
  description?: string | null;
  price: number;
  originalPrice?: number | null;
  stock?: number;
  stockQuantity?: number;
  rating?: number;
  reviewsCount?: number;
  salesCount?: number;
  featured?: boolean;
  isFeatured?: boolean;
  discountActive?: boolean;
  createdAt?: string;
  tags?: string[];
}

export interface StorefrontCategory {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  description?: string | null;
}

export interface StorefrontBanner {
  id: string;
  title: string;
  image?: string;
  position?: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export function hasValidDiscount(product: StorefrontProduct): boolean {
  return Boolean(
    (product.discountActive || (product.originalPrice && product.originalPrice > product.price)) &&
      typeof product.originalPrice === "number" &&
      product.originalPrice > product.price,
  );
}

export function getDiscountPercent(product: StorefrontProduct): number {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

export function formatTaka(amount: number): string {
  return `৳${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(amount)}`;
}
