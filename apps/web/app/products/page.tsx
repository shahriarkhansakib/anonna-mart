import type { Metadata } from 'next';
import { ProductListingPage } from '@/components/storefront/ProductListingPage';

export const metadata: Metadata = {
  title: 'Shop All Products | Anonna Mart',
  description: 'Browse Anonna Mart’s curated collection of home decor, crockeries, dresses, groceries, and toiletries.',
};

export default function ProductsPage() {
  return <ProductListingPage />;
}
