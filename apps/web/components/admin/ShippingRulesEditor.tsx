import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useShippingRules } from "@/hooks/useShippingRules";
import { currencySymbol, useStoreInfo } from "@/hooks/useStoreInfo";
import { settingsApi } from "@/lib/api/settings";
import { type ShippingRule, validateShippingRule } from "@/lib/shippingRules";

export function ShippingRulesEditor({ zones }: { zones: { id: string; zone_name: string }[] }) {
  const { data: rules = [], isLoading, error } = useShippingRules();
  const { data: store } = useStoreInfo();
  const currency = currencySymbol(store?.currency);
  const qc = useQueryClient();
  const [form, setForm] = useState<ShippingRule | null>(null);
  const [busy, setBusy] = useState(false);
  const persist = async (next: ShippingRule[]) => {
    setBusy(true);
    try {
      await settingsApi.post({ key: "shipping_rules", value: next });
      await qc.invalidateQueries({ queryKey: ["shipping-rules"] });
      setForm(null);
      toast.success("Shipping rules saved");
    } catch {
      toast.error("Could not save shipping rules");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 border-t border-border pt-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Shipping rules</h2>
        <Button
          size="sm"
          disabled={busy || isLoading || !!error}
          onClick={() =>
            setForm({
              id: crypto.randomUUID(),
              name: "",
              zoneId: "",
              basis: "weight",
              min: 0,
              max: null,
              charge: 0,
              active: true,
            })
          }
        >
          <Plus className="h-4 w-4" />
          Add rule
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive">Shipping rules could not be loaded.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shipping rules</p>
      ) : (
        <ol className="divide-y divide-border">
          {rules.map((r, i) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium break-words">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {zones.find((z) => z.id === r.zoneId)?.zone_name || "All zones"} · {r.min}–
                  {r.max ?? "∞"} {r.basis === "weight" ? "kg" : store?.currency || "BDT"} ·{" "}
                  {currency}
                  {r.charge}
                </p>
              </div>
              <Switch
                aria-label={`Enable ${r.name}`}
                checked={r.active}
                disabled={busy}
                onCheckedChange={(active) =>
                  persist(rules.map((x) => (x.id === r.id ? { ...x, active } : x)))
                }
              />
              <Button
                variant="ghost"
                size="icon"
                title="Move up in priority"
                aria-label={`Move ${r.name} up`}
                disabled={busy || i === 0}
                onClick={() => {
                  const next = [...rules];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  persist(next);
                }}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${r.name}`}
                disabled={busy}
                onClick={() => setForm(r)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label={`Delete ${r.name}`}
                disabled={busy}
                onClick={() => {
                  if (confirm(`Delete ${r.name}?`)) persist(rules.filter((x) => x.id !== r.id));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <Dialog
        open={!!form}
        onOpenChange={(open) => {
          if (!open && !busy) setForm(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {rules.some((r) => r.id === form?.id) ? "Edit shipping rule" : "Add shipping rule"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="rule-name">Rule name</Label>
                <Input
                  id="rule-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Zone</Label>
                <Select
                  value={form.zoneId || "all"}
                  onValueChange={(v) => setForm({ ...form, zoneId: v === "all" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All zones</SelectItem>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.zone_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Calculate by</Label>
                <Select
                  value={form.basis}
                  onValueChange={(v) => setForm({ ...form, basis: v as "weight" | "value" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">Parcel weight (kg)</SelectItem>
                    <SelectItem value="value">Order value after discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rule-min">Minimum (inclusive)</Label>
                  <Input
                    id="rule-min"
                    type="number"
                    min="0"
                    step="any"
                    value={form.min}
                    onChange={(e) => setForm({ ...form, min: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="rule-max">Maximum (exclusive)</Label>
                  <Input
                    id="rule-max"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="No limit"
                    value={form.max ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rule-charge">Shipping charge ({store?.currency || "BDT"})</Label>
                <Input
                  id="rule-charge"
                  type="number"
                  min="0"
                  step="any"
                  value={form.charge}
                  onChange={(e) => setForm({ ...form, charge: Number(e.target.value) })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={busy} onClick={() => setForm(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (!validateShippingRule(form))
                      return toast.error("Enter a name, non-negative charge and a valid range");
                    const next = rules.some((r) => r.id === form.id)
                      ? rules.map((r) => (r.id === form.id ? form : r))
                      : [...rules, form];
                    persist(next);
                  }}
                >
                  {busy ? "Saving…" : "Save rule"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
