import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";

export interface StoreInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  logoUrl: string;
  taxInclusive: boolean;
  taxLabel: string;
  taxId: string;
  legalName: string;
  invoicePrefix: string;
  invoiceFooter: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  PKR: "₨",
  AED: "AED ",
  SAR: "SAR ",
};

export const currencySymbol = (code?: string) =>
  code ? (CURRENCY_SYMBOLS[code.toUpperCase()] ?? `${code} `) : "৳";

export function useStoreInfo(enabled = true) {
  return useQuery({
    queryKey: ["store-info"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<StoreInfo> => {
      try {
        const res = await settingsApi.get();
        const store = res.data?.storeSettings || {};
        return {
          name: store.name || "Anonna Mart",
          email: store.email || "support@anonna.mart",
          phone: store.phone || "+880 1700-000000",
          address: store.address || "House 12, Road 4, Dhanmondi, Dhaka 1205",
          currency: store.currency || "BDT",
          taxRate: Number(store.taxRate) || 0,
          logoUrl: store.logoUrl || "/anonna-mart-logo.png",
          taxInclusive: false,
          taxLabel: "VAT",
          taxId: "",
          legalName: store.name || "Anonna Mart Ltd.",
          invoicePrefix: "AM-",
          invoiceFooter: "Thank you for shopping with Anonna Mart!",
        };
      } catch (err) {
        console.error("Failed to fetch store info:", err);
        return {
          name: "Anonna Mart",
          email: "support@anonna.mart",
          phone: "+880 1700-000000",
          address: "House 12, Road 4, Dhanmondi, Dhaka 1205",
          currency: "BDT",
          taxRate: 0,
          logoUrl: "/anonna-mart-logo.png",
          taxInclusive: false,
          taxLabel: "VAT",
          taxId: "",
          legalName: "Anonna Mart Ltd.",
          invoicePrefix: "AM-",
          invoiceFooter: "Thank you for shopping with Anonna Mart!",
        };
      }
    },
  });
}
