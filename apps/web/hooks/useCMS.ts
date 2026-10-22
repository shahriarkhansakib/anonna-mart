import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cmsApi } from "@/lib/api/cms";

export interface CMSArticle {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  summary?: string | null;
  featured_image: string | null;
  cover_image?: string | null;
  status: string;
  author_id: string;
  category: string;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CMSCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

interface ArticleFilters {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  perPage?: number;
  adminMode?: boolean;
}

function formatArticle(a: any): CMSArticle {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    content: a.content || "",
    excerpt: a.summary || a.excerpt || "",
    summary: a.summary || a.excerpt || "",
    featured_image: a.coverImage || a.cover_image || a.featured_image || null,
    cover_image: a.coverImage || a.cover_image || a.featured_image || null,
    status: a.published ? "published" : "draft",
    author_id: a.authorId || a.author_id || "admin",
    category: a.category || "nutrition",
    tags: a.tags || [],
    published: !!a.published,
    published_at: a.publishedAt || a.published_at || null,
    created_at: a.createdAt || a.created_at || new Date().toISOString(),
    updated_at: a.updatedAt || a.updated_at || new Date().toISOString(),
  };
}

export const useCMSArticles = (filters: ArticleFilters = {}) => {
  const { status, category, search, page = 1, perPage = 12, adminMode = false } = filters;

  return useQuery({
    queryKey: ["cms-articles", { status, category, search, page, perPage, adminMode }],
    queryFn: async () => {
      const res = await cmsApi.listArticles({ category });
      let list = (res.data || []).map(formatArticle);

      if (!adminMode) {
        list = list.filter((a) => a.published);
      } else if (status && status !== "all") {
        list = list.filter((a) => a.status === status);
      }

      if (search) {
        const q = search.toLowerCase();
        list = list.filter((a) => a.title.toLowerCase().includes(q));
      }

      const total = list.length;
      const start = (page - 1) * perPage;
      const paginated = list.slice(start, start + perPage);

      return { articles: paginated, total };
    },
  });
};

export const useCMSArticle = (id: string | undefined) => {
  return useQuery({
    queryKey: ["cms-article", id],
    queryFn: async () => {
      if (!id) throw new Error("Article ID required");
      const res = await cmsApi.getArticle(id);
      return formatArticle(res.data);
    },
    enabled: !!id,
  });
};

export const useCMSArticleBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["cms-article-slug", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Article slug required");
      const res = await cmsApi.listArticles();
      const match = (res.data || []).find((a: any) => a.slug === slug);
      if (!match) throw new Error("Article not found");
      return formatArticle(match);
    },
    enabled: !!slug,
  });
};

export const useCreateArticle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (article: Partial<CMSArticle>) => {
      const res = await cmsApi.createArticle({
        title: article.title || "Untitled Article",
        slug: article.slug,
        summary: article.excerpt || article.summary,
        content: article.content || "",
        coverImage: article.featured_image || article.cover_image,
        category: (article.category as any) || "nutrition",
        published: article.status === "published",
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-articles"] });
      qc.invalidateQueries({ queryKey: ["cms-stats"] });
      toast.success("Article created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateArticle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CMSArticle> & { id: string }) => {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.slug !== undefined) payload.slug = updates.slug;
      if (updates.summary !== undefined || updates.excerpt !== undefined) {
        payload.summary = updates.summary || updates.excerpt;
      }
      if (updates.content !== undefined) payload.content = updates.content;
      if (updates.featured_image !== undefined || updates.cover_image !== undefined) {
        payload.coverImage = updates.featured_image || updates.cover_image;
      }
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.status !== undefined) payload.published = updates.status === "published";

      await cmsApi.updateArticle(id, payload);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["cms-articles"] });
      qc.invalidateQueries({ queryKey: ["cms-article", vars.id] });
      qc.invalidateQueries({ queryKey: ["cms-stats"] });
      toast.success("Article updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteArticle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await cmsApi.deleteArticle(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-articles"] });
      qc.invalidateQueries({ queryKey: ["cms-stats"] });
      toast.success("Article deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useCMSCategories = () => {
  return useQuery({
    queryKey: ["cms-categories"],
    queryFn: async () => {
      return [
        { id: "nutrition", name: "Nutrition", slug: "nutrition", description: "Food & Diet", is_active: true },
        { id: "health", name: "Health", slug: "health", description: "Health & Wellness", is_active: true },
        { id: "grooming", name: "Grooming", slug: "grooming", description: "Hygiene & Grooming", is_active: true },
        { id: "news", name: "News", slug: "news", description: "Announcements & News", is_active: true },
      ] as CMSCategory[];
    },
    staleTime: 1000 * 60 * 10,
  });
};

export const useCMSStats = () => {
  return useQuery({
    queryKey: ["cms-stats"],
    queryFn: async () => {
      const res = await cmsApi.getStats();
      return res.data;
    },
  });
};
