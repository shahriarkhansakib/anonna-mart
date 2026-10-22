import type { Metadata } from 'next';
import { AccountWishlist } from '@/components/customer-account/AccountWishlist';

export const metadata: Metadata = {
  title: 'My Wishlist | Anonna Mart',
};

export default function AccountWishlistPageRoute() {
  return <AccountWishlist />;
}
