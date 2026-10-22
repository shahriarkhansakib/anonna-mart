export type SystemRole = "user" | "admin" | "super_admin";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface PetProfile {
  name: string;
  type: "dog" | "cat" | "bird" | "rabbit" | "other";
  breed?: string;
  age?: number;
  weightKg?: number;
  allergies?: string[];
}

export interface GrowMateProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  price: number;
  originalPrice: number | null;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GrowMateCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId?: string | null;
}

export interface GrowMateOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface GrowMateOrder {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  deliveryZoneId?: string | null;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  trackingCode?: string | null;
  courierName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: GrowMateOrderItem[];
}

export interface GrowMateDeliveryZone {
  id: string;
  name: string;
  district: string;
  standardFee: number;
  estimatedDeliveryHours: number;
  steadfastCityId?: number | null;
  steadfastZoneId?: number | null;
  isActive: boolean;
}

export interface GrowMateCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSpend?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
}

export interface GrowMateCMSArticle {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverImage: string | null;
  category: "nutrition" | "health" | "grooming" | "news";
  published: boolean;
  publishedAt?: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
