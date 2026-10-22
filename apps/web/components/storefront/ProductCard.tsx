"use client";

import { Heart, ShoppingBag, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { formatTaka, getDiscountPercent, hasValidDiscount, type StorefrontProduct } from "./types";

export function ProductImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className} flex items-center justify-center bg-brand-50 px-4 text-center text-sm font-semibold text-brand-800`}
      >
        Anonna Mart
      </div>
    );
  }

  if (src.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        className={className}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />
  );
}

interface ProductCardProps {
  product: StorefrontProduct;
  wished: boolean;
  onView: (product: StorefrontProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: StorefrontProduct) => void;
}

export function ProductCard({
  product,
  wished,
  onView,
  onToggleWishlist,
  onAddToCart,
}: ProductCardProps) {
  const hasDiscount = hasValidDiscount(product);
  const stock = product.stock ?? product.stockQuantity ?? 10;
  const soldOut = stock < 1;

  return (
    <article className="group flex h-full w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-emerald-600/50 hover:shadow-lg dark:hover:border-emerald-500/50">
      <div className="relative">
        <button
          type="button"
          onClick={() => onView(product)}
          className="relative block aspect-square w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
          aria-label={`View ${product.name}`}
        >
          <ProductImage
            src={product.image || product.images?.[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </button>

        {hasDiscount && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-gold-400 px-2 py-0.5 text-xs font-bold text-brand-950 shadow-sm">
            {getDiscountPercent(product)}% off
          </span>
        )}

        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-label={
            wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`
          }
          aria-pressed={wished}
          className={`absolute right-2.5 top-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card/90 backdrop-blur shadow-sm transition-colors hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            wished
              ? "border-rose-400 text-rose-500"
              : "border-border text-muted-foreground hover:text-rose-500"
          }`}
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <button
          type="button"
          onClick={() => onView(product)}
          className="mb-1 line-clamp-1 self-start text-left text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          {product.category}
        </button>

        <button
          type="button"
          onClick={() => onView(product)}
          className="line-clamp-2 min-h-10 min-w-0 text-left text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          {product.name}
        </button>

        {typeof product.rating === "number" && (
          <p
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"
            aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}
          >
            <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-600" aria-hidden="true" />
            <span className="font-medium text-foreground">{product.rating.toFixed(1)}</span>
            {product.reviewsCount ? (
              <span className="text-muted-foreground">({product.reviewsCount})</span>
            ) : null}
          </p>
        )}

        <div className="mt-auto pt-3">
          <div className="flex min-h-7 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="whitespace-nowrap text-base font-extrabold text-foreground sm:text-lg">
              {formatTaka(product.price)}
            </span>
            {hasDiscount && product.originalPrice && (
              <span className="whitespace-nowrap text-xs text-muted-foreground line-through sm:text-sm">
                {formatTaka(product.originalPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={soldOut}
            className="mt-3 inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:text-sm"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
            {soldOut ? "Out of Stock" : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductThumbnail({
  product,
  className,
}: {
  product: StorefrontProduct;
  className: string;
}) {
  return (
    <ProductImage
      src={product.image || product.images?.[0]}
      alt={product.name}
      className={className}
    />
  );
}
