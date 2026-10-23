# Rule: UI/UX Standards & Dual Co-Branding Guidelines

## 🎯 Purpose
Defines the visual design system, CSS variables, and dual co-branding rules separating the consumer storefront (**Anonna Mart**) from the administrative operations suite (**GrowMate Admin**).

---

## 🎨 1. The Dual Brand Identity

This repository serves two distinct audiences with carefully separated design languages:

```text
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│     Anonna Mart Storefront      │   │    GrowMate Admin Panel         │
│  Target: Consumer Shoppers      │   │  Target: Store Operations Staff │
│  Palette: Emerald, Warm Forest  │   │  Palette: Electric Blue & Slate │
│  Theme: Light & Dark Modes      │   │  Theme: Client Live Master Admin│
└─────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 🌿 2. Storefront Brand: Anonna Mart
* **Primary Color:** Emerald Green (`#047857` / `hsl(160, 84%, 39%)`).
* **Accent Color:** Warm Gold / Amber (`#d97706`).
* **Visual Style:** Organic, inviting Bangladeshi e-commerce aesthetic with clean card grids, badge accents, and warm parchment neutrals.
* **Logo:** Uses `/logo.png` rendered in a rectangular aspect ratio.

---

## ⚡ 3. Admin Brand: GrowMate Admin Suite
* **Theme Token:** Electric Blue (`hsl(211, 100%, 50%)`).
* **Scope:** Scoped automatically under `.admin-shell`, `[data-admin="true"]`, and `body.admin-portal`.
* **Co-Branding:**
  * The store name is **Anonna Mart**.
  * The administrative suite is **GrowMate Admin Panel**.
  * The partner logo `/growmate-logo.png` must be subtly visible in the Admin Header and Sidebar.
  * Browser page title tag under `/admin/*` must default to:  
    `GrowMate Admin Panel — Anonna Mart`
  * Favicon under `/admin/*` is `/growmate-logo.png`.
