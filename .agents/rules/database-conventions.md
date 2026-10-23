# Rule: Database Conventions & Drizzle ORM Standards

## 🎯 Purpose
Enforces database design conventions, schema rules, foreign key constraints, and indexing best practices for PostgreSQL and Drizzle ORM.

---

## 🏷️ 1. Identifiers & Naming Standards
* **Database Name:** The only canonical database name is `anonna_mart`.
* **Table Names:** Plural snake_case (e.g., `products`, `delivery_zones`, `order_items`).
* **Column Names:** snake_case in SQL, mapped to camelCase in TypeScript:
  ```ts
  stockQuantity: integer("stock_quantity").notNull().default(0),
  categoryId: text("category_id").notNull().references(() => categories.id),
  ```
* **No Hyphens:** PostgreSQL identifiers must never contain hyphens (`-`). Always use underscores (`_`).

---

## 🔗 2. Mandatory Relation Invariants (Drizzle Studio Rule)
Whenever you define a relationship between two tables in Drizzle:
1. **Parent Table:** Defines `many()`:
   ```ts
   export const ordersRelations = relations(orders, ({ many }) => ({
     items: many(orderItems),
   }));
   ```
2. **Child Table (MANDATORY):** Must define `one()` with explicit `fields` and `references`:
   ```ts
   export const orderItemsRelations = relations(orderItems, ({ one }) => ({
     order: one(orders, {
       fields: [orderItems.orderId],
       references: [orders.id],
     }),
   }));
   ```
3. **Circular Dependency Prevention:** If Table A and Table B reference each other across different files, export the relation definitions from the primary feature file (e.g., `products.ts`) or export them cleanly from `packages/db/src/schema/index.ts`.

---

## ⚡ 3. Foreign Keys & Indexing
* Always index foreign key columns:
  ```ts
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_sku_idx").on(table.sku),
  ]
  ```
* Use `onDelete: "cascade"` for tightly coupled children (e.g. `order_items` when an order is deleted).
* Use `onDelete: "restrict"` for critical parent entities (e.g. `categories` when products belong to it).
