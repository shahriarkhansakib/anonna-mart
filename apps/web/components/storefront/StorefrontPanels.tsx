"use client";

import { Heart, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { ProductThumbnail } from "./ProductCard";
import { type CartLine, formatTaka, type StorefrontProduct } from "./types";

interface DrawerProps {
  products: StorefrontProduct[];
  onClose: () => void;
  onViewProduct: (product: StorefrontProduct) => void;
}

interface CartDrawerProps extends DrawerProps {
  cart: CartLine[];
  onSetQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

function DrawerFrame({
  title,
  onClose,
  children,
  labelledBy,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close panel"
        className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300"
      >
        <header className="flex min-h-16 items-center justify-between border-b border-slate-100 px-5">
          <h2 id={labelledBy} className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function CartDrawerPanel({
  products,
  cart,
  onClose,
  onViewProduct,
  onSetQuantity,
  onRemove,
}: CartDrawerProps) {
  const rows = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ product, quantity: line.quantity }] : [];
  });
  const subtotal = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const itemCount = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <DrawerFrame title={`Shopping cart (${itemCount})`} labelledBy="cart-title" onClose={onClose}>
      {rows.length ? (
        <>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
            {rows.map(({ product, quantity }) => (
              <li key={product.id} className="flex gap-3 py-4">
                <button
                  type="button"
                  onClick={() => onViewProduct(product)}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                  aria-label={`View ${product.name}`}
                >
                  <ProductThumbnail product={product} className="h-full w-full object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-brand-900">
                    {formatTaka(product.price)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => onSetQuantity(product.id, quantity - 1)}
                        aria-label={`Decrease ${product.name} quantity`}
                        className="inline-flex h-8 w-8 items-center justify-center hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span
                        className="min-w-8 text-center text-xs font-semibold"
                        aria-label={`Quantity ${quantity}`}
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSetQuantity(product.id, quantity + 1)}
                        disabled={quantity >= (product.stock || 999)}
                        aria-label={`Increase ${product.name} quantity`}
                        className="inline-flex h-8 w-8 items-center justify-center hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(product.id)}
                      aria-label={`Remove ${product.name} from cart`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 p-5 bg-slate-50/50">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal ({itemCount} items)</span>
              <span className="font-bold text-brand-950 text-base">{formatTaka(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Delivery charges, if applicable, are calculated at checkout.
            </p>
            <Link
              href="/checkout"
              onClick={onClose}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-900 px-4 text-sm font-bold text-white transition-all hover:bg-brand-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            >
              Continue to checkout
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <ShoppingBag className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="font-bold text-slate-900">Your cart is empty</p>
          <p className="mt-1 text-sm text-slate-500">
            Browse our collection and add your favorite items.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-950"
          >
            Start shopping
          </button>
        </div>
      )}
    </DrawerFrame>
  );
}

export function WishlistDrawer({
  products,
  onClose,
  onViewProduct,
  onToggleWishlist,
  onAddToCart,
  wishlistIds,
}: DrawerProps & {
  wishlistIds: string[];
  onToggleWishlist: (id: string) => void;
  onAddToCart: (product: StorefrontProduct) => void;
}) {
  const wishedProducts = products.filter((product) => wishlistIds.includes(product.id));

  return (
    <DrawerFrame
      title={`Wishlist (${wishedProducts.length})`}
      labelledBy="wishlist-title"
      onClose={onClose}
    >
      {wishedProducts.length ? (
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
          {wishedProducts.map((product) => (
            <li key={product.id} className="flex gap-3 py-4">
              <button
                type="button"
                onClick={() => onViewProduct(product)}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                aria-label={`View ${product.name}`}
              >
                <ProductThumbnail product={product} className="h-full w-full object-cover" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
                <p className="mt-1 text-sm font-bold text-brand-900">{formatTaka(product.price)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    className="text-xs font-semibold text-brand-800 underline underline-offset-2 hover:text-brand-950"
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product.id)}
                    className="text-xs font-semibold text-slate-400 underline underline-offset-2 hover:text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Heart className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="font-bold text-slate-900">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-slate-500">
            Tap the heart icon on any product to save it here.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-950"
          >
            Explore products
          </button>
        </div>
      )}
    </DrawerFrame>
  );
}

export function ProductDetails({
  product,
  wished,
  onClose,
  onToggleWishlist,
  onAddToCart,
}: {
  product: StorefrontProduct;
  wished: boolean;
  onClose: () => void;
  onToggleWishlist: (id: string) => void;
  onAddToCart: (product: StorefrontProduct) => void;
}) {
  const stock = product.stock ?? product.stockQuantity ?? 10;
  const soldOut = stock < 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close product details"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        className="relative grid w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2 animate-in zoom-in-95 duration-200"
      >
        <div className="relative aspect-square bg-slate-100 md:aspect-auto md:min-h-[420px]">
          <ProductThumbnail product={product} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="pr-8 text-xs font-bold uppercase tracking-wider text-brand-700">
            {product.category}
          </p>
          <h2
            id="product-details-title"
            className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl"
          >
            {product.name}
          </h2>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-brand-950">{formatTaka(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-slate-400 line-through">
                {formatTaka(product.originalPrice)}
              </span>
            )}
          </div>
          {product.description && (
            <p className="mt-4 text-sm leading-6 text-slate-600 line-clamp-4">
              {product.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                soldOut ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${soldOut ? "bg-rose-500" : "bg-emerald-500"}`}
              />
              {soldOut ? "Out of stock" : "In stock"}
            </span>
            {product.sku && (
              <span className="text-xs text-slate-400 font-mono">SKU: {product.sku}</span>
            )}
          </div>
          {product.tags && product.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto grid grid-cols-[1fr_auto] gap-3 pt-6">
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={soldOut}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 text-sm font-bold text-white transition-all hover:bg-brand-950 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <ShoppingBag className="h-4 w-4" />
              {soldOut ? "Out of stock" : "Add to cart"}
            </button>
            <button
              type="button"
              onClick={() => onToggleWishlist(product.id)}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wished}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
                wished
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-slate-200 text-slate-600 hover:text-rose-600"
              }`}
            >
              <Heart className={`h-5 w-5 ${wished ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
