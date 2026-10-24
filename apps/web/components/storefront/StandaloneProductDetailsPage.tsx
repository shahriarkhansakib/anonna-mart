"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  Home,
  Loader2,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CustomerProfileMenu } from "@/components/common/CustomerProfileMenu";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type ProductItem, productsApi } from "@/lib/api/products";
import { CLOUDINARY_FALLBACK } from "@/lib/constants";
import { ProductThumbnail } from "./ProductCard";
import { CartDrawerPanel } from "./StorefrontPanels";
import { formatTaka, getDiscountPercent, hasValidDiscount, type StorefrontProduct } from "./types";

export function StandaloneProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id || "";
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const {
    items: cartItems,
    count: cartCount,
    subtotal: cartSubtotal,
    addItem,
    removeItem,
    updateQuantity,
  } = useCart();
  const { wishlistIds, isInWishlist, toggleWishlist } = useWishlist();

  // Load product from PostgreSQL DB
  const {
    data: productResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productsApi.get(productId),
    enabled: Boolean(productId),
  });

  const { data: allProductsResponse } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(),
  });

  const product: StorefrontProduct | null = useMemo(() => {
    const raw: ProductItem | undefined = productResponse?.data;
    if (!raw) return null;
    const primaryImage =
      raw.images && raw.images.length > 0
        ? raw.images[0]
        : raw.imageUrl || raw.image_url || CLOUDINARY_FALLBACK.defaultProduct;
    return {
      id: raw.id,
      name: raw.name,
      category: raw.category || "General",
      categoryId: raw.categoryId,
      slug: raw.slug,
      sku: raw.sku,
      image: primaryImage,
      images: raw.images && raw.images.length > 0 ? raw.images : [primaryImage],
      description: raw.description,
      price: Number(raw.price) || 0,
      originalPrice: raw.originalPrice || raw.comparePrice || null,
      stock: raw.stockQuantity ?? raw.stock ?? 10,
      stockQuantity: raw.stockQuantity ?? raw.stock ?? 10,
      featured: Boolean(raw.isFeatured ?? raw.is_featured),
      discountActive: Boolean(raw.discount || (raw.originalPrice && raw.originalPrice > raw.price)),
      createdAt: raw.createdAt || raw.created_at,
      tags: [],
    };
  }, [productResponse]);

  const allProducts: StorefrontProduct[] = useMemo(() => {
    const rawList: ProductItem[] = allProductsResponse?.data || [];
    return rawList.map((p) => {
      const primaryImage =
        p.images && p.images.length > 0
          ? p.images[0]
          : p.imageUrl || p.image_url || CLOUDINARY_FALLBACK.defaultProduct;
      return {
        id: p.id,
        name: p.name,
        category: p.category || "General",
        image: primaryImage,
        images: p.images || [primaryImage],
        price: Number(p.price) || 0,
        originalPrice: p.originalPrice || null,
        stock: p.stockQuantity ?? 10,
      };
    });
  }, [allProductsResponse]);

  const handleAddToCart = (item: StorefrontProduct) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice,
      image: item.image,
      stock: item.stock,
      category: item.category,
    });
    toast.success(`${item.name} added to cart`);
  };

  const cartLines = useMemo(
    () => cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [cartItems],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F7F4]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-brand-800" />
          <p className="text-sm font-semibold text-slate-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <header className="border-b border-border bg-background/95 px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Logo width={154} height={68} className="!w-[130px]" />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <PackageCheck
            className="mx-auto h-12 w-12 text-emerald-700 dark:text-emerald-400"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-2xl font-black text-foreground">Product not found</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This product may have been moved, sold out, or the link might be incorrect.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Browse all products
          </Link>
        </main>
      </div>
    );
  }

  const stock = product.stock ?? 10;
  const soldOut = stock < 1;
  const hasDiscount = hasValidDiscount(product);
  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : [product.image || CLOUDINARY_FALLBACK.defaultProduct];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo width={110} height={36} />
          <nav
            className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/products" className="hover:text-foreground">
              Products
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="max-w-[200px] truncate text-foreground">{product.name}</span>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/account/wishlist"
              aria-label={`Wishlist, ${wishlistIds.length} items`}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlistIds.length > 0 && (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
                  {wishlistIds.length}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${cartCount} items`}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-brand-900 px-1 text-center text-[10px] font-bold leading-4 text-white">
                  {cartCount}
                </span>
              )}
            </button>
            <CustomerProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 transition hover:text-brand-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to catalog
          </Link>
        </div>

        <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 lg:p-10">
          {/* Gallery View */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-100">
              <Image
                src={galleryImages[activeImage] || galleryImages[0]}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              {hasDiscount && (
                <span className="absolute left-3 top-3 rounded-lg bg-gold-400 px-2.5 py-1 text-xs font-bold text-brand-950 shadow-xs">
                  {getDiscountPercent(product)}% OFF
                </span>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      activeImage === idx
                        ? "border-brand-900 ring-2 ring-brand-900/20"
                        : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Purchase */}
          <div className="flex flex-col">
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
              {product.category}
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black text-brand-950">
                {formatTaka(product.price)}
              </span>
              {hasDiscount && product.originalPrice && (
                <span className="text-base text-slate-400 line-through">
                  {formatTaka(product.originalPrice)}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  soldOut ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${soldOut ? "bg-rose-500" : "bg-emerald-500"}`}
                />
                {soldOut ? "Out of Stock" : `In Stock (${stock} available)`}
              </span>
              {product.sku && (
                <span className="font-mono text-xs text-slate-400">SKU: {product.sku}</span>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Description
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                {product.description || "No description available for this product."}
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => handleAddToCart(product)}
                disabled={soldOut}
                className="flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-900 px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-950 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <ShoppingBag className="h-4 w-4" />
                {soldOut ? "Currently Out of Stock" : "Add to Shopping Cart"}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id, product.name)}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
                  isInWishlist(product.id)
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-slate-200 text-slate-600 hover:text-rose-600"
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
              </button>
            </div>

            {/* Trust highlights */}
            <div className="mt-8 grid grid-cols-1 gap-3 border-t border-slate-100 pt-6 sm:grid-cols-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <Truck className="h-4 w-4 text-brand-800 shrink-0" />
                <span>Fast Steadfast Courier</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="h-4 w-4 text-brand-800 shrink-0" />
                <span>100% Authentic Guarantee</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <RefreshCcw className="h-4 w-4 text-brand-800 shrink-0" />
                <span>7-Day Return Policy</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {cartOpen && (
        <CartDrawerPanel
          products={allProducts}
          cart={cartLines}
          onClose={() => setCartOpen(false)}
          onViewProduct={(p) => {
            setCartOpen(false);
            router.push(`/products/${encodeURIComponent(p.id)}`);
          }}
          onSetQuantity={(id, qty) => updateQuantity(id, qty)}
          onRemove={(id) => removeItem(id)}
        />
      )}
    </div>
  );
}
