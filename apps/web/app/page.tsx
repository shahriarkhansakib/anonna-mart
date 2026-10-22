'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Banknote,
  ArrowRight,
  Heart,
  Menu,
  RefreshCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { CustomerProfileMenu } from '@/components/common/CustomerProfileMenu';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ProductCard } from '@/components/storefront/ProductCard';
import {
  CartDrawerPanel,
  ProductDetails,
  WishlistDrawer,
} from '@/components/storefront/StorefrontPanels';
import {
  formatTaka,
  getDiscountPercent,
  hasValidDiscount,
  type StorefrontProduct,
  type StorefrontCategory,
} from '@/components/storefront/types';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { productsApi, type ProductItem, type ProductCategoryItem } from '@/lib/api/products';
import { toast } from 'sonner';

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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">{eyebrow}</p>
        <h2 id={headingId} className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function formatCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

// Category image map for visual showcases
const categoryImageMap: Record<string, string> = {
  'Home Decor': '/images/homedecor.jpeg',
  'Crockeries': '/images/crockeries.jpeg',
  'Women Dresses': '/images/dress.jpeg',
  'Grocery Items': '/images/grocery.jpeg',
  'Toiletries': '/images/toiletries.jpeg',
};

export default function StorefrontHomePage() {
  const pathname = usePathname();
  const { items: cartItems, count: cartCount, subtotal: cartSubtotal, addItem, removeItem, updateQuantity } = useCart();
  const { wishlistIds, isInWishlist, toggleWishlist } = useWishlist();

  // Load products and categories from PostgreSQL DB via API
  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.listCategories(),
  });

  // Map API items into StorefrontProduct
  const products: StorefrontProduct[] = useMemo(() => {
    const rawList: ProductItem[] = productsResponse?.data || [];
    return rawList.map((p) => {
      const primaryImage =
        p.images && p.images.length > 0
          ? p.images[0]
          : p.imageUrl || p.image_url || '/images/homedecor.jpeg';

      return {
        id: p.id,
        name: p.name,
        category: p.category || 'General',
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
      image: categoryImageMap[c.name] || '/images/homedecor.jpeg',
    }));
  }, [categoriesResponse]);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activePanel, setActivePanel] = useState<'cart' | 'wishlist' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const productsRef = useRef<HTMLElement>(null);

  // Filtered views
  const featuredProducts = useMemo(
    () => products.filter((p) => p.featured).slice(0, 4),
    [products]
  );

  const offerProducts = useMemo(
    () =>
      products
        .filter((p) => hasValidDiscount(p))
        .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a))
        .slice(0, 4),
    [products]
  );

  const newProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 4),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normQuery = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat =
        categoryFilter === 'All' ||
        p.category.trim().toLowerCase() === categoryFilter.trim().toLowerCase();
      const searchFields = [p.name, p.category, p.sku, ...(p.tags || [])];
      const matchesQuery =
        !normQuery ||
        searchFields.some((f) => f?.toLowerCase().includes(normQuery));
      return matchesCat && matchesQuery;
    });
  }, [categoryFilter, products, query]);

  // Sync hash for active nav highlight
  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  const scrollToProducts = () => {
    setMobileMenuOpen(false);
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showAllProducts = () => {
    setCategoryFilter('All');
    setQuery('');
    scrollToProducts();
  };

  const selectCategory = (categoryName: string) => {
    setCategoryFilter(categoryName);
    setQuery('');
    setMobileMenuOpen(false);
    scrollToProducts();
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryFilter('All');
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
    [cartItems]
  );

  const renderProductSection = (options: {
    id: string;
    title: string;
    eyebrow: string;
    description: string;
    items: StorefrontProduct[];
  }) => {
    if (!options.items.length) return null;
    return (
      <section
        id={options.id}
        className="scroll-mt-36 py-8 sm:py-10"
        aria-labelledby={`${options.id}-heading`}
      >
        <SectionHeading
          headingId={`${options.id}-heading`}
          eyebrow={options.eyebrow}
          title={options.title}
          description={options.description}
          action={
            <button
              type="button"
              onClick={showAllProducts}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-sm font-bold text-brand-800 transition-colors hover:text-brand-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:self-auto"
            >
              View all products <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          }
        />
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {options.items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              wished={isInWishlist(product.id)}
              onView={(item) => setSelectedProduct(item)}
              onToggleWishlist={(id) => toggleWishlist(id, product.name)}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground transition-colors duration-200">
      {/* Sticky Header */}
      <header id="top" className="sticky top-0 z-30 border-b border-border bg-background/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <Logo width={110} height={36} />

          {/* Desktop Search Bar */}
          <form
            role="search"
            onSubmit={handleSearch}
            className="hidden min-w-0 flex-1 items-center rounded-xl border border-border bg-muted/50 px-3.5 transition focus-within:border-emerald-600 focus-within:bg-card focus-within:ring-2 focus-within:ring-emerald-600/15 sm:flex"
          >
            <label className="sr-only" htmlFor="store-search">Search products</label>
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              id="store-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories or SKU..."
              className="h-9 sm:h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear product search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button type="submit" className="sr-only">Search</button>
          </form>

          {/* Action Icons & Profile */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setActivePanel('wishlist')}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label={`Open wishlist, ${wishlistIds.length} items`}
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlistIds.length > 0 && (
                <span className="absolute right-1 top-1 min-w-5 rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-5 text-white shadow-xs">
                  {formatCount(wishlistIds.length)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('cart')}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label={`Open cart, ${cartCount} items`}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 min-w-5 rounded-full bg-emerald-700 dark:bg-emerald-500 px-1 text-[10px] font-bold leading-5 text-white dark:text-emerald-950 shadow-xs">
                  {formatCount(cartCount)}
                </span>
              )}
            </button>

            <div className="hidden sm:block">
              <CustomerProfileMenu />
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 lg:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Secondary Subnav (Desktop) */}
        <div className="border-t border-slate-100 bg-white/70">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <nav className="hidden h-12 items-center gap-7 lg:flex" aria-label="Main navigation">
              {[
                ['Home', '#top'],
                ['Categories', '#categories'],
                ['All Products', '#products'],
                ...(featuredProducts.length > 0 ? [['Featured Picks', '#featured']] : []),
                ...(offerProducts.length > 0 ? [['Offers', '#offers']] : []),
                ['New Arrivals', '#new-arrivals'],
                ['About Us', '#about'],
              ].map(([label, href]) => {
                const active = pathname === '/' && (currentHash === href || (!currentHash && href === '#top'));
                return (
                  <a
                    key={label}
                    href={href}
                    className={`relative flex h-full items-center text-sm font-semibold transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-brand-900 after:transition-transform after:content-[''] ${
                      active
                        ? 'text-brand-900 after:scale-x-100'
                        : 'text-slate-600 after:scale-x-0 hover:text-brand-900 hover:after:scale-x-100'
                    }`}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>

            {/* Mobile Search Input */}
            <form role="search" onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center gap-2 py-2 sm:hidden">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-brand-700 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <nav className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden" aria-label="Mobile navigation">
              <div className="flex flex-col space-y-1">
                {[
                  ['Home', '#top'],
                  ['Categories', '#categories'],
                  ['All Products', '#products'],
                  ...(featuredProducts.length > 0 ? [['Featured Picks', '#featured']] : []),
                  ...(offerProducts.length > 0 ? [['Offers', '#offers']] : []),
                  ['New Arrivals', '#new-arrivals'],
                  ['About Us', '#about'],
                ].map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {label}
                  </a>
                ))}
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <CustomerProfileMenu />
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Luxury Hero Banner */}
        <section className="mt-4 overflow-hidden rounded-3xl bg-[#064e3b] shadow-xl sm:mt-6 lg:mt-8" aria-labelledby="hero-title">
          <div className="grid min-h-[350px] lg:grid-cols-[0.95fr_1.05fr] xl:min-h-[400px]">
            <div className="flex flex-col justify-center bg-[#fbf8ed] px-6 py-9 sm:px-10 sm:py-11 lg:px-10 xl:px-14">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#a87913]">
                PREMIUM PRODUCTS <span aria-hidden="true">•</span> HAPPIER LIVING
              </p>
              <h1 id="hero-title" className="mt-3 max-w-xl text-[2.5rem] font-black leading-[1.02] tracking-tight text-[#064e3b] sm:text-5xl xl:text-[3.5rem]">
                Fresh Finds
                <span className="block text-[#a87913]">for a Better You</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-700 sm:text-base">
                Quality products, trusted brands and everyday essentials — all curated in one place for your home and lifestyle.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                <a
                  href="#products"
                  onClick={scrollToProducts}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#064e3b] px-6 py-3 text-sm font-bold text-white shadow-md transition duration-200 hover:bg-emerald-950 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                >
                  Shop Now <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="#categories"
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-[#064e3b] underline decoration-[#064e3b]/30 underline-offset-4 transition-colors hover:decoration-[#064e3b]"
                >
                  Explore categories
                </a>
              </div>
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-semibold text-[#064e3b] sm:grid-cols-3 sm:text-xs">
                {[
                  { Icon: BadgeCheck, label: 'Authentic Products' },
                  { Icon: Truck, label: 'Fast & Reliable Delivery' },
                  { Icon: Heart, label: 'Your Choice, Our Care' },
                ].map(({ Icon, label }) => (
                  <li key={label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Icon className="h-4 w-4 shrink-0 text-[#a87913]" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative min-h-[260px] bg-[#064e3b] sm:min-h-[320px] lg:min-h-full">
              <Image
                src="/images/homedecor.jpeg"
                alt="A curated display of cozy Anonna Mart home decor and lifestyle essentials"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-center"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#064e3b]/30 via-transparent to-transparent" />
            </div>
          </div>
        </section>

        {/* Special Offer Highlight Strip */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-[#064e3b] text-white shadow-md sm:mt-5" aria-label="Special offer">
          <div className="grid lg:min-h-[140px] lg:grid-cols-[0.7fr_1.25fr_1fr]">
            <div className="relative min-h-[120px] bg-emerald-950 sm:min-h-[140px] lg:min-h-full">
              <Image
                src="/images/WhatsApp Image 2026-10-08 at 3.36.13 PM (1).jpeg"
                alt="Anonna Mart pantry products selected for the special offer"
                fill
                sizes="(max-width: 1024px) 100vw, 25vw"
                className="object-cover object-center"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent to-[#064e3b]/40 lg:bg-gradient-to-l" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5 sm:px-8 lg:py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#e5c76c]">Special offer</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Up to 30% OFF</h2>
                <p className="mt-0.5 text-xs text-white/85 sm:text-sm">Premium Quality Products for Everyday Living</p>
              </div>
              <a
                href={offerProducts.length ? '#offers' : '#products'}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#D4AF37] px-5 text-xs font-bold text-[#064e3b] transition-all hover:bg-[#e2c35a] hover:shadow-md sm:text-sm"
              >
                Shop the Offer <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
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

        {/* Shop by Category Section */}
        <section id="categories" className="scroll-mt-36 py-8 sm:py-10" aria-labelledby="categories-heading">
          <SectionHeading
            headingId="categories-heading"
            eyebrow="Browse by interest"
            title="Shop by category"
            description="Explore our handpicked collections designed for your everyday lifestyle."
          />
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => selectCategory(category.name)}
                className="group relative flex aspect-[4/3] min-w-0 items-end overflow-hidden rounded-2xl bg-brand-950 text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              >
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover opacity-75 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="absolute inset-0 bg-gradient-to-br from-brand-800 to-brand-950" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-brand-950/95 via-brand-950/20 to-transparent" />
                <span className="relative w-full p-3.5 text-sm font-bold leading-5 text-white sm:p-4">
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Dynamic Showcase Sections */}
        {renderProductSection({
          id: 'featured',
          title: 'Featured picks',
          eyebrow: 'Selected for you',
          description: 'Customer favourites chosen for superior quality and everyday value.',
          items: featuredProducts,
        })}

        {renderProductSection({
          id: 'offers',
          title: 'Special offers',
          eyebrow: 'Special savings',
          description: 'Take advantage of limited-time seasonal markdowns.',
          items: offerProducts,
        })}

        {renderProductSection({
          id: 'new-arrivals',
          title: 'New arrivals',
          eyebrow: 'Just arrived',
          description: 'Discover the latest hand-picked additions to our catalog.',
          items: newProducts,
        })}

        {/* All Products Section with Filter Pills */}
        <section ref={productsRef} id="products" className="scroll-mt-36 py-8 sm:py-10" aria-labelledby="products-heading">
          <SectionHeading
            headingId="products-heading"
            eyebrow="Explore the catalog"
            title="All products"
            description="Browse all essentials for your home, wardrobe and pantry."
            action={
              (query || categoryFilter !== 'All') ? (
                <button
                  type="button"
                  onClick={showAllProducts}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" /> Clear filters
                </button>
              ) : undefined
            }
          />

          {/* Filter Pills */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap gap-2" aria-label="Filter products by category">
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                aria-pressed={categoryFilter === 'All'}
                className={`min-h-10 rounded-full px-4 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:text-sm ${
                  categoryFilter === 'All'
                    ? 'bg-brand-900 text-white shadow-sm'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoryFilter(c.name)}
                  aria-pressed={categoryFilter === c.name}
                  className={`min-h-10 rounded-full px-4 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:text-sm ${
                    categoryFilter === c.name
                      ? 'bg-brand-900 text-white shadow-sm'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className="shrink-0 text-xs font-semibold text-slate-500" aria-live="polite">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </p>
          </div>

          {query && (
            <p className="mb-4 text-sm font-medium text-slate-600" aria-live="polite">
              Search results for “<span className="font-bold text-slate-900">{query}</span>”
            </p>
          )}

          {isLoadingProducts ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-800" />
              <p className="text-sm font-medium text-slate-500">Loading catalog from database...</p>
            </div>
          ) : filteredProducts.length ? (
            <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
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
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-slate-900">No matching products found</h3>
              <p className="mt-1 text-sm text-slate-500">Try searching for something else or reset your filters.</p>
              <button
                type="button"
                onClick={showAllProducts}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-900 px-5 text-sm font-bold text-white hover:bg-brand-950"
              >
                Show all products
              </button>
            </div>
          )}
        </section>

        {/* The Anonna Mart Promise Section */}
        <section id="about" className="scroll-mt-36 border-y border-slate-200 py-10 sm:py-12" aria-labelledby="about-heading">
          <SectionHeading
            headingId="about-heading"
            eyebrow="The Anonna Mart promise"
            title="Why Choose Anonna Mart"
            description="We are committed to delivering the best shopping experience across Bangladesh."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Truck, label: 'Free Delivery Over ৳1000' },
              { Icon: BadgeCheck, label: '100% Authentic Products' },
              { Icon: Banknote, label: 'Cash on Delivery Across BD' },
              { Icon: RefreshCcw, label: 'Easy 7-Day Returns' },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex min-h-20 items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-slate-900">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Luxury Footer with Leaf Accents */}
      <footer className="relative mt-8 overflow-hidden bg-[#064e3b] text-white">
        {/* Left Leaf Flourish */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-0 w-24 sm:w-44 lg:w-60">
          <div className="absolute inset-x-0 bottom-0 h-[200px] sm:top-0 sm:h-full">
            <Image
              src="/images/footer-leaves.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 176px, 96px"
              className="h-full w-full object-cover opacity-85 brightness-125 saturate-150 mix-blend-screen"
            />
          </div>
        </div>

        {/* Right Leaf Flourish */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-0 w-24 sm:w-44 lg:w-60">
          <div className="absolute inset-x-0 bottom-0 h-[200px] sm:top-0 sm:h-full">
            <Image
              src="/images/footer-leaves.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 176px, 96px"
              className="h-full w-full -scale-x-100 object-cover opacity-85 brightness-125 saturate-150 mix-blend-screen"
            />
          </div>
        </div>

        {/* Footer Main Content */}
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-[2fr_1.2fr_1fr] lg:px-8">
          <div>
            <Logo width={160} height={70} className="rounded-xl bg-white p-2" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/90">
              Thoughtful finds for everyday living. Trusted, authentic, and delivered straight to your door across Bangladesh.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#e5c76c]">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li><a href="#categories" className="hover:text-white transition-colors">Categories</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">All Products</a></li>
              {offerProducts.length > 0 && <li><a href="#offers" className="hover:text-white transition-colors">Special Offers</a></li>}
              <li><a href="#new-arrivals" className="hover:text-white transition-colors">New Arrivals</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#e5c76c]">Customer Support</h3>
            <div className="mt-3 space-y-2 text-sm text-white/80">
              <a className="block hover:text-white transition-colors" href="mailto:care@anonnamart.com">care@anonnamart.com</a>
              <a className="block hover:text-white transition-colors" href="tel:+8809612889900">+880 9612-889900</a>
              <p className="text-xs text-white/60">Road 11, Banani, Dhaka 1213</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-12 items-center justify-center border-t border-white/15 px-4 text-center text-xs text-white/75">
          © {new Date().getFullYear()} Anonna Mart. All rights reserved.
        </div>
      </footer>

      {/* Cart Drawer */}
      {activePanel === 'cart' && (
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
      {activePanel === 'wishlist' && (
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
