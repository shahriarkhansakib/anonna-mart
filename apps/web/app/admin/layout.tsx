import type { Metadata } from "next";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import React from "react";

export const metadata: Metadata = {
  title: {
    default: "GrowMate Admin Panel — Anonna Mart",
    template: "%s | GrowMate Admin Panel",
  },
  description: "GrowMate Enterprise Admin Portal for Anonna Mart Store Management",
  icons: {
    icon: "/growmate-logo.png",
    shortcut: "/growmate-logo.png",
    apple: "/growmate-logo.png",
  },
  openGraph: {
    title: "GrowMate Admin Panel — Anonna Mart",
    description: "Enterprise Store Operations & Commerce Management Portal",
    images: [{ url: "/growmate-logo.png", width: 1024, height: 1024, alt: "GrowMate Admin Panel" }],
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
