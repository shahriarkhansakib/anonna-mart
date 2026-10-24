"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  LayoutGrid,
  Loader2,
  Menu,
  Phone,
  RefreshCcw,
  Search,
  ShoppingCart,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CustomerProfileMenu } from "@/components/common/CustomerProfileMenu";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ProductCard } from "@/components/storefront/ProductCard";
import {
  CartDrawerPanel,
  ProductDetails,
  WishlistDrawer,
} from "@/components/storefront/StorefrontPanels";
import {
  formatTaka,
  getDiscountPercent,
  hasValidDiscount,
  type StorefrontCategory,
  type StorefrontProduct,
} from "@/components/storefront/types";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type ProductCategoryItem, type ProductItem, productsApi } from "@/lib/api/products";
import { CLOUDINARY_FALLBACK } from "@/lib/constants";

function SectionHeading({
  eyebrow,
  title,
  headingId,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  headingId: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
          {eyebrow}
        </p>
        <h2
          id={headingId}
          className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function formatCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

// Category image map for visual showcases
const categoryImageMap: Record<string, string> = CLOUDINARY_FALLBACK.categories;

// Subtitle context for departments
const categorySubtitleMap: Record<string, string> = {
  "Home Decor": "Lamps, Vases & Aesthetics",
  Crockeries: "Dining & Kitchen Essentials",
  "Women Dresses": "Three-Piece & Traditional",
  "Grocery Items": "Pure Honey, Ghee & Spices",
  Toiletries: "Personal Care & Hygiene",
};

export default function StorefrontHomePage() {
  const pathname = usePathname();
  const {
    items: cartItems,
    count: cartCount,
    subtotal: cartSubtotal,
    addItem,
    removeItem,
    updateQuantity,
  } = useCart();
  const { wishlistIds, isInWishlist, toggleWishlist } = useWishlist();

  // Load products and categories from PostgreSQL DB via API
  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(),
  });

  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productsApi.listCategories(),
  });

  // Map API items into StorefrontProduct
  const products: StorefrontProduct[] = useMemo(() => {
    const rawList: ProductItem[] = productsResponse?.data || [];
    return rawList.map((p) => {
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
        originalPrice: p.originalPrice || p.comparePrice || p.compare_price || null,
        stock: p.stockQuantity ?? p.stock ?? 10,
        stockQuantity: p.stockQuantity ?? p.stock ?? 10,
        featured: Boolean(p.isFeatured ?? p.is_featured),
        discountActive: Boolean(p.discount || (p.originalPrice && p.originalPrice > p.price)),
        createdAt: p.createdAt || p.created_at,
        tags: [],
      };
    });
  }, [productsResponse]);

  const categories: StorefrontCategory[] = useMemo(() => {
    const rawCats: ProductCategoryItem[] = categoriesResponse?.data || [];
    return rawCats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: categoryImageMap[c.name] || CLOUDINARY_FALLBACK.defaultProduct,
    }));
  }, [categoriesResponse]);

  const [query, setQuery] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activePanel, setActivePanel] = useState<"cart" | "wishlist" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const [showcaseTab, setShowcaseTab] = useState<"featured" | "offers" | "new" | "all">("featured");

  const productsRef = useRef<HTMLElement>(null);
  const showcaseScrollRef = useRef<HTMLDivElement>(null);

  const handleNewsletterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    toast.success("Thank you for subscribing to Anonna Mart offers!");
    setNewsletterEmail("");
  };

  // Filtered views
  const featuredProducts = useMemo(() => products.filter((p) => p.featured), [products]);

  const offerProducts = useMemo(
    () =>
      products
        .filter((p) => hasValidDiscount(p))
        .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a)),
    [products],
  );

  const newProducts = useMemo(
    () => [...products].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normQuery = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat =
        categoryFilter === "All" ||
        p.category.trim().toLowerCase() === categoryFilter.trim().toLowerCase();
      const searchFields = [p.name, p.category, p.sku, ...(p.tags || [])];
      const matchesQuery =
        !normQuery || searchFields.some((f) => f?.toLowerCase().includes(normQuery));
      return matchesCat && matchesQuery;
    });
  }, [categoryFilter, products, query]);

  // Active showcase items based on tab
  const activeShowcaseProducts = useMemo(() => {
    switch (showcaseTab) {
      case "featured":
        return featuredProducts.length > 0 ? featuredProducts : products.slice(0, 8);
      case "offers":
        return offerProducts.length > 0 ? offerProducts : products.slice(0, 8);
      case "new":
        return newProducts.length > 0 ? newProducts : products.slice(0, 8);
      case "all":
      default:
        return filteredProducts;
    }
  }, [showcaseTab, featuredProducts, offerProducts, newProducts, filteredProducts, products]);

  // Scroll carousel helper
  const scrollShowcase = (direction: "left" | "right") => {
    if (!showcaseScrollRef.current) return;
    const scrollAmount = showcaseScrollRef.current.clientWidth * 0.75;
    showcaseScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Sync hash for active nav highlight
  useEffect(() => {
    const updateHash = () => {
      const hash = window.location.hash;
      setCurrentHash(hash);
      if (hash === "#featured") setShowcaseTab("featured");
      else if (hash === "#offers") setShowcaseTab("offers");
      else if (hash === "#new-arrivals") setShowcaseTab("new");
      else if (hash === "#products") setShowcaseTab("all");
    };
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const scrollToProducts = () => {
    setMobileMenuOpen(false);
    productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showAllProducts = () => {
    setShowcaseTab("all");
    setCategoryFilter("All");
    setQuery("");
    scrollToProducts();
  };

  const selectCategory = (categoryName: string) => {
    setShowcaseTab("all");
    setCategoryFilter(categoryName);
    setQuery("");
    setMobileMenuOpen(false);
    scrollToProducts();
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowcaseTab("all");
    setCategoryFilter("All");
    setMobileMenuOpen(false);
    scrollToProducts();
  };

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

  // Convert cartItems to CartLine for drawer
  const cartLines = useMemo(
    () => cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [cartItems],
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-background pb-16 sm:pb-0 text-foreground transition-colors duration-200">
      {/* Top Announcement & Utility Bar */}
      <div className="border-b border-emerald-950/20 bg-[#064e3b] text-[11px] font-medium text-white/95">
        <div className="mx-auto flex h-8 sm:h-9 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-4 sm:gap-6 text-white/90">
            <li className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
              <span>Free Delivery on Orders Over ৳1,000</span>
            </li>
            <li className="hidden md:flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
              <span>Authentic Products</span>
            </li>
            <li className="hidden lg:flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
              <span>Cash on Delivery</span>
            </li>
            <li className="hidden xl:flex items-center gap-1.5">
              <RefreshCcw className="h-3.5 w-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
              <span>Easy Returns</span>
            </li>
          </ul>

          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <a
              href="tel:+8809612889900"
              className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
            >
              <Phone className="h-3 w-3 text-emerald-300 shrink-0" aria-hidden="true" />
              <span className="font-semibold">+880 9612-889900</span>
            </a>
            <span className="text-white/30 hidden sm:inline" aria-hidden="true">
              |
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 font-semibold text-white/90">
              <span role="img" aria-label="Bangladesh flag">
                🇧🇩
              </span>{" "}
              BD ৳
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Header */}
      <header
        id="top"
        className="sticky top-0 z-30 border-b border-border bg-background/95 shadow-xs backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
          <Logo width={110} height={36} />

          {/* Desktop Search Bar */}
          <form
            role="search"
            onSubmit={handleSearch}
            className="hidden min-w-0 flex-1 items-center rounded-full border border-border bg-muted/40 pl-4 pr-1.5 py-1 transition focus-within:border-emerald-600 focus-within:bg-card focus-within:ring-2 focus-within:ring-emerald-600/15 sm:flex"
          >
            <label className="sr-only" htmlFor="store-search">
              Search products
            </label>
            <input
              id="store-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, brands or categories..."
              className="h-9 min-w-0 flex-1 bg-transparent pr-2 text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground mr-1"
                aria-label="Clear product search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#064e3b] text-white hover:bg-emerald-950 transition-colors shadow-xs"
              aria-label="Submit search"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          {/* Action Icons & Profile */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setActivePanel("wishlist")}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label={`Open wishlist, ${wishlistIds.length} items`}
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlistIds.length > 0 && (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white shadow-xs">
                  {formatCount(wishlistIds.length)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActivePanel("cart")}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label={`Open cart, ${cartCount} items`}
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-emerald-700 dark:bg-emerald-500 px-1 text-[9px] font-bold leading-4 text-white dark:text-emerald-950 shadow-xs">
                  {formatCount(cartCount)}
                </span>
              )}
            </button>

            <ThemeToggle className="h-10 w-10 rounded-xl" />

            <div className="hidden sm:block">
              <CustomerProfileMenu />
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 lg:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Secondary Subnav (Desktop) — Clean, Spacious Navigation */}
        <div className="border-t border-border/40 bg-card/60 backdrop-blur-xs">
          <div className="mx-auto flex h-11 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <nav className="hidden h-full items-center gap-7 lg:flex" aria-label="Main navigation">
              {[
                { label: "Home", href: "#top", tab: null },
                { label: "Categories", href: "#categories", tab: null },
                { label: "Featured Picks", href: "#featured", tab: "featured" },
                { label: "Special Offers", href: "#offers", tab: "offers" },
                { label: "New Arrivals", href: "#new-arrivals", tab: "new" },
                { label: "All Products", href: "#products", tab: "all" },
                { label: "About Us", href: "#about", tab: null },
              ].map(({ label, href, tab }) => {
                const active =
                  pathname === "/" &&
                  (tab
                    ? showcaseTab === tab
                    : currentHash === href || (!currentHash && href === "#top"));
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (tab) {
                        setShowcaseTab(tab as any);
                        productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else {
                        const target = document.querySelector(href);
                        target?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className={`relative flex h-full items-center text-xs sm:text-sm font-medium transition-colors hover:text-[#064e3b] dark:hover:text-emerald-400 ${
                      active
                        ? "text-[#064e3b] dark:text-emerald-400 font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#064e3b] dark:after:bg-emerald-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Search Input */}
            <form
              role="search"
              onSubmit={handleSearch}
              className="flex min-w-0 flex-1 items-center gap-2 py-1.5 sm:hidden"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="min-h-9 w-full rounded-xl border border-border bg-muted/50 px-3 text-xs focus:border-emerald-600 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#064e3b] text-white"
                aria-label="Search"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <nav
              className="border-t border-border bg-card px-4 py-3 lg:hidden"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col space-y-1">
                {[
                  { label: "Home", href: "#top", tab: null },
                  { label: "Categories", href: "#categories", tab: null },
                  { label: "Featured Picks", href: "#featured", tab: "featured" },
                  { label: "Special Offers", href: "#offers", tab: "offers" },
                  { label: "New Arrivals", href: "#new-arrivals", tab: "new" },
                  { label: "All Products", href: "#products", tab: "all" },
                  { label: "About Us", href: "#about", tab: null },
                ].map(({ label, href, tab }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (tab) {
                        setShowcaseTab(tab as any);
                        productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else {
                        const target = document.querySelector(href);
                        target?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className="flex min-h-10 items-center text-left rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <CustomerProfileMenu />
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Luxury Hero Banner — Unified Lifestyle Composition */}
        <section
          className="relative mt-4 overflow-hidden rounded-3xl border border-emerald-950/10 shadow-sm sm:mt-6 lg:mt-8 min-h-[460px] sm:min-h-[500px] lg:min-h-[540px] flex items-center bg-[#fbf8ed]"
          aria-labelledby="hero-title"
        >
          {/* Background image covering entire hero */}
          <div className="absolute inset-0 z-0">
            <Image
              src={CLOUDINARY_FALLBACK.heroLifestyle}
              alt="Anonna Mart curated lifestyle collection, organic honey, turmeric, sarees, and home textiles"
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover object-[75%_center] sm:object-center"
            />
            {/* Soft left-side gradient to ensure text readability while preserving room aesthetics */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#fbf8ed] via-[#fbf8ed]/90 to-transparent sm:via-[#fbf8ed]/75 lg:via-[#fbf8ed]/55 lg:w-[62%]"
            />
          </div>

          {/* Script flourish in top-right */}
          <div
            aria-hidden="true"
            className="absolute right-6 top-6 z-10 hidden sm:block text-right select-none"
          >
            <p className="font-serif italic text-base sm:text-lg font-bold text-[#8a6e18] leading-tight drop-shadow-xs">
              Good Products
              <br />
              Brighter Days
            </p>
            <span className="inline-block text-[#8a6e18] text-base font-bold mt-0.5">♡</span>
          </div>

          {/* Left Text Content Area */}
          <div className="relative z-10 w-full max-w-xl px-6 py-10 sm:px-10 sm:py-14 lg:px-12 xl:px-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a87913]">
              PREMIUM PRODUCTS <span aria-hidden="true">•</span> HAPPIER LIVING
            </p>
            <h1
              id="hero-title"
              className="mt-3 text-[2.2rem] sm:text-4xl lg:text-5xl font-serif font-black leading-[1.12] tracking-tight text-[#064e3b]"
            >
              Stylish Everyday{" "}
              <span className="block text-[#a87913]">Shopping for a Better You</span>
            </h1>
            <p className="mt-3.5 max-w-lg text-sm sm:text-base leading-6 text-slate-800 font-medium">
              From your home to your kitchen, from fashion to wellness — Anonna Mart brings you
              quality products for a more beautiful, comfortable and healthier life.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              <button
                type="button"
                onClick={showAllProducts}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#064e3b] px-6 py-3 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Shop Now <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#categories"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-900/20 bg-[#fbf8ed]/90 backdrop-blur-xs px-5 py-3 text-sm font-bold text-[#064e3b] shadow-xs transition duration-200 hover:bg-white hover:border-[#064e3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              >
                <LayoutGrid className="h-4 w-4 text-[#a87913]" aria-hidden="true" />
                Explore Categories
              </a>
            </div>

            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-semibold text-[#064e3b] sm:grid-cols-3 sm:text-xs">
              {[
                { Icon: BadgeCheck, label: "Authentic Products" },
                { Icon: Truck, label: "Fast & Reliable Delivery" },
                { Icon: Heart, label: "Your Choice, Our Care" },
              ].map(({ Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Icon className="h-4 w-4 shrink-0 text-[#a87913]" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Special Offer Strip */}
        <section
          className="mt-4 overflow-hidden rounded-2xl bg-[#064e3b] text-white shadow-sm sm:mt-5"
          aria-label="Special offer"
        >
          <div className="grid lg:min-h-[130px] lg:grid-cols-[0.7fr_1.25fr_1fr]">
            <div className="relative min-h-[120px] bg-emerald-950 sm:min-h-[130px] lg:min-h-full">
              <Image
                src={CLOUDINARY_FALLBACK.specialOfferBanner}
                alt="Anonna Mart pantry products selected for the special offer"
                fill
                sizes="(max-width: 1024px) 100vw, 25vw"
                className="object-cover object-center"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-transparent to-[#064e3b]/40 lg:bg-gradient-to-l"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5 sm:px-8 lg:py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e5c76c]">
                  Special offer
                </p>
                <h2 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">
                  Up to 30% OFF
                </h2>
                <p className="mt-0.5 text-xs text-white/85 sm:text-sm">
                  Premium Quality Products for Everyday Living
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowcaseTab("offers");
                  productsRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#D4AF37] px-5 text-xs font-bold text-[#064e3b] transition-all hover:bg-[#e2c35a] shadow-xs sm:text-sm"
              >
                Shop the Offer <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ul className="grid gap-2 border-t border-white/15 px-6 py-4 text-xs font-medium text-white/90 sm:grid-cols-2 sm:px-8 sm:text-sm lg:grid-cols-1 lg:content-center lg:border-l lg:border-t-0 lg:px-6 lg:py-3">
              <li className="inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 shrink-0 text-[#e5c76c]" aria-hidden="true" />
                Great Prices on Selected Items
              </li>
              <li className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[#e5c76c]" aria-hidden="true" />
                Combo Deals Save More
              </li>
              <li className="inline-flex items-center gap-2">
                <ArrowRight className="h-4 w-4 shrink-0 text-[#e5c76c]" aria-hidden="true" />
                New Arrivals Every Week
              </li>
            </ul>
          </div>
        </section>

        {/* Shop by Category Section — With Safe Fallback Loading */}
        {(isLoadingCategories || categories.length > 0) && (
          <section
            id="categories"
            className="scroll-mt-36 py-8 sm:py-10"
            aria-labelledby="categories-heading"
          >
            <SectionHeading
              headingId="categories-heading"
              eyebrow="Browse by interest"
              title="Shop by category"
              description="Curated collections for your home, kitchen and wardrobe"
              action={
                <button
                  type="button"
                  onClick={showAllProducts}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 self-start text-xs sm:text-sm font-semibold text-emerald-800 transition-colors hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:self-auto dark:text-emerald-400"
                >
                  View All Categories <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              }
            />
            {isLoadingCategories ? (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] rounded-2xl bg-muted/60 animate-pulse border border-border/50"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => selectCategory(category.name)}
                    className="group relative flex aspect-[4/3] min-w-0 items-end overflow-hidden rounded-2xl bg-brand-950 text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                  >
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute inset-0 bg-gradient-to-br from-brand-800 to-brand-950" />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="relative flex w-full items-end justify-between p-3.5 sm:p-4">
                      <div>
                        <span className="block text-sm font-bold leading-5 text-white">
                          {category.name}
                        </span>
                        <span className="block text-[11px] font-medium text-white/80 line-clamp-1">
                          {categorySubtitleMap[category.name] || "Explore Collection"}
                        </span>
                      </div>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-all duration-200 group-hover:bg-[#064e3b] group-hover:text-white"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Anchors for Direct Navigation Links */}
        <div id="featured" className="scroll-mt-36" />
        <div id="offers" className="scroll-mt-36" />
        <div id="new-arrivals" className="scroll-mt-36" />
        <div id="products" className="scroll-mt-36" />

        {/* Unified Tabbed Product Showcase */}
        <section
          ref={productsRef}
          id="featured-showcase"
          className="scroll-mt-36 py-8 sm:py-10"
          aria-labelledby="featured-showcase-heading"
        >
          {/* Section Header with Eyebrow, Title and Desktop Carousel Controls */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Curated collection
              </p>
              <h2
                id="featured-showcase-heading"
                className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground"
              >
                Featured Products
              </h2>
              <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">
                Handpicked selections for your everyday lifestyle, kitchen and home living.
              </p>
            </div>

            {/* Desktop Carousel Controls */}
            {showcaseTab !== "all" && activeShowcaseProducts.length > 4 && (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => scrollShowcase("left")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  aria-label="Previous products"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollShowcase("right")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  aria-label="Next products"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Tab Filter Pills Bar — Clean, Minimal, Non-Flashy */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div
              className="flex flex-wrap items-center gap-1.5 sm:gap-2"
              role="tablist"
              aria-label="Product Showcase Tabs"
            >
              {[
                { key: "featured", label: "Featured" },
                { key: "offers", label: "Special Offers" },
                { key: "new", label: "New Arrivals" },
                { key: "all", label: "All Products" },
              ].map(({ key, label }) => {
                const isActive = showcaseTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setShowcaseTab(key as any);
                      if (key !== "all") {
                        setCategoryFilter("All");
                        setQuery("");
                      }
                    }}
                    className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      isActive
                        ? "bg-[#064e3b] text-white shadow-xs"
                        : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* View All or Clear filters action button */}
            {showcaseTab === "all" ? (
              (query || categoryFilter !== "All") && (
                <button
                  type="button"
                  onClick={showAllProducts}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowcaseTab("all");
                  showAllProducts();
                }}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 dark:text-emerald-400"
              >
                View all in catalog <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* If "All Products" is active, display Category Pills & Search metadata */}
          {showcaseTab === "all" && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="flex min-w-0 flex-wrap gap-2"
                aria-label="Filter products by category"
              >
                <button
                  type="button"
                  onClick={() => setCategoryFilter("All")}
                  aria-pressed={categoryFilter === "All"}
                  className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                    categoryFilter === "All"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-card text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategoryFilter(c.name)}
                    aria-pressed={categoryFilter === c.name}
                    className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      categoryFilter === c.name
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-card text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <p className="shrink-0 text-xs font-medium text-muted-foreground" aria-live="polite">
                Showing {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
              </p>
            </div>
          )}

          {query && showcaseTab === "all" && (
            <p className="mb-4 text-sm font-medium text-muted-foreground" aria-live="polite">
              Search results for “<span className="font-bold text-foreground">{query}</span>”
            </p>
          )}

          {/* Product Items Render Container */}
          {isLoadingProducts ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-800 dark:text-emerald-400" />
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Loading products...
              </p>
            </div>
          ) : activeShowcaseProducts.length ? (
            showcaseTab === "all" ? (
              /* Full Responsive Grid for All Products */
              <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {activeShowcaseProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    wished={isInWishlist(product.id)}
                    onView={setSelectedProduct}
                    onToggleWishlist={(id) => toggleWishlist(id, product.name)}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            ) : (
              /* Smooth Horizontal Snap Scroll Track + Desktop Grid for Curated Tabs */
              <div
                ref={showcaseScrollRef}
                className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:overflow-visible sm:pb-0"
              >
                {activeShowcaseProducts.map((product) => (
                  <div key={product.id} className="w-[260px] sm:w-auto shrink-0 snap-start">
                    <ProductCard
                      product={product}
                      wished={isInWishlist(product.id)}
                      onView={setSelectedProduct}
                      onToggleWishlist={(id) => toggleWishlist(id, product.name)}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <Search className="mx-auto h-9 w-9 text-muted-foreground/40" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-foreground text-sm sm:text-base">
                No matching products found
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Try selecting another category or clear your search query.
              </p>
              <button
                type="button"
                onClick={showAllProducts}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#064e3b] px-4 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-950 shadow-xs"
              >
                Reset catalog filters
              </button>
            </div>
          )}
        </section>

        {/* The Anonna Mart Promise Section */}
        <section
          id="about"
          className="scroll-mt-36 border-y border-border/60 py-10 sm:py-12"
          aria-labelledby="about-heading"
        >
          <SectionHeading
            headingId="about-heading"
            eyebrow="The Anonna Mart promise"
            title="Why Choose Anonna Mart"
            description="We are committed to delivering the best shopping experience across Bangladesh."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Truck, label: "Free Delivery Over ৳1000" },
              { Icon: BadgeCheck, label: "100% Authentic Products" },
              { Icon: Banknote, label: "Cash on Delivery Across BD" },
              { Icon: RefreshCcw, label: "Easy 7-Day Returns" },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex min-h-20 items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-xs"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Luxury Footer with Leaf Accents & Payment Seals */}
      <footer className="relative mt-8 overflow-hidden bg-[#064e3b] text-white">
        {/* Left Leaf Flourish */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-0 w-24 sm:w-44 lg:w-60"
        >
          <div className="absolute inset-x-0 bottom-0 h-[200px] sm:top-0 sm:h-full">
            <Image
              src={CLOUDINARY_FALLBACK.footerLeaves}
              alt=""
              fill
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 176px, 96px"
              className="h-full w-full object-cover opacity-85 brightness-125 saturate-150 mix-blend-screen"
            />
          </div>
        </div>

        {/* Right Leaf Flourish */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-0 w-24 sm:w-44 lg:w-60"
        >
          <div className="absolute inset-x-0 bottom-0 h-[200px] sm:top-0 sm:h-full">
            <Image
              src={CLOUDINARY_FALLBACK.footerLeaves}
              alt=""
              fill
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 176px, 96px"
              className="h-full w-full -scale-x-100 object-cover opacity-85 brightness-125 saturate-150 mix-blend-screen"
            />
          </div>
        </div>

        {/* Footer Main Content — 4 Columns */}
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4 sm:px-8 lg:px-8">
          <div>
            <Logo width={160} height={70} className="rounded-xl bg-white p-2" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/90">
              Thoughtful finds for everyday living. Trusted, authentic, and delivered straight to
              your door across Bangladesh.
            </p>
            <p className="mt-2 text-xs font-semibold text-[#e5c76c]">Your Choice, Our Care</p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#e5c76c]">
              Quick Links
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <a href="#top" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-white transition-colors">
                  All Categories
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setShowcaseTab("offers");
                    productsRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="hover:text-white transition-colors text-left"
                >
                  Special Offers
                </button>
              </li>
              <li>
                <Link href="/account/orders" className="hover:text-white transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <a href="mailto:care@anonnamart.com" className="hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#e5c76c]">
              Customer Service
            </h3>
            <div className="mt-3 space-y-2 text-sm text-white/80">
              <a className="block hover:text-white transition-colors" href="tel:+8809612889900">
                +880 9612-889900
              </a>
              <a
                className="block hover:text-white transition-colors"
                href="mailto:care@anonnamart.com"
              >
                care@anonnamart.com
              </a>
              <p className="text-xs text-white/70">Banani, Dhaka 1213, Bangladesh</p>
              <p className="text-xs text-white/60">Cash on Delivery Available Across BD</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#e5c76c]">
              Stay Connected
            </h3>
            <div className="mt-3 flex items-center gap-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Anonna Mart on Facebook"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
              >
                <span className="font-bold text-xs">FB</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Anonna Mart on Instagram"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
              >
                <span className="font-bold text-xs">IG</span>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Anonna Mart on YouTube"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
              >
                <span className="font-bold text-xs">YT</span>
              </a>
            </div>

            <div className="mt-4">
              <p className="text-xs text-white/85">
                Subscribe to get the latest offers and updates.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="mt-2 flex flex-col gap-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email address"
                  className="min-h-9 w-full rounded-lg bg-white/15 px-3 text-xs text-white placeholder:text-white/60 border border-white/20 focus:border-[#D4AF37] focus:outline-none"
                  aria-label="Email address for newsletter"
                />
                <button
                  type="submit"
                  className="min-h-9 rounded-lg bg-[#D4AF37] px-4 text-xs font-bold text-[#064e3b] transition hover:bg-[#e2c35a] shadow-xs"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Trust & Payment Seals Strip */}
        <div className="relative z-10 border-t border-white/10 bg-black/20 py-4">
          <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-3 max-w-7xl px-6 sm:px-8 lg:px-8">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-white/80">
              <span className="font-medium text-white/95 mr-1">We Accept:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-[#E2136E] font-black text-xs shadow-xs tracking-tight">
                bKash
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-[#F7941D] font-black text-xs shadow-xs tracking-tight">
                Nagad
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-[#8C3494] font-black text-xs shadow-xs tracking-tight">
                Rocket
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-[#1A1F71] font-black text-xs shadow-xs tracking-tight">
                VISA
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-[#EB001B] font-black text-xs shadow-xs tracking-tight">
                Mastercard
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/40 text-emerald-200 font-medium text-xs shadow-xs">
                Cash on Delivery
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <span className="font-medium text-white/95">Delivery Partner:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white text-[#2B3990] font-bold text-xs shadow-xs">
                <Truck className="h-3.5 w-3.5 text-[#ED1C24]" aria-hidden="true" />
                Steadfast Courier
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-11 items-center justify-center border-t border-white/15 px-4 text-center text-xs text-white/70">
          © {new Date().getFullYear()} Anonna Mart. All rights reserved.
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation Dock */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex h-15 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md px-2 shadow-lg sm:hidden pb-safe"
        aria-label="Mobile Bottom Navigation"
      >
        <a
          href="#top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Home</span>
        </a>
        <a
          href="#categories"
          className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Categories</span>
        </a>
        <button
          type="button"
          onClick={() => {
            setShowcaseTab("all");
            productsRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Search</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePanel("wishlist")}
          className="relative flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
          aria-label={`Wishlist, ${wishlistIds.length} items`}
        >
          <Heart className="h-5 w-5" aria-hidden="true" />
          {wishlistIds.length > 0 && (
            <span className="absolute -top-1 right-2 min-w-4 rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white">
              {wishlistIds.length}
            </span>
          )}
          <span className="text-[10px] font-medium">Wishlist</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePanel("cart")}
          className="relative flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
          aria-label={`Cart, ${cartCount} items`}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          {cartCount > 0 && (
            <span className="absolute -top-1 right-2 min-w-4 rounded-full bg-emerald-700 dark:bg-emerald-500 px-1 text-[9px] font-bold leading-4 text-white dark:text-emerald-950">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] font-medium">Cart</span>
        </button>
      </nav>

      {/* Cart Drawer */}
      {activePanel === "cart" && (
        <CartDrawerPanel
          products={products}
          cart={cartLines}
          onClose={() => setActivePanel(null)}
          onViewProduct={(product) => {
            setActivePanel(null);
            setSelectedProduct(product);
          }}
          onSetQuantity={(id, qty) => updateQuantity(id, qty)}
          onRemove={(id) => removeItem(id)}
        />
      )}

      {/* Wishlist Drawer */}
      {activePanel === "wishlist" && (
        <WishlistDrawer
          products={products}
          wishlistIds={wishlistIds}
          onClose={() => setActivePanel(null)}
          onViewProduct={(product) => {
            setActivePanel(null);
            setSelectedProduct(product);
          }}
          onToggleWishlist={(id) => toggleWishlist(id)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Product Quick-View Modal */}
      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          wished={isInWishlist(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onToggleWishlist={(id) => toggleWishlist(id, selectedProduct.name)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}
