import {
  AlertCircle,
  BarChart3,
  Boxes,
  FileText,
  Headset,
  Home,
  Mail,
  MapPin,
  Package,
  Settings,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Undo2,
  Users,
} from "lucide-react";

export interface AdminNavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  description?: string;
  badge?: number;
  badgeVariant?: "default" | "destructive" | "outline";
}

export interface AdminNavSection {
  title: string;
  icon?: React.ElementType;
  items: AdminNavItem[];
}

/** Single source of truth for the e-commerce admin navigation (desktop + mobile). */
export const adminNavSections: AdminNavSection[] = [
  {
    title: "Store",
    icon: Home,
    items: [
      { icon: Home, label: "Home", path: "/admin", description: "Today at a glance" },
      {
        icon: ShoppingCart,
        label: "Orders",
        path: "/admin/orders",
        description: "Process & ship orders",
      },
      {
        icon: AlertCircle,
        label: "Incomplete Orders",
        path: "/admin/incomplete-orders",
        description: "Recover lost sales",
      },
      {
        icon: TrendingUp,
        label: "Recovery Analytics",
        path: "/admin/recovery-analytics",
        description: "Cart recovery insights",
      },
      { icon: Undo2, label: "Returns", path: "/admin/returns", description: "Returns & exchanges" },
      { icon: Package, label: "Products", path: "/admin/products", description: "Your catalog" },
      { icon: Boxes, label: "Inventory", path: "/admin/inventory", description: "Stock levels" },
      {
        icon: Users,
        label: "Customers",
        path: "/admin/ecommerce-customers",
        description: "Buyers & order history",
      },
    ],
  },
  {
    title: "Growth",
    icon: Ticket,
    items: [
      { icon: Ticket, label: "Discounts", path: "/admin/coupons", description: "Coupon codes" },
      {
        icon: MapPin,
        label: "Delivery Zones",
        path: "/admin/delivery-zones",
        description: "Shipping rates by area",
      },
      { icon: FileText, label: "Content", path: "/admin/cms", description: "Blog & articles" },
      {
        icon: BarChart3,
        label: "Analytics",
        path: "/admin/analytics",
        description: "Sales reports",
      },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      {
        icon: Headset,
        label: "Support Chat",
        path: "/admin/support-chat",
        description: "Live customer chat",
      },
      {
        icon: Settings,
        label: "Settings",
        path: "/admin/settings",
        description: "Couriers, payments, pixel",
      },
    ],
  },
];
