import type { Metadata } from 'next';
import { AccountProfile } from '@/components/customer-account/AccountProfile';

export const metadata: Metadata = {
  title: 'My Profile | Anonna Mart',
};

export default function AccountProfilePageRoute() {
  return <AccountProfile />;
}
