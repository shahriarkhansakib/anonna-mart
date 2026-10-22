import { apiFetch } from "../api-client";

export interface CMSArticleItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverImage: string | null;
  category: "nutrition" | "health" | "grooming" | "news";
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export const cmsApi = {
  listArticles: (params?: { category?: string; published?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.category && params.category !== "all") sp.set("category", params.category);
    if (params?.published !== undefined) sp.set("published", String(params.published));
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<{ success: boolean; data: CMSArticleItem[]; count: number }>(
      `/api/cms/articles${qs}`,
    );
  },
  getArticle: (id: string) =>
    apiFetch<{ success: boolean; data: CMSArticleItem }>(`/api/cms/articles/${id}`),
  createArticle: (data: Partial<CMSArticleItem> & Record<string, any>) =>
    apiFetch<{ success: boolean; data: CMSArticleItem }>("/api/cms/articles", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateArticle: (id: string, data: Partial<CMSArticleItem> & Record<string, any>) =>
    apiFetch<{ success: boolean; data: CMSArticleItem }>(`/api/cms/articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteArticle: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/cms/articles/${id}`, {
      method: "DELETE",
    }),
  getStats: () =>
    apiFetch<{
      success: boolean;
      data: { total: number; published: number; drafts: number; featured: number };
    }>("/api/cms/stats"),
};
