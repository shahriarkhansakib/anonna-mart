import type { Metadata } from 'next';
import { AccountOrders } from '@/components/customer-account/AccountOrders';

export const metadata: Metadata = {
  title: 'My Orders | Anonna Mart',
};

export default function AccountOrdersPageRoute() {
  return <AccountOrders />;
}
