import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BarChart4,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Headset,
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
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { prefetchRoute } from "@/lib/imageUtils";
import { Link, useLocation } from "@/lib/router-compat";
import { cn } from "@/lib/utils";
import { adminNavSections } from "./adminNav";

const navSections = adminNavSections;

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  pendingOrders?: number;
  pendingVerifications?: number;
  pendingDoctors?: number;
}

export const AdminSidebar = ({
  collapsed,
  onToggle,
  pendingOrders = 0,
  pendingVerifications = 0,
  pendingDoctors = 0,
}: AdminSidebarProps) => {
  const location = useLocation();

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

  const totalPending = pendingOrders;
  const mainSections = sectionsWithBadges.filter((s) => s.title !== "Settings");
  const bottomItems = sectionsWithBadges.find((s) => s.title === "Settings")?.items ?? [];

  const renderItem = (item: (typeof sectionsWithBadges)[number]["items"][number]) => {
    const isActive =
      location.pathname === item.path ||
      (item.path !== "/admin" && location.pathname.startsWith(item.path));
    const navLink = (
      <Link
        key={item.path}
        to={item.path}
        onMouseEnter={() => prefetchRoute(item.path)}
        className={cn(
          "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-200 outline-none focus:outline-none focus-visible:outline-none select-none",
          "h-[clamp(24px,4.6vh,38px)] min-h-0 py-0",
          collapsed ? "px-3 justify-center mx-auto" : "px-3",
          isActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <item.icon className={cn("flex-shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
        {!collapsed && (
          <>
            <span className="flex-1 whitespace-nowrap">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <Badge
                variant={item.badgeVariant || "default"}
                className="h-5 min-w-5 px-1.5 text-[10px] font-bold"
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}
        {collapsed && item.badge && item.badge > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </Link>
    );
    if (!collapsed) return navLink;
    return (
      <Tooltip key={item.path}>
        <TooltipTrigger asChild>{navLink}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden md:flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          "bg-gradient-to-b from-background via-background to-muted/20",
          "border-r border-border/40 shadow-xl",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        {/* Header with Logo */}
        <div
          className={cn(
            "relative px-4 py-3 border-b border-border/40 shrink-0",
            "bg-gradient-to-r from-primary/5 via-accent/5 to-transparent",
          )}
        >
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />

          <Link to="/admin" className="relative flex items-center gap-3 group">
            {collapsed ? (
              <div className="relative mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Logo to="" size="sm" showText={false} />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Logo to="" size="sm" showText={false} />
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-base bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Anonna Mart
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                      Admin Panel
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Link>

          {/* Status indicator */}
          {!collapsed && totalPending > 0 && (
            <div className="mt-2 flex items-center gap-2 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {totalPending} pending action{totalPending !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overscroll-contain py-[clamp(2px,1vh,12px)]",
            collapsed ? "px-2" : "px-3",
          )}
        >
          <div className="space-y-[clamp(2px,1.4vh,16px)]">
            {mainSections.map((section, sectionIdx) => (
              <div key={section.title}>
                {!collapsed && (
                  <div className="flex items-center gap-2 px-3 mb-1 [@media(max-height:640px)]:hidden">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">
                      {section.title}
                    </span>
                  </div>
                )}
                {collapsed && sectionIdx > 0 && (
                  <div className="mx-auto w-8 h-px bg-border mb-[clamp(2px,0.8vh,8px)]" />
                )}
                <div className="space-y-0.5">{section.items.map(renderItem)}</div>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer: settings pinned to bottom */}
        <div className="shrink-0 border-t border-border/40 bg-muted/30">
          <div className={cn("pt-2 pb-1 space-y-0.5", collapsed ? "px-2" : "px-3")}>
            {bottomItems.map(renderItem)}
          </div>

          <div className={cn("px-3 pb-2", collapsed && "px-2")}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className={cn(
                "w-full flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl outline-none focus:outline-none focus-visible:outline-none",
                collapsed ? "justify-center px-2 h-9" : "justify-start px-3 h-9",
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-sm">Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};
