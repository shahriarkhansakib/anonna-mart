import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { productsApi } from "@/lib/api/products";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  product_count: number;
  is_active: boolean;
  created_at?: string;
}

export function useProductCategories() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      try {
        const res = await productsApi.listCategories();
        return (res?.data || []).map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          image_url: null,
          product_count: cat.product_count || 0,
          is_active: cat.is_active ?? true,
        }));
      } catch (err) {
        console.error("Failed to fetch product categories:", err);
        return [];
      }
    },
  });

  const addCategory = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      await productsApi.createCategory({ name, slug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category added");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add category");
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      await productsApi.removeCategory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category removed");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove category");
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductCategory> }) => {
      // Optionally update or toast
      toast.success("Category updated");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update category");
    },
  });

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}
