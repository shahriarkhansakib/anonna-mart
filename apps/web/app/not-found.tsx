import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-background text-foreground">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <span className="text-2xl font-bold">404</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Page Not Found</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Sorry, the page you are looking for does not exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Home className="w-4 h-4" />
          Back to Store
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors"
        >
          Admin Panel
        </Link>
      </div>
    </div>
  );
}
