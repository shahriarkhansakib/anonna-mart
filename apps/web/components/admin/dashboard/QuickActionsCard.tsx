import { AlertCircle, Clock, Package, Ticket, TrendingUp, Truck } from "lucide-react";
import { forwardRef, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "@/lib/router-compat";

interface QuickActionsCardProps {
  stats:
    | {
        pendingOrders?: number;
        totalProducts?: number;
      }
    | undefined;
}

export const QuickActionsCard = memo(
  forwardRef<HTMLDivElement, QuickActionsCardProps>(({ stats }, ref) => {
    const navigate = useNavigate();

    const actions = [
      {
        label: "Pending Orders",
        icon: Clock,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-500/10",
        badgeBg:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
        badgeText: stats?.pendingOrders || 0,
        onClick: () => navigate("/admin/orders?status=pending"),
      },
      {
        label: "Add Product",
        icon: Package,
        iconColor: "text-primary",
        bgColor: "bg-primary/10",
        badgeBg: "",
        badgeText: `${stats?.totalProducts || 0} listed`,
        onClick: () => navigate("/admin/products"),
      },
      {
        label: "Abandoned Checkouts",
        icon: AlertCircle,
        iconColor: "text-destructive",
        bgColor: "bg-destructive/10",
        badgeBg: "",
        badgeText: "Recover",
        onClick: () => navigate("/admin/incomplete-orders"),
      },
      {
        label: "Create Discount",
        icon: Ticket,
        iconColor: "text-primary",
        bgColor: "bg-primary/10",
        badgeBg: "",
        badgeText: "Coupons",
        onClick: () => navigate("/admin/coupons"),
      },
      {
        label: "Courier & Pixel Setup",
        icon: Truck,
        iconColor: "text-primary",
        bgColor: "bg-primary/10",
        badgeBg: "",
        badgeText: "Settings",
        onClick: () => navigate("/admin/settings"),
      },
    ];

    return (
      <Card ref={ref} className="shadow-sm border-border/50">
        <CardHeader className="p-3 sm:p-4 lg:p-5 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-5 pt-0 space-y-1.5 sm:space-y-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              className="w-full justify-start gap-2 sm:gap-3 h-auto py-2 sm:py-2.5"
              variant="outline"
              onClick={action.onClick}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${action.bgColor} flex items-center justify-center flex-shrink-0`}
              >
                <action.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${action.iconColor}`} />
              </div>
              <span className="flex-1 min-w-0 whitespace-normal leading-tight text-left text-xs sm:text-sm">
                {action.label}
              </span>
              <Badge
                variant="outline"
                className={`${action.badgeBg} shrink-0 whitespace-nowrap text-[10px] sm:text-xs px-1.5 sm:px-2`}
              >
                {action.badgeText}
              </Badge>
            </Button>
          ))}
        </CardContent>
      </Card>
    );
  }),
);

QuickActionsCard.displayName = "QuickActionsCard";
