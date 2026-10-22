'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
import { productsApi, type ProductItem } from '@/lib/api/products';
import { formatTaka } from '@/components/storefront/types';
import { toast } from 'sonner';

export function AccountWishlist() {
  const { wishlistIds, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();

  const { data: productsResponse } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  const products: ProductItem[] = productsResponse?.data || [];
  const wishedProducts = products.filter((p) => wishlistIds.includes(p.id));

  const handleAddToCart = (product: ProductItem) => {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      originalPrice: product.originalPrice,
      image: product.images?.[0] || product.imageUrl,
      stock: product.stockQuantity,
      category: product.category,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8" aria-labelledby="wishlist-heading">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Saved Items</p>
        <h1 id="wishlist-heading" className="mt-1 text-2xl font-black text-slate-900">
          My Wishlist ({wishedProducts.length})
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          All your saved favorite items for quick review and future purchasing.
        </p>
      </div>

      {wishedProducts.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wishedProducts.map((product) => {
            const image = product.images?.[0] || product.imageUrl || '/images/homedecor.jpeg';
            return (
              <div
                key={product.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                  <Image src={image} alt={product.name} fill className="object-cover transition-transform group-hover:scale-105" />
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm hover:bg-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-1 flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                      {product.category}
                    </span>
                    <Link
                      href={`/products/${encodeURIComponent(product.id)}`}
                      className="line-clamp-1 text-xs font-bold text-slate-900 hover:text-brand-900"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm font-black text-brand-950">
                      {formatTaka(Number(product.price))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-900 px-3 text-xs font-bold text-white hover:bg-brand-950"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center">
          <Heart className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 font-bold text-slate-900">Your wishlist is empty</h2>
          <p className="mt-1 text-xs text-slate-500">
            Browse our catalog and tap the heart icon on any product to save it here.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-900 px-5 text-xs font-bold text-white hover:bg-brand-950"
          >
            Explore Catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
