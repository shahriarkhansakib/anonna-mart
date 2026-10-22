import type { Metadata } from 'next';
import { CheckoutPage } from '@/components/storefront/CheckoutPage';

export const metadata: Metadata = {
  title: 'Secure Checkout | Anonna Mart',
  description: 'Complete your order safely with cash on delivery and fast courier delivery across Bangladesh.',
};

export default function CheckoutPageRoute() {
  return <CheckoutPage />;
}
