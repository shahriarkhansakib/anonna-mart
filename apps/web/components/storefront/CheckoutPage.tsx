"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useCart } from "@/contexts/CartContext";
import { couponsApi } from "@/lib/api/coupons";
import { type DeliveryZoneItem, deliveryZonesApi } from "@/lib/api/delivery-zones";
import { ordersApi } from "@/lib/api/orders";
import { useSession } from "@/lib/auth-client";
import { CLOUDINARY_FALLBACK } from "@/lib/constants";
import { formatTaka } from "./types";

const inputClass =
  "min-h-12 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function CheckoutPage() {
  const router = useRouter();
  const sessionResult = useSession() as any;
  const user = sessionResult?.data?.user;
  const { items: cartItems, subtotal, clearCart } = useCart();

  // Contact & Delivery State
  const [recipient, setRecipient] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("zone-dhaka");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bkash" | "card">("cod");

  // Coupon State
  const [promoInput, setPromoInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
  } | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState(false);

  // Submission State
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  // Fetch Delivery Zones
  const { data: zonesResponse } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: () => deliveryZonesApi.list(),
  });

  const deliveryZones: DeliveryZoneItem[] = useMemo(() => {
    return (
      zonesResponse?.data || [
        {
          id: "zone-dhaka",
          name: "Inside Dhaka",
          district: "Dhaka",
          standardFee: 60,
          isActive: true,
        },
        {
          id: "zone-sub-dhaka",
          name: "Dhaka Suburbs",
          district: "Dhaka Sub",
          standardFee: 100,
          isActive: true,
        },
        {
          id: "zone-nationwide",
          name: "Nationwide (Outside Dhaka)",
          district: "All BD",
          standardFee: 150,
          isActive: true,
        },
      ]
    );
  }, [zonesResponse]);

  const selectedZone = useMemo(
    () => deliveryZones.find((z) => z.id === selectedZoneId) || deliveryZones[0],
    [deliveryZones, selectedZoneId],
  );

  const shippingFee = selectedZone ? Number(selectedZone.standardFee || 60) : 60;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);

  // Autofill user information if logged in
  useEffect(() => {
    if (user) {
      if (!recipient && user.name) setRecipient(user.name);
      if (!email && user.email) setEmail(user.email);
    }
  }, [user, recipient, email]);

  const applyPromoCode = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError(true);
      setPromoMessage("Please enter a coupon code.");
      return;
    }

    setIsApplyingPromo(true);
    setPromoError(false);
    setPromoMessage("");

    try {
      const res = await couponsApi.validate(code, subtotal);
      if (res?.success && res?.data) {
        setAppliedCoupon(res.data);
        setPromoMessage(
          `Coupon "${code}" applied successfully! You saved ${formatTaka(res.data.discountAmount)}.`,
        );
        toast.success(`Coupon ${code} applied`);
      } else {
        setPromoError(true);
        setPromoMessage("This coupon is invalid or conditions were not met.");
      }
    } catch (err: any) {
      setPromoError(true);
      setPromoMessage(err?.message || "Failed to validate coupon.");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const removePromoCode = () => {
    setAppliedCoupon(null);
    setPromoInput("");
    setPromoMessage("");
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");

    if (!cartItems.length) {
      setSubmitError("Your cart is empty. Add products before placing an order.");
      return;
    }
    if (!recipient.trim() || !deliveryAddress.trim() || !phone.trim()) {
      setSubmitError("Please complete your recipient name, phone number, and delivery address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerName: recipient.trim(),
        customerEmail: email.trim() || "customer@anonnamart.com",
        customerPhone: phone.trim(),
        shippingAddress: deliveryAddress.trim(),
        deliveryZoneId: selectedZoneId,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        })),
        subtotal,
        shippingFee,
        discountAmount,
        totalAmount,
        paymentMethod:
          paymentMethod === "cod"
            ? "Cash on Delivery"
            : paymentMethod === "bkash"
              ? "bKash"
              : "Card",
        paymentStatus: "pending",
        couponCode: appliedCoupon?.code || null,
        notes: `Selected Zone: ${selectedZone?.name || "Dhaka"}`,
      };

      const res = await ordersApi.create(orderPayload);
      if (res?.success && res?.data) {
        setConfirmedOrder(res.data);
        clearCart();
        toast.success("Order placed successfully!");
      } else {
        throw new Error("Could not create order. Please try again.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to place order. Please try again.");
      toast.error("Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If order was confirmed, show the Confirmation Screen
  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#F6F7F4] py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card text-card-foreground p-8 sm:p-10 shadow-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">Order Confirmed!</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thank you for shopping with Anonna Mart. We have received your order and our fulfillment
            team is preparing it for shipment.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-left space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-medium">Order Number:</span>
              <span className="font-mono font-bold text-brand-900">
                {confirmedOrder.orderNumber || confirmedOrder.id}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-medium">Recipient:</span>
              <span className="font-semibold text-slate-900">
                {confirmedOrder.customerName || recipient}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-medium">Delivery Address:</span>
              <span className="font-semibold text-slate-900 text-right max-w-xs truncate">
                {confirmedOrder.shippingAddress || deliveryAddress}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-medium">Delivery Zone:</span>
              <span className="font-semibold text-slate-900">{selectedZone?.name}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-medium">Payment Mode:</span>
              <span className="font-semibold text-emerald-800">
                {confirmedOrder.paymentMethod || "Cash on Delivery"}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm sm:text-base font-bold">
              <span>Total Payable:</span>
              <span className="text-brand-950 font-black">
                {formatTaka(confirmedOrder.totalAmount || totalAmount)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/account/orders"
              className="flex-1 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-900 px-5 text-sm font-bold text-white hover:bg-brand-950 shadow-sm"
            >
              View in My Orders
            </Link>
            <Link
              href="/products"
              className="flex-1 inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card text-card-foreground px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo width={110} height={36} />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <LockKeyhole className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span className="hidden sm:inline">Secure SSL Encrypted Checkout</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </Link>
          <h1 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">
            Checkout & Order Placement
          </h1>
        </div>

        {submitError && (
          <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
            {submitError}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
          {/* Left Form Column */}
          <form onSubmit={submitOrder} className="space-y-6">
            {/* Delivery & Contact Information */}
            <section className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-xs sm:p-8">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
                <MapPin className="h-5 w-5 text-brand-800" /> 1. Shipping & Contact Details
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field id="recipient" label="Recipient Full Name *">
                  <input
                    id="recipient"
                    required
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="e.g. Anisul Haque"
                    className={inputClass}
                  />
                </Field>

                <Field id="phone" label="Mobile Phone Number *">
                  <input
                    id="phone"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field id="email" label="Email Address (for order tracking & updates)">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="anisul@example.com"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field id="deliveryAddress" label="Delivery Street Address *">
                    <textarea
                      id="deliveryAddress"
                      required
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House, Road, Area, Ward/Thana, District"
                      className="min-h-20 w-full rounded-xl border border-border bg-card text-card-foreground px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/15"
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Delivery Zone Selection */}
            <section className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-xs sm:p-8">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
                <Truck className="h-5 w-5 text-brand-800" /> 2. Delivery Zone (Steadfast Courier)
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {deliveryZones.map((zone) => {
                  const selected = selectedZoneId === zone.id;
                  return (
                    <button
                      type="button"
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-brand-900 bg-brand-50/50 ring-2 ring-brand-900/15"
                          : "border-border bg-card text-card-foreground hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{zone.name}</span>
                          {selected && <Check className="h-4 w-4 text-brand-800" />}
                        </div>
                        <span className="mt-1 text-[11px] text-slate-500">
                          {zone.estimatedDeliveryHours
                            ? `Within ${zone.estimatedDeliveryHours} hrs`
                            : "24-72 hours"}
                        </span>
                      </div>
                      <span className="mt-3 text-sm font-black text-brand-950">
                        {formatTaka(Number(zone.standardFee || 60))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Payment Method Selection */}
            <section className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-xs sm:p-8">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
                <CreditCard className="h-5 w-5 text-brand-800" /> 3. Payment Method
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    paymentMethod === "cod"
                      ? "border-brand-900 bg-brand-50/50 ring-2 ring-brand-900/15"
                      : "border-border bg-card text-card-foreground hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${paymentMethod === "cod" ? "border-brand-900 bg-brand-900 text-white" : "border-slate-300"}`}
                  >
                    {paymentMethod === "cod" && <Check className="h-3 w-3" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">Cash on Delivery (COD)</span>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Pay cash upon receiving the parcel from the courier.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("bkash")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    paymentMethod === "bkash"
                      ? "border-brand-900 bg-brand-50/50 ring-2 ring-brand-900/15"
                      : "border-border bg-card text-card-foreground hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${paymentMethod === "bkash" ? "border-brand-900 bg-brand-900 text-white" : "border-slate-300"}`}
                  >
                    {paymentMethod === "bkash" && <Check className="h-3 w-3" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">bKash / Mobile Banking</span>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Send Money / Merchant Payment option available.
                    </p>
                  </div>
                </button>
              </div>
            </section>

            <button
              type="submit"
              disabled={isSubmitting || !cartItems.length}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-900 px-6 text-base font-black text-white shadow-md transition-all hover:bg-brand-950 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Placing your order...
                </>
              ) : (
                `Place Order • Total ${formatTaka(totalAmount)}`
              )}
            </button>
          </form>

          {/* Right Summary Column */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-xs sm:p-8">
              <h2 className="text-base font-black text-slate-900">
                Order Summary ({cartItems.length} items)
              </h2>

              <ul className="mt-4 divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <li key={item.id} className="flex gap-3 py-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 border">
                      <Image
                        src={item.image || CLOUDINARY_FALLBACK.defaultProduct}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-bold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-500">Qty: {item.quantity}</p>
                      <p className="text-xs font-bold text-brand-900">
                        {formatTaka(item.price * item.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Coupon input */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Promo / Coupon Code"
                      disabled={Boolean(appliedCoupon)}
                      className="min-h-11 w-full rounded-xl border border-border bg-card text-card-foreground pl-9 pr-3 text-xs font-bold uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:font-normal focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyPromoCode}
                      disabled={isApplyingPromo || !promoInput.trim()}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-900 px-4 text-xs font-bold text-white hover:bg-brand-950 disabled:opacity-50"
                    >
                      {isApplyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </button>
                  )}
                </div>
                {promoMessage && (
                  <p
                    className={`mt-2 text-xs font-semibold ${promoError ? "text-rose-600" : "text-emerald-700"}`}
                  >
                    {promoMessage}
                  </p>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="mt-6 border-t border-slate-100 pt-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Cart Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatTaka(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery ({selectedZone?.name})</span>
                  <span className="font-semibold text-slate-900">{formatTaka(shippingFee)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-{formatTaka(discountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-xl text-brand-950">{formatTaka(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card text-card-foreground p-5 text-xs text-slate-500 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-brand-800" />
                <span>Buyer Protection Guarantee</span>
              </div>
              <p>
                We inspect every item before dispatch. If damaged, enjoy free replacement within 7
                days.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
