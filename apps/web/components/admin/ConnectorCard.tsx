import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface ConnectorField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  type?: "text" | "switch";
}

interface ConnectorCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  fields: ConnectorField[];
  values: Record<string, string | boolean>;
  onChange: (key: string, value: string | boolean) => void;
  onSave: () => void;
  saving?: boolean;
  badge?: ReactNode;
}

export const ConnectorCard = ({
  icon: Icon,
  title,
  description,
  enabled,
  onEnabledChange,
  fields,
  values,
  onChange,
  onSave,
  saving,
  badge,
}: ConnectorCardProps) => {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const hasMissing = enabled && fields.some((f) => f.type !== "switch" && !values[f.key]);

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
                {badge}
                {enabled && !hasMissing && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-[10px] border-green-500/40 text-green-700 dark:text-green-400"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" /> Active
                  </Badge>
                )}
                {hasMissing && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400"
                  >
                    <AlertCircle className="h-2.5 w-2.5" /> Missing credentials
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            className="flex-shrink-0 mt-1"
          />
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="p-3 sm:p-4 lg:p-5 pt-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => {
              if (f.type === "switch") {
                return (
                  <div
                    key={f.key}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 sm:col-span-2"
                  >
                    <Label className="text-xs sm:text-sm">{f.label}</Label>
                    <Switch
                      checked={Boolean(values[f.key])}
                      onCheckedChange={(v) => onChange(f.key, v)}
                    />
                  </div>
                );
              }
              const isRevealed = revealed[f.key];
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={`${title}-${f.key}`} className="text-xs sm:text-sm">
                    {f.label}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`${title}-${f.key}`}
                      type={f.secret && !isRevealed ? "password" : "text"}
                      value={String(values[f.key] ?? "")}
                      placeholder={f.placeholder}
                      onChange={(e) => onChange(f.key, e.target.value)}
                      className="h-10 sm:h-11 text-base sm:text-sm pr-10"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {f.secret && (
                      <button
                        type="button"
                        onClick={() => setRevealed((r) => ({ ...r, [f.key]: !r[f.key] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                        aria-label={isRevealed ? "Hide" : "Show"}
                      >
                        {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={onSave} disabled={saving} size="sm" className="min-h-[40px] gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
