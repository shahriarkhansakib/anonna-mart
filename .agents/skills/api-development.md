# Skill: Developing Endpoints with Hono & Zod

## 🎯 Purpose
Guides agents through building high-performance, edge-compatible API endpoints using Hono v4, Zod schema validation, and PBAC access guards.

---

## 🏗️ 1. Endpoint Architecture Blueprint

Every feature module in `apps/api/src/features/<feature>/` should follow this structure:

```text
apps/api/src/features/<feature>/
├── <feature>.route.ts       # Hono sub-app, route definitions & middleware guards
├── <feature>.controller.ts  # Request handler functions, DB queries & business logic
├── <feature>.schema.ts      # (Optional) Zod request / response schemas
└── <feature>.test.ts        # Vitest integration and unit tests
```

---

## 📝 2. Step-by-Step Implementation

### Step 1: Define Route with Input Validation & Permission Guard
```ts
// apps/api/src/features/products/products.route.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requirePermission } from "../../infra/middleware/require-permission";
import { PERMISSIONS } from "@growmate/db";
import { createProduct, getProducts } from "./products.controller";

export const productsRoute = new Hono()
  .get("/", getProducts)
  .post(
    "/",
    requirePermission(PERMISSIONS.PRODUCTS_CREATE),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1, "Product name is required"),
        slug: z.string().min(1),
        categoryId: z.string().min(1),
        price: z.number().positive(),
        sku: z.string().min(1),
        stockQuantity: z.number().int().min(0).default(0),
      })
    ),
    createProduct
  );
```

### Step 2: Implement Controller Logic
```ts
// apps/api/src/features/products/products.controller.ts
import type { Context } from "hono";
import { db, products, eq } from "@growmate/db";

export async function getProducts(c: Context) {
  const allProducts = await db.select().from(products).where(eq(products.isActive, true));
  return c.json({ success: true, data: allProducts });
}

export async function createProduct(c: Context) {
  const body = c.req.valid("json");
  const [created] = await db.insert(products).values(body).returning();
  return c.json({ success: true, data: created }, 201);
}
```

### Step 3: Mount in Server Entrypoint
```ts
// apps/api/src/server.ts
import { productsRoute } from "./features/products/products.route";

// Mount feature route under /api prefix
app.route("/api/products", productsRoute);
```

---

## 🛡️ 3. Standard API Error Response Format
All error responses must return standard JSON structures:
```json
{
  "success": false,
  "error": "Human readable error message",
  "code": "ERROR_CODE"
}
```
For Zod validation failures, `@hono/zod-validator` returns HTTP `400` with the validation error details.
