import { useQuery } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminRealtimeDashboard } from "@/hooks/useAdminRealtimeDashboard";
import { analyticsApi } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { SearchPalette } from "./SearchPalette";

type Titles = { title: string; subtitle?: string };
type ShellCtx = { setTitles: (t: Titles) => void };

export const AdminShellContext = createContext<ShellCtx | null>(null);
export const useAdminShell = () => useContext(AdminShellContext);

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

/** Persistent admin chrome: sidebar, header and bottom tabs stay mounted across page switches. */
export const AdminShell = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [titles, setTitles] = useState<Titles>({ title: "" });
  const { isAdmin } = useAdmin();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    }
  }, []);

  useAdminRealtimeDashboard(isAdmin, true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    }
  }, [collapsed]);

  const { data: pendingCounts } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: async () => {
      try {
        const stats = await analyticsApi.getDashboardStats();
        return { pendingOrders: stats.pendingOrders || 0 };
      } catch {
        return { pendingOrders: 0 };
      }
    },
    enabled: isAdmin,
  });

  const ctx = useMemo<ShellCtx>(
    () => ({
      setTitles: (t) =>
        setTitles((p) => (p.title === t.title && p.subtitle === t.subtitle ? p : t)),
    }),
    [],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-admin", "true");
      document.body.classList.add("admin-portal");
      return () => {
        document.documentElement.removeAttribute("data-admin");
        document.body.classList.remove("admin-portal");
      };
    }
  }, []);

  const toggleSidebar = () => setCollapsed((p) => !p);

  return (
    <AdminShellContext.Provider value={ctx}>
      <div className="admin-shell min-h-screen bg-background text-foreground" data-admin="true">
        <AdminSidebar
          collapsed={collapsed}
          onToggle={toggleSidebar}
          pendingOrders={pendingCounts?.pendingOrders}
        />
        <div
          className={cn(
            "min-h-screen flex flex-col transition-[margin] duration-300 ease-in-out",
            collapsed ? "md:ml-[72px]" : "md:ml-[260px]",
          )}
        >
          <AdminHeader
            title={titles.title}
            subtitle={titles.subtitle}
            onToggleSidebar={toggleSidebar}
            collapsed={collapsed}
            pendingOrders={pendingCounts?.pendingOrders}
          />
          <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 pt-4 pb-24 sm:px-6 sm:pt-6 md:pb-8 lg:px-8 overflow-x-hidden">
            {children}
          </main>
        </div>
        <AdminBottomNav pendingOrders={pendingCounts?.pendingOrders} />
        <SearchPalette />
      </div>
    </AdminShellContext.Provider>
  );
};
