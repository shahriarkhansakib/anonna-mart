import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Minus, Plus, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BulkPriceStockCSV } from "@/components/admin/BulkPriceStockCSV";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin, useAdminProducts } from "@/hooks/useAdmin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { productsApi } from "@/lib/api/products";
import { Link } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

const LOW = 10;
type Filter = "all" | "low" | "out";

const AdminInventory = () => {
  useDocumentTitle("Inventory - Admin");
  const { isAdmin } = useAdmin();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const { data: products = [], isLoading } = useAdminProducts();

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => {
      const stock = p.stock ?? 0;
      if (filter === "low" && !(stock > 0 && stock <= LOW)) return false;
      if (filter === "out" && stock > 0) return false;
      return !s || p.name.toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s);
    });
  }, [products, q, filter]);

  const counts = {
    all: products.length,
    low: products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= LOW).length,
    out: products.filter((p) => (p.stock ?? 0) <= 0).length,
  };
  const dirty = Object.keys(edits).length;

  const setStock = (id: string, v: number) => setEdits((e) => ({ ...e, [id]: Math.max(0, v) }));

  const save = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(edits).map(([id, stock]) => ({ id, stock }));
      await productsApi.batchStock(updates);
      toast.success("Stock updated");
      setEdits({});
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Inventory" subtitle="Update stock levels in one place">
      <BulkPriceStockCSV />
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or SKU"
            className="pl-10 h-11 rounded-xl bg-card"
          />
        </div>
        <div className="flex p-1 rounded-xl bg-muted gap-1">
          {(["all", "low", "out"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 sm:flex-none px-3 h-9 rounded-lg text-sm font-medium transition-all",
                filter === f ? "bg-card shadow-card text-foreground" : "text-muted-foreground",
              )}
            >
              {f === "all" ? "All" : f === "low" ? "Low" : "Out"}{" "}
              <span className="text-muted-foreground">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="surface overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-semibold">No products here</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add products to start tracking stock.
            </p>
            <Button asChild>
              <Link to="/admin/products">Go to products</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {list.map((p) => {
              const value = edits[p.id] ?? p.stock ?? 0;
              return (
                <li key={p.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0">
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.name}</p>
                    <p
                      className={cn(
                        "text-xs",
                        value <= 0
                          ? "text-destructive"
                          : value <= LOW
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                    >
                      {value <= 0 ? "Out of stock" : value <= LOW ? "Low stock" : "In stock"}
                      {p.sku ? ` · ${p.sku}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => setStock(p.id, value - 1)}
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={value}
                      onChange={(e) => setStock(p.id, parseInt(e.target.value || "0", 10))}
                      className="w-16 h-9 text-center rounded-lg"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => setStock(p.id, value + 1)}
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {dirty > 0 && (
        <div className="fixed bottom-20 md:bottom-6 inset-x-4 md:left-auto md:right-8 md:w-auto z-50 flex items-center justify-between gap-3 rounded-2xl bg-foreground text-background px-4 py-3 shadow-hover">
          <span className="text-sm">
            {dirty} unsaved change{dirty > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-background hover:bg-background/10 hover:text-background"
              onClick={() => setEdits({})}
            >
              Discard
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInventory;
