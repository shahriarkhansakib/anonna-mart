"use client";

import { Check, MapPin, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

export interface SavedAddress {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

const STORAGE_KEY = "anonna_customer_addresses";

export function AccountAddresses() {
  const sessionResult = useSession() as any;
  const user = sessionResult?.data?.user;
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [label, setLabel] = useState("Home");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAddresses(JSON.parse(stored));
      } else if (user) {
        const initial = [
          {
            id: "addr-1",
            label: "Home",
            recipient: user.name || "Customer",
            phone: "017XXXXXXXX",
            address: "House 12, Road 5, Dhanmondi, Dhaka",
            isDefault: true,
          },
        ];
        setAddresses(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch {
      // ignore
    }
  }, [user]);

  const saveToStorage = (updated: SavedAddress[]) => {
    setAddresses(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const startAdd = () => {
    setEditingId(null);
    setLabel("Home");
    setRecipient(user?.name || "");
    setPhone("");
    setAddress("");
    setIsDefault(addresses.length === 0);
    setFormOpen(true);
  };

  const submitAddress = (e: FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !address.trim() || !phone.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newAddr: SavedAddress = {
      id: editingId || `addr-${Date.now()}`,
      label,
      recipient: recipient.trim(),
      phone: phone.trim(),
      address: address.trim(),
      isDefault: isDefault || addresses.length === 0,
    };

    let updated: SavedAddress[];
    if (editingId) {
      updated = addresses.map((a) => (a.id === editingId ? newAddr : a));
    } else {
      updated = [...addresses, newAddr];
    }

    if (newAddr.isDefault) {
      updated = updated.map((a) => ({ ...a, isDefault: a.id === newAddr.id }));
    }

    saveToStorage(updated);
    toast.success(editingId ? "Address updated" : "Address saved");
    setFormOpen(false);
  };

  const deleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    saveToStorage(updated);
    toast.success("Address removed");
  };

  const setDefault = (id: string) => {
    const updated = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    saveToStorage(updated);
    toast.success("Default address updated");
  };

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
      aria-labelledby="addresses-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
            Delivery Preferences
          </p>
          <h1 id="addresses-heading" className="mt-1 text-2xl font-black text-slate-900">
            Saved Delivery Addresses
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Keep your frequent delivery destinations saved for rapid one-click checkout.
          </p>
        </div>

        <button
          type="button"
          onClick={startAdd}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-900 px-4 text-xs font-bold text-white hover:bg-brand-950 shadow-xs"
        >
          <Plus className="h-4 w-4" /> Add New Address
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={submitAddress}
          className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {editingId ? "Edit Address" : "New Address"}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Label (e.g. Home, Office)
              </label>
              <input
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Name *
              </label>
              <input
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Street Address *
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-brand-900 focus:ring-brand-700"
            />
            <label htmlFor="isDefault" className="text-xs text-slate-700">
              Set as default delivery address
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-brand-900 px-4 py-2 text-xs font-bold text-white hover:bg-brand-950"
            >
              Save Address
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {addresses.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-5 transition-all ${
              item.isDefault ? "border-brand-900 bg-brand-50/20" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <MapPin className="h-4 w-4 text-brand-800" /> {item.label}
              </span>
              {item.isDefault && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-900">
                  Default
                </span>
              )}
            </div>

            <p className="mt-3 text-xs font-bold text-slate-900">{item.recipient}</p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.address}</p>
            <p className="mt-1 text-xs font-mono text-slate-500">{item.phone}</p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              {!item.isDefault ? (
                <button
                  type="button"
                  onClick={() => setDefault(item.id)}
                  className="font-bold text-brand-900 hover:underline"
                >
                  Make Default
                </button>
              ) : (
                <span className="text-[11px] text-emerald-700 font-semibold">Current Default</span>
              )}

              <button
                type="button"
                onClick={() => deleteAddress(item.id)}
                className="text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
