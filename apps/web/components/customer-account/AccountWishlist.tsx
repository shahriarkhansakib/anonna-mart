"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Heart, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CLOUDINARY_FALLBACK } from "@/lib/constants";
import { toast } from "sonner";
import { formatTaka } from "@/components/storefront/types";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type ProductItem, productsApi } from "@/lib/api/products";

export function AccountWishlist() {
  const { wishlistIds, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();

  const { data: productsResponse } = useQuery({
    queryKey: ["products"],
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
    <section
      className="rounded-3xl border border-border bg-card p-6 shadow-xs sm:p-8 text-card-foreground"
      aria-labelledby="wishlist-heading"
    >
      <div className="border-b border-border pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Saved Items</p>
        <h1 id="wishlist-heading" className="mt-1 text-2xl font-black text-foreground">
          My Wishlist ({wishedProducts.length})
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          All your saved favorite items for quick review and future purchasing.
        </p>
      </div>

      {wishedProducts.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wishedProducts.map((product) => {
            const image =
              product.images?.[0] || product.imageUrl || CLOUDINARY_FALLBACK.defaultProduct;
            return (
              <div
                key={product.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-3.5 transition hover:shadow-md hover:border-primary/40 text-card-foreground"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-rose-500 shadow-xs hover:bg-background hover:text-rose-600 border border-border/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-1 flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {product.category}
                    </span>
                    <Link
                      href={`/products/${encodeURIComponent(product.id)}`}
                      className="line-clamp-1 text-xs font-bold text-foreground hover:text-primary"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm font-black text-foreground">
                      {formatTaka(Number(product.price))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-14 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-bold text-foreground">Your wishlist is empty</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Browse our catalog and tap the heart icon on any product to save it here.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            Explore Catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
