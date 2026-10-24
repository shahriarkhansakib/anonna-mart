# Design Decisions — Anonna Mart UI/UX

This document records the verified design direction for the Anonna Mart storefront
and GrowMate Admin Portal. Every entry is based on evidence found in the actual
codebase. Proposals are clearly marked and require approval before implementation.

---

## 1. Verified Design Choices (Found in Codebase)

### 1.1 Overall Visual Style

The storefront aims for an **organic, warm, trustworthy** feel suited to a
Bangladesh-focused multi-category e-commerce store. The palette evokes natural
quality: forest greens, warm ivories, and restrained gold accents.

**Evidence:** `apps/web/app/globals.css` comment — *"Anonna Mart Organic Luxury
Palette"*.

### 1.2 Background & Surface

- **Page background (light):** `hsl(48, 20%, 98%)` — a very warm off-white,
  closer to ivory than pure white. Verified in `globals.css` `--background`.
- **Card surface:** Pure white (`hsl(0, 0%, 100%)`). Verified in `--card`.
- **Page background (dark):** `hsl(150, 18%, 6%)` — deep forest dark.
- **Card surface (dark):** `hsl(150, 14%, 10%)`.

### 1.3 Brand Identity Separation

Two entirely separate visual identities coexist in the same codebase:

| Context | Route | Primary Color | Theme Trigger |
| :--- | :--- | :--- | :--- |
| **Anonna Mart Storefront** | `/` | Emerald Forest Green `--primary: 150 60% 18%` | Default `:root` |
| **GrowMate Admin** | `/admin` | Electric Blue `--primary: 211 100% 50%` | `.admin-shell`, `html[data-admin="true"]` |

This separation is **non-negotiable** and enforced by ADR-0003.

### 1.4 Hero Section

Current implementation uses a **two-column split layout** on `lg` and above:
- Left column: cream/ivory background (`#fbf8ed`), headline, CTA buttons, and
  trust micro-badges.
- Right column: full-bleed product photography with an emerald overlay gradient.

Headline text is currently sans-serif. The hero image is `homedecor.jpeg` only.

### 1.5 Font Stack

No custom web font is loaded via `next/font` or a `<link>` tag. The project uses
a **system font stack** defined in `globals.css`:

```css
--font-sans:  -apple-system, BlinkMacSystemFont, "SF Pro Text",
              "Plus Jakarta Sans", system-ui, sans-serif;
--font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display",
                "Plus Jakarta Sans", system-ui, sans-serif;
```

`Plus Jakarta Sans` is listed as a preference fallback but must be available on
the host OS or served externally to actually render — it is **not** explicitly
loaded in the project.

### 1.6 Icon Library

**Lucide React** (`lucide-react ^1.14.0`) is the sole icon library. Do not
introduce Heroicons, Phosphor, or any other icon package.

### 1.7 Component Primitives

**Radix UI** (headless) + **shadcn/ui** patterns + **Tailwind CSS v4**. All
shared UI components live in `apps/web/components/ui/`. Do not duplicate
primitives that already exist there.

### 1.8 Animation

**Framer Motion** (`^12.38.0`) is installed. Use it sparingly for intentional
transitions (drawer slides, modal entrances). Do not add idle or decorative
animations. Respect `prefers-reduced-motion` by wrapping animations in
`@media (prefers-reduced-motion: no-preference)`.

### 1.9 Toast Notifications

**Sonner** (`^2.0.7`) with `richColors`. Toasts are positioned `top-right`.
Do not add a second toast or snackbar system.

### 1.10 Radius Scale

Defined in `globals.css` — base `--radius: 0.875rem` with a derived scale
(`-sm`, `-md`, `-lg`, `-xl`, `-2xl`, `-3xl`). Map to Tailwind classes:
`rounded-xl` (cards), `rounded-full` (pills/badges), `rounded-2xl` (hero).

---

## 2. Design Reference PDF

**File expected at:** `docs/design-reference/comparasion.pdf`
**Status: NOT FOUND.** The file does not exist in the repository at the time of
this system setup (October 2026).

A visual design comparison was performed separately based on a user-provided
screenshot/image of the desired target design. Key observations from that
reference are recorded as **proposals** below, not as verified facts.

---

## 3. Proposals Requiring Approval

These ideas are consistent with the existing brand direction but require
explicit approval before implementation, because they change something visible
to the end user or introduce new content.

### PROPOSAL-001: Top Announcement Bar

**Description:** A slim green bar above the navigation showing trust perks
(Free Delivery threshold, Cash on Delivery, Authentic Products, Easy Returns)
and a clickable phone number link.

**Why it matters:** Reduces buyer hesitation by surfacing guarantees before
any product is seen. Standard in BD e-commerce (Daraz, Chaldal).

**What it needs:** Confirmation of the actual customer care number and exact
free-delivery threshold to display (avoids publishing unverified claims).

**Status: Awaiting approval.**

---

### PROPOSAL-002: Editorial Serif Headline Font for Hero

**Description:** Introduce a serif font (e.g., *Playfair Display* via
`next/font/google`) applied selectively to the hero H1 and major section
headings.

**Why it matters:** Adds brand authority and distinguishes Anonna Mart from
generic utility e-commerce sites.

**Constraint:** Would add a font-loading dependency. Must be evaluated against
Core Web Vitals (LCP impact) before adding.

**Status: Awaiting approval.**

---

### PROPOSAL-003: Light Category Cards

**Description:** Replace the current dark overlay category cards
(`bg-brand-950` fill) with light, elevated white cards that use product cutout
imagery on cream backgrounds.

**Why it matters:** Lighter cards have higher click-through rates; product
images are more legible against white.

**What it needs:** Appropriate cutout or isolated product images per category
(the current images are lifestyle photographs, not cutouts).

**Status: Awaiting approval.**

---

### PROPOSAL-004: Always-Visible "Add to Cart" on Product Cards

**Description:** Add a full-width, persistent `[Add to Cart]` button at the
bottom of every `ProductCard` component, visible without hover or opening
the quick-view modal.

**Why it matters:** Reduces purchasing friction for decisive buyers; industry
standard (Shopify, Amazon, Daraz).

**What it needs:** Design confirmation on button placement (below price vs.
overlaid), and whether to keep the existing hover-reveal pattern in parallel.

**Status: Awaiting approval.**

---

### PROPOSAL-005: Customer Testimonials Section

**Description:** A dedicated section (*"What Our Customers Say"*) with a
carousel of real review cards featuring customer names, Bangladeshi city/division,
star rating, and review text.

**Why it matters:** Social proof is the strongest trust signal in developing
e-commerce markets.

**Critical constraint:** Do **not** implement with fabricated reviews, fake
names, or invented locations. This section may only be added once a real review
data source (API endpoint or CMS) is confirmed.

**Status: Awaiting approval and a real data source.**

---

### PROPOSAL-006: Newsletter Subscription Form in Footer

**Description:** An email input + subscribe button in the footer.

**Critical constraint:** Must **not** be added as a decorative element with no
backend. Requires a confirmed email service integration (Resend, Mailchimp, etc.)
and approval of a subscribe API endpoint before any UI is added.

**Status: Awaiting approval and backend integration plan.**

---

### PROPOSAL-007: Social Media Links in Footer

**Description:** Facebook, Instagram, YouTube, TikTok icon links in a new
footer column or alongside the existing content.

**Critical constraint:** URLs must be real verified Anonna Mart social accounts.
Do not use placeholder or example URLs.

**Status: Awaiting confirmed social account URLs.**
