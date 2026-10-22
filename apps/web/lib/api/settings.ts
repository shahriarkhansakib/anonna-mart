import { apiFetch } from "../api-client";

export interface SettingsData {
  storeSettings: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    currency?: string;
    taxRate?: number;
    aboutText?: string;
    socialLinks?: { facebook?: string; instagram?: string; youtube?: string };
    logoUrl?: string;
    faviconUrl?: string;
  };
  shippingSettings: {
    defaultCharge?: number;
    freeShippingThreshold?: number;
    enableFreeShipping?: boolean;
    estimatedDeliveryDays?: number;
    deliveryAreas?: string;
    courierName?: string;
  };
  orderSettings: {
    minOrderAmount?: number;
    maxOrderAmount?: number;
    autoCancelHours?: number;
    enableCOD?: boolean;
    enableOnlinePayment?: boolean;
    lowStockThreshold?: number;
    orderPrefix?: string;
  };
  notificationSettings?: {
    orderAlerts?: boolean;
    lowStockAlerts?: boolean;
    newCustomerAlerts?: boolean;
    emailNotifications?: boolean;
  };
  connectors?: {
    steadfast?: { apiKey?: string; secretKey?: string; enabled?: boolean };
    facebookPixel?: { pixelId?: string; enabled?: boolean };
    googleTagManager?: { containerId?: string; enabled?: boolean };
  };
}

export const settingsApi = {
  get: () => apiFetch<{ success: boolean; data: SettingsData }>("/api/settings"),
  getKey: <T = any>(key: string) =>
    apiFetch<{ success: boolean; data: { value: T } }>(
      `/api/settings?key=${encodeURIComponent(key)}`,
    ),
  post: (payload: { key?: string; value?: any } | Partial<SettingsData>) =>
    apiFetch<{ success: boolean; data: any }>("/api/settings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  save: (data: Partial<SettingsData>) =>
    apiFetch<{ success: boolean; data: any }>("/api/settings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
