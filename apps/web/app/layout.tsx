import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { AIChatWidget } from "@/components/storefront/AIChatWidget";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5003"),
  title: {
    default: "Anonna Mart",
    template: "%s | Anonna Mart",
  },
  description: "Anonna Mart - Premium E-Commerce & Store Operations",
  openGraph: {
    title: "Anonna Mart",
    description: "Anonna Mart - Premium E-Commerce & Store Operations",
    siteName: "Anonna Mart",
    images: [{ url: "/anonna-mart-logo.png", width: 693, height: 264, alt: "Anonna Mart" }],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <CartProvider>
              <WishlistProvider>
                {children}
                <CartDrawer />
                <AIChatWidget />
                <Toaster />
              </WishlistProvider>
            </CartProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
