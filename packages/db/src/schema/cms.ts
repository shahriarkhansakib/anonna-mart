import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const cmsCategoryEnum = pgEnum("cms_category", ["nutrition", "health", "grooming", "news"]);

export const cmsArticles = pgTable("cms_articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  category: cmsCategoryEnum("category").notNull().default("nutrition"),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("published_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type CMSArticle = typeof cmsArticles.$inferSelect;
export type NewCMSArticle = typeof cmsArticles.$inferInsert;
