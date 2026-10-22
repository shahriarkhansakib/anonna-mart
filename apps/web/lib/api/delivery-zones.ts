import { apiFetch } from "../api-client";

export interface DeliveryZoneItem {
  id: string;
  name: string;
  zone_name?: string;
  zoneName?: string;
  district: string;
  standardFee: number;
  charge?: number;
  delivery_fee?: number;
  estimatedDeliveryHours?: number;
  estimated_days?: string | null;
  divisions?: string[];
  steadfastCityId?: number | null;
  steadfastZoneId?: number | null;
  isActive: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export const deliveryZonesApi = {
  list: () => apiFetch<{ success: boolean; data: DeliveryZoneItem[] }>("/api/delivery-zones"),
  create: (data: Partial<DeliveryZoneItem>) =>
    apiFetch<{ success: boolean; data: DeliveryZoneItem }>("/api/delivery-zones", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<DeliveryZoneItem>) =>
    apiFetch<{ success: boolean; data: DeliveryZoneItem }>(`/api/delivery-zones/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/delivery-zones/${id}`, {
      method: "DELETE",
    }),
};
