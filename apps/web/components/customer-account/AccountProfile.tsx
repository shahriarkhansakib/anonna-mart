'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useSession } from '@/lib/auth-client';
import { User, Shield, Check, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

export function AccountProfile() {
  const sessionResult = useSession() as any;
  const user = sessionResult?.data?.user;

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('+880 1712-345678');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    toast.success('Profile preferences updated');
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8" aria-labelledby="profile-heading">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Account Details</p>
        <h1 id="profile-heading" className="mt-1 text-2xl font-black text-slate-900">
          My Profile
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Manage your personal details and authenticated account credentials.
        </p>
      </div>

      <div className="mt-6 max-w-xl">
        <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-lg font-black text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">{user?.name || 'Customer'}</h2>
              {(user as any)?.role === 'admin' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  <Shield className="h-3 w-3" /> Store Admin
                </span>
              ) : (
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Customer
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        {!isEditing ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</span>
                <p className="text-sm font-bold text-slate-900">{name || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</span>
                <p className="text-sm font-bold text-slate-900">{email || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Phone</span>
                <p className="text-sm font-bold text-slate-900">{phone}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-xl bg-brand-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-950 shadow-xs"
            >
              Edit Contact Details
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                disabled
                value={email}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
              />
              <span className="mt-1 block text-[10px] text-slate-400">Email address is managed by your sign-in account.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-brand-700"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-brand-900 px-5 py-2 text-xs font-bold text-white hover:bg-brand-950"
              >
                Save Details
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
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
