import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";

/**
 * Realtime dashboard refresher for admin.
 * Uses a gentle interval to poll stats and pending counts while in admin panel.
 */
export const useAdminRealtimeDashboard = (isAdmin: boolean, owner = false) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin || !owner) return;
    const inv = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });

    const interval = setInterval(() => {
      inv("admin-stats");
      inv("admin-pending-counts");
    }, 15000);

    return () => clearInterval(interval);
  }, [isAdmin, owner, queryClient, navigate]);
};
