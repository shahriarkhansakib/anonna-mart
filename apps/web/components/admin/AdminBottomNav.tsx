import { Boxes, Home, Package, ShoppingCart, Users } from "lucide-react";
import { Link, useLocation } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Home, label: "Home", path: "/admin" },
  { icon: ShoppingCart, label: "Orders", path: "/admin/orders" },
  { icon: Package, label: "Products", path: "/admin/products" },
  { icon: Boxes, label: "Inventory", path: "/admin/inventory" },
  { icon: Users, label: "Customers", path: "/admin/ecommerce-customers" },
];

export const AdminBottomNav = ({ pendingOrders = 0 }: { pendingOrders?: number }) => {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = path === "/admin" ? pathname === "/admin" : pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium transition-colors outline-none focus:outline-none select-none",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} />
              {label}
              {path === "/admin/orders" && pendingOrders > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {pendingOrders > 99 ? "99+" : pendingOrders}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
