import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productsApi } from "@/lib/api/products";

interface Row {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
}

interface Props {
  product: { id: string; name: string; price: number } | null;
  onOpenChange: (open: boolean) => void;
}

/** Sizes/colors for one product, each with its own price, SKU and stock. Product stock = sum of variants. */
export function ProductVariantsDialog({ product, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");

  useEffect(() => {
    if (!product) return;
    setRemoved([]);
    setSizes("");
    setColors("");
    setLoading(true);
    productsApi
      .getVariants(product.id)
      .then((res) => {
        const variants = res.data || [];
        setRows(
          variants.map((v: any) => ({
            id: v.id,
            name: v.name,
            sku: v.sku ?? "",
            price: v.price != null ? String(v.price) : "",
            stock: String(v.stockQuantity ?? v.stock ?? 0),
          })),
        );
      })
      .catch(() => {
        setRows([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [product]);

  const update = (i: number, k: keyof Row, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const remove = (i: number) => {
    const row = rows[i];
    if (row.id) setRemoved((r) => [...r, row.id!]);
    setRows((r) => r.filter((_, idx) => idx !== i));
  };

  const generate = () => {
    const s = sizes
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const c = colors
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const names =
      s.length && c.length ? s.flatMap((a) => c.map((b) => `${a} / ${b}`)) : [...s, ...c];
    const existing = new Set(rows.map((r) => r.name.toLowerCase()));
    const fresh = names
      .filter((n) => !existing.has(n.toLowerCase()))
      .map((name) => ({ name, sku: "", price: "", stock: "0" }));
    if (!fresh.length) return toast.info("Enter sizes and/or colors, separated by commas");
    setRows((r) => [...r, ...fresh]);
  };

  const save = async () => {
    if (!product) return;
    if (rows.some((r) => !r.name.trim())) return toast.error("Every option needs a name");
    setSaving(true);
    try {
      const payload = rows.map((r, i) => ({
        ...(r.id ? { id: r.id } : {}),
        productId: product.id,
        name: r.name.trim(),
        sku:
          r.sku.trim() ||
          `${product.id.slice(0, 6)}-${r.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`,
        price: r.price === "" ? null : Number(r.price),
        stock: Math.max(0, parseInt(r.stock) || 0),
      }));
      await productsApi.updateVariants(product.id, payload);
      toast.success("Product variants saved successfully");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["product-variants"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save options");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sizes & colors</DialogTitle>
          <DialogDescription>
            {product?.name} — each option has its own price and stock. Leave price empty to use{" "}
            {product?.price}.
          </DialogDescription>
        </DialogHeader>

        <div className="surface p-3 sm:p-4 space-y-3">
          <p className="text-sm font-medium">Quick add</p>
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              placeholder="Sizes: S, M, L"
            />
            <Input
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="Colors: Red, Black"
            />
            <Button variant="outline" onClick={generate}>
              <Wand2 className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No options yet. This product sells as a single item.
              </p>
            )}
            {rows.map((r, i) => (
              <div
                key={r.id ?? `new-${i}`}
                className="rounded-xl border border-border/70 p-3 grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.7fr_auto] gap-2 items-end"
              >
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <Label className="text-xs">Option</Label>
                  <Input
                    value={r.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    placeholder="M / Black"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SKU</Label>
                  <Input value={r.sku} onChange={(e) => update(i, "sku", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={r.price}
                    onChange={(e) => update(i, "price", e.target.value)}
                    placeholder={String(product?.price ?? "")}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stock</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={r.stock}
                    onChange={(e) => update(i, "stock", e.target.value)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive justify-self-end"
                  onClick={() => remove(i)}
                  aria-label="Remove option"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={() => setRows((r) => [...r, { name: "", sku: "", price: "", stock: "0" }])}
            >
              <Plus className="h-4 w-4" />
              Add option
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            Total stock: {rows.reduce((s, r) => s + (parseInt(r.stock) || 0), 0)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || loading}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
