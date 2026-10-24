"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Heart,
  Loader2,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CustomerProfileMenu } from "@/components/common/CustomerProfileMenu";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type ProductCategoryItem, type ProductItem, productsApi } from "@/lib/api/products";
import { CLOUDINARY_FALLBACK } from "@/lib/constants";
import { ProductCard } from "./ProductCard";
import { CartDrawerPanel } from "./StorefrontPanels";
import { formatTaka, type StorefrontCategory, type StorefrontProduct } from "./types";

export function ProductListingPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const {
    items: cartItems,
    count: cartCount,
    subtotal: cartSubtotal,
    addItem,
    removeItem,
    updateQuantity,
  } = useCart();
  const { wishlistIds, isInWishlist, toggleWishlist } = useWishlist();

  // Load live catalog from PostgreSQL DB
  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(),
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productsApi.listCategories(),
  });

  const products: StorefrontProduct[] = useMemo(() => {
    const raw: ProductItem[] = productsResponse?.data || [];
    return raw.map((p) => {
      const primaryImage =
        p.images && p.images.length > 0
          ? p.images[0]
          : p.imageUrl || p.image_url || CLOUDINARY_FALLBACK.defaultProduct;
      return {
        id: p.id,
        name: p.name,
        category: p.category || "General",
        categoryId: p.categoryId,
        slug: p.slug,
        sku: p.sku,
        image: primaryImage,
        images: p.images || [primaryImage],
        description: p.description,
        price: Number(p.price) || 0,
        originalPrice: p.originalPrice || p.comparePrice || null,
        stock: p.stockQuantity ?? p.stock ?? 10,
        stockQuantity: p.stockQuantity ?? p.stock ?? 10,
        featured: Boolean(p.isFeatured ?? p.is_featured),
        discountActive: Boolean(p.discount || (p.originalPrice && p.originalPrice > p.price)),
        createdAt: p.createdAt || p.created_at,
        tags: [],
      };
    });
  }, [productsResponse]);

  const categories = useMemo(() => {
    const rawCats: ProductCategoryItem[] = categoriesResponse?.data || [];
    return rawCats.map((c) => c.name);
  }, [categoriesResponse]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "All" ||
        p.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
      const matchesQuery =
        !query ||
        [p.name, p.category, p.sku || "", ...(p.tags || [])].some((f) =>
          f.toLowerCase().includes(query),
        );
      return matchesCategory && matchesQuery;
    });
  }, [products, search, selectedCategory]);

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (requestedCategory) {
      setSelectedCategory(requestedCategory);
    }
  }, []);

  const handleAddToCart = (product: StorefrontProduct) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      stock: product.stock,
      category: product.category,
    });
    toast.success(`${product.name} added to cart`);
  };

  const cartLines = useMemo(
    () => cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [cartItems],
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo width={110} height={36} />
          <nav
            className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex"
            aria-label="Main navigation"
          >
            <Link href="/" className="transition hover:text-foreground">
              Home
            </Link>
            <Link
              href="/products"
              aria-current="page"
              className="font-bold text-emerald-700 dark:text-emerald-400"
            >
              All products
            </Link>
            <Link href="/account" className="transition hover:text-foreground">
              My account
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/account/wishlist"
              aria-label={`Wishlist, ${wishlistIds.length} items`}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition hover:bg-muted"
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
              aria-label={`Open cart, ${cartCount} items, subtotal ${formatTaka(cartSubtotal)}`}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition hover:bg-muted"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-emerald-700 dark:bg-emerald-500 px-1 text-center text-[10px] font-bold leading-4 text-white dark:text-emerald-950">
                  {cartCount}
                </span>
              )}
            </button>
            <CustomerProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#022c22] via-[#064e3b] to-[#0e4e3e] px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e8ce72]">
            The Anonna Collection
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Shop all products</h1>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-emerald-100/85">
                Thoughtful finds for your home, wardrobe, and everyday pantry.
              </p>
            </div>
            <p className="text-sm font-bold text-emerald-100">
              {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside
            className="rounded-2xl border border-border bg-card p-5 shadow-xs text-card-foreground"
            aria-label="Product filters"
          >
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <SlidersHorizontal
                className="h-4 w-4 text-emerald-700 dark:text-emerald-400"
                aria-hidden="true"
              />{" "}
              Categories
            </h2>
            <nav
              className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
              aria-label="Filter by category"
            >
              {["All", ...categories].map((category) => {
                const count =
                  category === "All"
                    ? products.length
                    : products.filter((p) => p.category.toLowerCase() === category.toLowerCase())
                        .length;
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={isSelected}
                    className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition lg:w-full sm:text-sm ${
                      isSelected
                        ? "bg-brand-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-brand-900"
                    }`}
                  >
                    <span>{category}</span>
                    <span
                      className={`text-xs ${isSelected ? "text-emerald-200" : "text-slate-400"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-5 hidden border-t border-slate-100 pt-5 lg:block">
              <Link
                href="/account/wishlist"
                className="inline-flex items-center gap-2 text-xs font-bold text-brand-900 hover:text-brand-700"
              >
                <Heart className="h-4 w-4" aria-hidden="true" /> Your wishlist{" "}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </aside>

          <section aria-labelledby="product-results-heading">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="product-results-heading" className="text-xl font-black text-slate-900">
                  {selectedCategory === "All" ? "Browse all products" : selectedCategory}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tap on any item to view complete details.
                </p>
              </div>
              <label className="relative block w-full sm:max-w-xs">
                <span className="sr-only">Search products</span>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </label>
            </div>

            {isLoadingProducts ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-brand-800" />
                <p className="text-sm font-medium text-slate-500">Loading catalog...</p>
              </div>
            ) : filteredProducts.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    wished={isInWishlist(product.id)}
                    onView={(item) => router.push(`/products/${encodeURIComponent(item.id)}`)}
                    onToggleWishlist={(id) => toggleWishlist(id, product.name)}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-slate-900">No products found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try searching for something else or reset your filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All");
                    setSearch("");
                  }}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-brand-900 px-4 text-xs font-bold text-brand-900 hover:bg-brand-50"
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {cartOpen && (
        <CartDrawerPanel
          products={products}
          cart={cartLines}
          onClose={() => setCartOpen(false)}
          onViewProduct={(product) => {
            setCartOpen(false);
            router.push(`/products/${encodeURIComponent(product.id)}`);
          }}
          onSetQuantity={(id, qty) => updateQuantity(id, qty)}
          onRemove={(id) => removeItem(id)}
        />
      )}
    </div>
  );
}
