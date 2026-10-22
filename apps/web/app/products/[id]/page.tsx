import type { Metadata } from "next";
import { StandaloneProductDetailsPage } from "@/components/storefront/StandaloneProductDetailsPage";

export const metadata: Metadata = {
  title: "Product Details | Anonna Mart",
  description: "View product specifications, pricing, and order directly online.",
};

export default function ProductDetailPage() {
  return <StandaloneProductDetailsPage />;
}
