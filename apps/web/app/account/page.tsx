import type { Metadata } from "next";
import { AccountOverview } from "@/components/customer-account/AccountOverview";

export const metadata: Metadata = {
  title: "Account Overview | Anonna Mart",
};

export default function AccountPageRoute() {
  return <AccountOverview />;
}
