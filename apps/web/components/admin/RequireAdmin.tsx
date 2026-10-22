import { AlertCircle, Loader2, LogOut } from "lucide-react";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "@/lib/router-compat";

interface RequireAdminProps {
  children: React.ReactNode;
}

export const RequireAdmin = ({ children }: RequireAdminProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, roleLoading } = useAdmin();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth/admin", { replace: true });
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">This account doesn't have admin access.</p>
          <Button
            onClick={async () => {
              await signOut();
              navigate("/auth/admin", { replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};
