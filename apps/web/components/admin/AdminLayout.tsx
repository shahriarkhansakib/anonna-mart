import { ReactNode, useLayoutEffect } from "react";
import { AdminShell, useAdminShell } from "./AdminShell";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Pages declare their title here. Inside the persistent shell (admin layout route)
 * it only updates the header; standalone it renders the full shell.
 */
export const AdminLayout = ({ children, title, subtitle }: AdminLayoutProps) => {
  const shell = useAdminShell();

  useLayoutEffect(() => {
    shell?.setTitles({ title, subtitle });
  }, [shell, title, subtitle]);

  if (shell) return <div className="animate-content-in">{children}</div>;
  return <AdminShell>{children}</AdminShell>;
};
