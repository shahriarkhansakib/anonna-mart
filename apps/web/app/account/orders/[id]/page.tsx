import type { Metadata } from 'next';
import { OrderDetailsPage } from '@/components/customer-account/OrderDetailsPage';

export const metadata: Metadata = {
  title: 'Order Tracking & Details | Anonna Mart',
};

export default function OrderDetailsPageRoute() {
  return <OrderDetailsPage />;
}
