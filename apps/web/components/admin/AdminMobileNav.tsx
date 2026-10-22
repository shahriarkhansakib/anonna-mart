import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BarChart4,
  Building2,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircleHeart,
  Package,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Ticket,
  Truck,
} from "lucide-react";
import Logo from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { SheetClose } from "@/components/ui/sheet";
import { prefetchRoute } from "@/lib/imageUtils";
import { Link, useLocation } from "@/lib/router-compat";
import { cn } from "@/lib/utils";
import { adminNavSections } from "./adminNav";

const navSections = adminNavSections;

interface AdminMobileNavProps {
  pendingOrders?: number;
}

export const AdminMobileNav = ({ pendingOrders = 0 }: AdminMobileNavProps) => {
  const location = useLocation();
  const totalPending = pendingOrders;

  // Add badges dynamically
  const sectionsWithBadges = navSections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.path === "/admin/orders" && pendingOrders > 0) {
        return { ...item, badge: pendingOrders, badgeVariant: "destructive" as const };
      }
      return item;
    }),
  }));

  return (
    <div className="flex h-full max-h-[100dvh] flex-col bg-gradient-to-b from-background via-background to-muted/30 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 p-4 sm:p-5 border-b border-border/40 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent backdrop-blur-sm">
        <SheetClose asChild>
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Logo to="" size="md" showText={false} />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Anonna Mart
              </span>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
            </div>
          </Link>
        </SheetClose>

        {/* Quick Stats */}
        {totalPending > 0 && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {totalPending} Pending Action{totalPending !== 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                {pendingOrders > 0 && `${pendingOrders} order${pendingOrders !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-5">
        {sectionsWithBadges.map((section) => (
          <div key={section.title}>
            {/* Section Header */}
            <div className="flex items-center gap-2 px-2 mb-2">
              {section.icon && <section.icon className="h-3.5 w-3.5 text-muted-foreground/50" />}
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">
                {section.title}
              </span>
            </div>

            {/* Navigation Items */}
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/admin" && location.pathname.startsWith(item.path));

                return (
                  <SheetClose asChild key={item.path}>
                    <Link
                      to={item.path}
                      onTouchStart={() => prefetchRoute(item.path)}
                      onMouseEnter={() => prefetchRoute(item.path)}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]",
                        isActive
                          ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-foreground bg-muted/30 hover:bg-muted/60 active:bg-muted",
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-xl flex-shrink-0 transition-all duration-200",
                          isActive
                            ? "bg-white/20"
                            : "bg-gradient-to-br from-primary/10 to-accent/10",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5",
                            isActive ? "text-primary-foreground" : "text-primary",
                          )}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-semibold truncate",
                            isActive ? "text-primary-foreground" : "text-foreground",
                          )}
                        >
                          {item.label}
                        </p>
                        {item.description && (
                          <p
                            className={cn(
                              "text-[11px] truncate",
                              isActive ? "text-primary-foreground/70" : "text-muted-foreground",
                            )}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Badge */}
                      {item.badge && item.badge > 0 && (
                        <Badge
                          variant={item.badgeVariant || "default"}
                          className={cn(
                            "h-6 min-w-6 px-2 text-[11px] font-bold",
                            isActive && "bg-white/20 text-white border-white/30",
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}

                      {/* Chevron */}
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 flex-shrink-0 opacity-40",
                          isActive && "text-primary-foreground opacity-60",
                        )}
                      />
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* GrowMate Powered By Footer */}
      <div className="p-3 border-t border-border/40 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md overflow-hidden bg-white shadow-2xs p-0.5 flex items-center justify-center border border-black/5 dark:border-white/10 shrink-0">
            <img
              src="/growmate-logo.png"
              alt="GrowMate"
              className="h-full w-full object-contain"
              width={24}
              height={24}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-foreground">GrowMate Admin</span>
            <span className="text-[9px] text-muted-foreground">Your Growth Partner</span>
          </div>
        </div>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          PRO
        </span>
      </div>
    </div>
  );
};
