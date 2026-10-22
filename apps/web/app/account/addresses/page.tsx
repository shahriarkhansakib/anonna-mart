import type { Metadata } from 'next';
import { AccountAddresses } from '@/components/customer-account/AccountAddresses';

export const metadata: Metadata = {
  title: 'Saved Addresses | Anonna Mart',
};

export default function AccountAddressesPageRoute() {
  return <AccountAddresses />;
}
