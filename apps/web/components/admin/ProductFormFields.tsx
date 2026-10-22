import { lazy, Suspense } from "react";
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
import { Textarea } from "@/components/ui/textarea";

const MultiImageUpload = lazy(() =>
  import("@/components/admin/MultiImageUpload").then((m) => ({ default: m.MultiImageUpload })),
);

import { Separator } from "@/components/ui/separator";
import { useProductCategories } from "@/hooks/useProductCategories";

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  compare_price: string;
  category: string;
  product_type: string;
  image_url: string;
  images: string[];
  stock: string;
  sku: string;
  badge: string;
  discount: string;
  is_active: boolean;
  is_featured: boolean;
}

interface ProductFormFieldsProps {
  formData: ProductFormData;
  onChange: (data: ProductFormData) => void;
}

export function ProductFormFields({ formData, onChange }: ProductFormFieldsProps) {
  const { categories } = useProductCategories();

  const update = (field: keyof ProductFormData, value: string | boolean) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-5 py-2">
      {/* Section 1: Basic Info */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Basic Information
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Product Images
            </Label>
            <Suspense fallback={<div className="h-32 rounded-xl bg-muted animate-pulse" />}>
              <MultiImageUpload
                value={formData.images}
                onChange={(urls) =>
                  onChange({ ...formData, images: urls, image_url: urls[0] || "" })
                }
              />
            </Suspense>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Name *
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Product name"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Brief product description"
              className="mt-1.5 rounded-xl min-h-[80px]"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 2: Pricing & Stock */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Pricing & Stock
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Price (৳) *
            </Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="0"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Compare Price (৳)
            </Label>
            <Input
              type="number"
              value={formData.compare_price}
              onChange={(e) => update("compare_price", e.target.value)}
              placeholder="Original price"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Stock
            </Label>
            <Input
              type="number"
              value={formData.stock}
              onChange={(e) => update("stock", e.target.value)}
              placeholder="0"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              SKU
            </Label>
            <Input
              value={formData.sku}
              onChange={(e) => update("sku", e.target.value)}
              placeholder="e.g., PRD-001"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Discount %
            </Label>
            <Input
              type="number"
              value={formData.discount}
              onChange={(e) => update("discount", e.target.value)}
              placeholder="0"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 3: Organization */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Organization
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Category *
            </Label>
            <Input
              list="product-category-options"
              value={formData.category}
              onChange={(e) => update("category", e.target.value)}
              placeholder="e.g., Clothing"
              className="mt-1.5 h-11 rounded-xl"
            />
            <datalist id="product-category-options">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} />
              ))}
            </datalist>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Product Type
            </Label>
            <Input
              value={formData.product_type}
              onChange={(e) => update("product_type", e.target.value)}
              placeholder="e.g., Food, Toys"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Badge
            </Label>
            <Input
              value={formData.badge}
              onChange={(e) => update("badge", e.target.value)}
              placeholder="e.g., New, Sale, Hot"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 4: Status */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Status
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Product is visible in the store</p>
            </div>
            <Switch checked={formData.is_active} onCheckedChange={(v) => update("is_active", v)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div>
              <p className="text-sm font-medium">Featured</p>
              <p className="text-xs text-muted-foreground">Show in featured products section</p>
            </div>
            <Switch
              checked={formData.is_featured}
              onCheckedChange={(v) => update("is_featured", v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
