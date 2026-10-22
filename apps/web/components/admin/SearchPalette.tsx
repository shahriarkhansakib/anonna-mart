'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, ShoppingBag, Users, ArrowRight, X } from 'lucide-react';
import { formatTaka } from '@/components/storefront/types';
import { useQuery } from '@tanstack/react-query';
import { productsApi, type ProductItem } from '@/lib/api/products';
import { ordersApi, type OrderItem } from '@/lib/api/orders';

export function SearchPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: productsRes } = useQuery({
    queryKey: ['palette-products'],
    queryFn: () => productsApi.list(),
    enabled: isOpen,
  });

  const { data: ordersRes } = useQuery({
    queryKey: ['palette-orders'],
    queryFn: () => ordersApi.list(),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();
  const products: ProductItem[] = productsRes?.data || [];
  const orders: OrderItem[] = ordersRes?.orders || ordersRes?.data || [];

  const filteredProducts = trimmed
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(trimmed) ||
            p.sku?.toLowerCase().includes(trimmed) ||
            p.category?.toLowerCase().includes(trimmed)
        )
        .slice(0, 4)
    : [];

  const filteredOrders = trimmed
    ? orders
        .filter(
          (o) =>
            (o.orderNumber && o.orderNumber.toLowerCase().includes(trimmed)) ||
            (o.customerName && o.customerName.toLowerCase().includes(trimmed)) ||
            (o.customerPhone && o.customerPhone.includes(trimmed))
        )
        .slice(0, 4)
    : [];

  const navigateTo = (path: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-950/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50">
          <Search className="w-5 h-5 text-brand-800 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, orders, customers, or SKU (Cmd/Ctrl + K)..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-sm focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Quick Nav Shortcuts */}
          {!trimmed && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quick Navigation
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => navigateTo('/admin/products')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-brand-900 text-xs font-bold text-slate-700 hover:text-brand-900 transition-colors"
                >
                  <Package className="w-4 h-4 text-brand-800" /> Products
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('/admin/orders')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-brand-900 text-xs font-bold text-slate-700 hover:text-brand-900 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-brand-800" /> Orders
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('/admin/customers')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-brand-900 text-xs font-bold text-slate-700 hover:text-brand-900 transition-colors"
                >
                  <Users className="w-4 h-4 text-brand-800" /> Customers
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-brand-900 text-xs font-bold text-slate-700 hover:text-brand-900 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 text-brand-800" /> Storefront
                </button>
              </div>
            </div>
          )}

          {/* Products Results */}
          {filteredProducts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Products ({filteredProducts.length})
              </p>
              <div className="space-y-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigateTo(`/admin/products?id=${p.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-brand-800 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-400">SKU: {p.sku} · {p.category}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-brand-950">{formatTaka(Number(p.price))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Orders Results */}
          {filteredOrders.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Orders ({filteredOrders.length})
              </p>
              <div className="space-y-1">
                {filteredOrders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => navigateTo(`/admin/orders?id=${o.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-brand-800 shrink-0" />
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-900">#{o.orderNumber || o.id}</p>
                        <p className="text-[11px] text-slate-400">{o.customerName} · {o.customerPhone}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-brand-900 capitalize">{o.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {trimmed && !filteredProducts.length && !filteredOrders.length && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching records found for "{trimmed}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
