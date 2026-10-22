import type { Metadata } from 'next';
import { CustomerAccountLayout } from '@/components/customer-account/CustomerAccountLayout';

export const metadata: Metadata = {
  title: 'My Account | Anonna Mart',
  description: 'Manage your Anonna Mart customer account, orders, addresses, and wishlist.',
};

export default function AccountLayoutRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerAccountLayout>{children}</CustomerAccountLayout>;
}
