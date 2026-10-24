"use client";

import { Check, Mail, Phone, Shield, User } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

export function AccountProfile() {
  const sessionResult = useSession() as any;
  const user = sessionResult?.data?.user;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("+880 1712-345678");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    toast.success("Profile preferences updated");
  };

  return (
    <section
      className="rounded-3xl border border-border bg-card p-6 shadow-xs sm:p-8 text-card-foreground"
      aria-labelledby="profile-heading"
    >
      <div className="border-b border-border pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Account Details</p>
        <h1 id="profile-heading" className="mt-1 text-2xl font-black text-foreground">
          My Profile
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage your personal details and authenticated account credentials.
        </p>
      </div>

      <div className="mt-6 max-w-xl">
        <div className="flex items-center gap-4 rounded-2xl bg-muted/40 p-4 border border-border">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-xs">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-foreground">{user?.name || "Customer"}</h2>
              {(user as any)?.role === "admin" ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <Shield className="h-3 w-3" /> Store Admin
                </span>
              ) : (
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Customer
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {!isEditing ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </span>
                <p className="text-sm font-bold text-foreground">{name || "Not provided"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </span>
                <p className="text-sm font-bold text-foreground">{email || "Not provided"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Phone
                </span>
                <p className="text-sm font-bold text-foreground">{phone}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              Edit Contact Details
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Full Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Email Address
              </label>
              <input
                disabled
                value={email}
                className="w-full rounded-xl border border-border bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground cursor-not-allowed"
              />
              <span className="mt-1 block text-[10px] text-muted-foreground">
                Email address is managed by your sign-in account.
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Contact Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                Save Details
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
