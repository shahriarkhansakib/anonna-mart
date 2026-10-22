"use client";

import { Printer, ShieldCheck, X } from "lucide-react";
import React from "react";
import { Logo } from "@/components/common/Logo";
import { formatTaka } from "@/components/storefront/types";
import type { OrderItem } from "@/lib/api/orders";

interface InvoicePrintModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePrintModal({ order, isOpen, onClose }: InvoicePrintModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = order.orderNumber || order.order_number || order.id;
  const items = order.items || [];
  const subtotal = Number(order.subtotal || 0);
  const shippingFee = Number(order.shippingFee || order.shipping_fee || 60);
  const discountAmount = Number(order.discountAmount || order.discount_amount || 0);
  const totalAmount = Number(
    order.totalAmount || order.total_amount || subtotal + shippingFee - discountAmount,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      {/* Invoice Modal Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-6 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Commercial Invoice
            </span>
            <span className="font-mono text-xs font-bold text-brand-900 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              #{invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-950 transition-colors"
            >
              <Printer className="w-4 h-4 text-gold-400" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div
          id="printable-invoice"
          className="p-8 sm:p-10 overflow-y-auto bg-white text-slate-800 print:p-0"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-8 border-b-2 border-brand-900 gap-6">
            <div>
              <Logo width={160} height={60} href={null} />
              <div className="mt-3 text-xs text-slate-500 leading-relaxed">
                <p className="font-semibold text-slate-700">Anonna Mart Limited</p>
                <p>Road 11, Banani, Dhaka-1213, Bangladesh</p>
                <p>BIN/VAT Registration: #88392019-BIN</p>
                <p>Hotline: +880 9612-889900 | care@anonnamart.com</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <h2 className="text-xl font-black text-brand-950 uppercase tracking-wider">
                COMMERCIAL INVOICE
              </h2>
              <div className="mt-2 space-y-1 text-xs">
                <p>
                  <span className="text-slate-400 font-medium">Invoice No:</span>{" "}
                  <span className="font-mono font-bold text-slate-900">#{invoiceNumber}</span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Date:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    {new Date(order.createdAt || Date.now()).toLocaleDateString("en-BD", {
                      dateStyle: "long",
                    })}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Payment Mode:</span>{" "}
                  <span className="font-bold text-brand-900">
                    {order.paymentMethod || "Cash on Delivery"}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Status:</span>{" "}
                  <span className="inline-block font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded capitalize">
                    {order.paymentStatus || order.status || "Pending"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Billed & Shipped To (Customer)
              </p>
              <h4 className="text-sm font-bold text-slate-900">{order.customerName}</h4>
              <p className="mt-1 text-slate-600">{order.shippingAddress}</p>
              <p className="mt-1 font-mono text-slate-700">Phone: {order.customerPhone}</p>
              {order.customerEmail && <p className="text-slate-500">{order.customerEmail}</p>}
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Courier & Logistics Details
              </p>
              <p className="font-semibold text-slate-900">
                {order.courierName || "Steadfast Courier Partner"}
              </p>
              {order.trackingCode && (
                <p className="mt-1">
                  <span className="text-slate-500">Tracking Code:</span>{" "}
                  <span className="font-mono font-bold text-brand-900">{order.trackingCode}</span>
                </p>
              )}
              {order.notes && <p className="mt-1 text-slate-500 italic">Notes: {order.notes}</p>}
            </div>
          </div>

          {/* Order Items Table */}
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5">Item Description</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Unit Price</th>
                <th className="py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length > 0 ? (
                items.map((item: any, idx: number) => {
                  const unitPrice = Number(item.unitPrice || item.price || 0);
                  const qty = Number(item.quantity || 1);
                  return (
                    <tr key={idx} className="py-3">
                      <td className="py-3 font-semibold text-slate-800">
                        {item.productName || item.name || "Product Item"}
                        {item.sku && (
                          <span className="block font-mono text-[10px] text-slate-400">
                            SKU: {item.sku}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700">{qty}</td>
                      <td className="py-3 text-right font-medium text-slate-600">
                        {formatTaka(unitPrice)}
                      </td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatTaka(unitPrice * qty)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-3 font-semibold text-slate-800">General Catalog Order Items</td>
                  <td className="py-3 text-center font-bold text-slate-700">1</td>
                  <td className="py-3 text-right font-medium text-slate-600">
                    {formatTaka(subtotal)}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-900">
                    {formatTaka(subtotal)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary Breakdown */}
          <div className="mt-6 border-t-2 border-slate-200 pt-4 flex flex-col items-end text-xs">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatTaka(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span className="font-semibold text-slate-900">{formatTaka(shippingFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span>-{formatTaka(discountAmount)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>Total Amount:</span>
                <span className="text-brand-950 font-black">{formatTaka(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-10 border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-800" />
              <span>Thank you for shopping with Anonna Mart!</span>
            </div>
            <p>Computer generated invoice, no physical signature required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
