import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { productsApi } from "@/lib/api/products";
import { type CatalogChange, type CatalogRow, catalogToCSV, diffCatalogCSV } from "@/lib/bulkCsv";
import { downloadCSV } from "@/lib/csvParser";

async function loadCatalog(): Promise<CatalogRow[]> {
  const res = await productsApi.list();
  const products = res.data || [];
  const rows: CatalogRow[] = [];
  for (const p of products) {
    rows.push({
      type: "product",
      id: p.id,
      name: p.name,
      sku: p.sku || "",
      price: Number(p.price || 0),
      stock: Number(p.stock || 0),
    });
  }
  return rows;
}

export const BulkPriceStockCSV = () => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [changes, setChanges] = useState<CatalogChange[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const exportCsv = async () => {
    setBusy(true);
    try {
      downloadCSV(
        catalogToCSV(await loadCatalog()),
        `catalog-prices-stock-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const res = diffCatalogCSV(await f.text(), await loadCatalog());
      setChanges(res.changes);
      setErrors(res.errors);
    } catch {
      toast.error("Could not read file");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const apply = async () => {
    if (!changes?.length) return;
    setBusy(true);
    const results = await Promise.all(
      changes.map((c) => {
        const patch: { price?: number; stock?: number } = {};
        if (c.price !== undefined && c.price !== null) patch.price = c.price;
        if (c.stock !== undefined && c.stock !== null) patch.stock = c.stock;
        return productsApi.update(c.row.id, patch).catch((err) => ({ error: err }));
      }),
    );
    const failed = results.filter((r) => (r as any)?.error).length;
    setBusy(false);
    setChanges(null);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    failed
      ? toast.error(`${changes.length - failed} updated, ${failed} failed`)
      : toast.success(`${changes.length} items updated`);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={exportCsv}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{" "}
          Export prices & stock
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Upload className="h-4 w-4" /> Import edited CSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      <Dialog open={!!changes} onOpenChange={(o: boolean) => !o && setChanges(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review changes</DialogTitle>
            <DialogDescription>
              {changes?.length || 0} items will change. Nothing is saved until you confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-auto divide-y divide-border text-sm">
            {changes?.map((c) => (
              <div key={c.row.id} className="py-2">
                <p className="font-medium truncate">{c.row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.price !== undefined && (
                    <>
                      Price {c.row.price ?? "—"} →{" "}
                      <b className="text-foreground">{c.price ?? "—"}</b>
                      {"  "}
                    </>
                  )}
                  {c.stock !== undefined && (
                    <>
                      Stock {c.row.stock} → <b className="text-foreground">{c.stock}</b>
                    </>
                  )}
                </p>
              </div>
            ))}
            {changes?.length === 0 && (
              <p className="py-4 text-muted-foreground">No changes found in this file.</p>
            )}
          </div>
          {errors.length > 0 && (
            <p className="text-xs text-destructive">
              {errors.length} rows skipped: {errors.slice(0, 3).join("; ")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setChanges(null)}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={busy || !changes?.length}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Apply changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
