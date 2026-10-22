import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import type { ShippingRule } from "@/lib/shippingRules";

export function useShippingRules(enabled = true) {
  return useQuery({
    queryKey: ["shipping-rules"],
    enabled,
    queryFn: async (): Promise<ShippingRule[]> => {
      try {
        const res = await settingsApi.getKey<ShippingRule[]>("shipping_rules");
        const val = res.data?.value;
        return Array.isArray(val) ? val : [];
      } catch {
        return [];
      }
    },
  });
}
