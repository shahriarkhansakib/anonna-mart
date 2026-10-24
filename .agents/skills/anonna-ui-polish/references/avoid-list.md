# Avoid List — Anonna Mart UI

This document defines prohibited patterns, common mistakes, and high-risk
changes that must not be made during UI polish tasks. Check this list before
every edit.

---

## 1. Protected Functional Systems — Do Not Break

The following systems are working and must remain fully functional after any
UI change. Any modification that touches these systems requires an explicit
scope review and user approval.

| System | Key Files |
| :--- | :--- |
| **Cart** | `CartContext.tsx`, `CartDrawer.tsx`, `StorefrontPanels.tsx`, `page.tsx` |
| **Wishlist** | `WishlistContext.tsx`, `StorefrontPanels.tsx`, `page.tsx` |
| **Product Quick-View** | `StorefrontPanels.tsx` (`ProductDetails`) |
| **Product Listing & Filtering** | `page.tsx` — filter pills, search, `filteredProducts` memo |
| **Search** | `page.tsx` — `query` state, `handleSearch`, `handleAddToCart` |
| **Checkout** | `apps/web/components/storefront/CheckoutPage.tsx`, `apps/web/app/checkout/` |
| **Authentication** | `apps/web/app/(auth)/`, `apps/web/app/login/`, `apps/web/middleware.ts` |
| **Account** | `apps/web/app/account/` |
| **AI Chat Widget** | `apps/web/components/storefront/AIChatWidget.tsx` |
| **Admin Portal** | `apps/web/app/admin/` and all `apps/web/components/admin/` |
| **API Layer** | `apps/api/` — all routes, controllers, and middleware |
| **Database** | `packages/db/` — schema, relations, migrations |

---

## 2. Fake and Unverified Content — Strictly Prohibited

Never add any of the following to the UI without verified, real data:

- ❌ Fabricated customer reviews, testimonials, or star ratings.
- ❌ Invented customer names, photos, or locations.
- ❌ Fake hotline numbers or customer-care phone numbers.
- ❌ Unconfirmed free-delivery thresholds (e.g., "Free delivery over ৳1,000"
  if this is not the actual business policy).
- ❌ Unconfirmed return policies (e.g., "7-day returns" if not verified).
- ❌ Placeholder social media URLs (e.g., `https://facebook.com/example`).
- ❌ A newsletter subscribe form that silently discards submitted emails (no
  backend = no form).
- ❌ Stock status shown as "In Stock" when `product.stock` is not checked.
- ❌ Discount percentages calculated inconsistently with `getDiscountPercent()`.

---

## 3. Prohibited Code Patterns

### 3.1 Data Integrity
- ❌ Replace live API data with hardcoded or mocked product arrays.
- ❌ Import directly from `packages/db` or any Drizzle ORM module inside
  React components.
- ❌ Add `fetch()` calls inside Client Components when a React Query hook
  already exists for the same data.
- ❌ Bypass the `useCart()` or `useWishlist()` contexts to manage cart/wishlist
  state locally.

### 3.2 Component Architecture
- ❌ Add `"use client"` to layout files, Server Components, or components that
  do not use browser-only APIs or React hooks.
- ❌ Duplicate existing UI primitives from `components/ui/` (Button, Dialog,
  Sheet, Skeleton, etc.) — reuse what exists.
- ❌ Create inline SVG icons when the equivalent exists in `lucide-react`.
- ❌ Install new icon libraries (Heroicons, Phosphor, FontAwesome, etc.).
- ❌ Add a second font-loading mechanism (Google Fonts `<link>`, Adobe Fonts
  embed) without approval and a Core Web Vitals impact assessment.

### 3.3 Styling
- ❌ Use arbitrary Tailwind values (`text-[13.7px]`, `bg-[#abc123]`) for
  values that already exist in the token system.
- ❌ Introduce new CSS files or `<style>` tags when Tailwind utilities cover
  the need.
- ❌ Override `--primary`, `--background`, or other semantic tokens inline on
  a component without global consideration.
- ❌ Hard-code hex color values that duplicate existing `brand-*` or `gold-*`
  tokens.
- ❌ Use `!important` in Tailwind classes (`!bg-red-500`) except as a last
  resort for third-party overrides.
- ❌ Set `z-index` values arbitrarily (e.g., `z-[9999]`). Use the established
  layer: `z-10` content, `z-20` mobile menu, `z-30` header, `z-40` drawers,
  `z-50` modals.

### 3.4 Accessibility
- ❌ Remove `aria-label` from icon-only buttons (Search, Close, Wishlist, Cart).
- ❌ Remove `aria-live` from search result counts or dynamic regions.
- ❌ Use `outline-none` without a replacement focus ring.
- ❌ Remove the `role="dialog"` and focus trap from modals.
- ❌ Set `tabIndex="-1"` on naturally focusable elements without justification.

### 3.5 Branding Isolation
- ❌ Apply Anonna Mart brand colors (emerald green `brand-*`) inside the
  admin portal (`/admin`).
- ❌ Apply GrowMate Electric Blue (`hsl(211, 100%, 50%)`) anywhere on the
  consumer storefront (`/`).
- ❌ Add GrowMate branding or logos to storefront pages.
- ❌ Change the storefront favicon or Open Graph image without approval.

---

## 4. Common UI Mistakes to Avoid

### 4.1 Layout & Overflow
- ❌ Removing `overflow-x-clip` from the root wrapper — decorative elements
  will cause horizontal scroll.
- ❌ Using `position: fixed` on elements without accounting for the `z-30`
  sticky header.
- ❌ Forgetting `sizes` prop on `next/image` components using `fill` — this
  causes browser warnings and CLS.
- ❌ Removing `line-clamp-2` from product names — long names will break the
  card grid layout.
- ❌ Setting a fixed pixel height on product cards instead of using `h-full`
  in a flex or grid container.

### 4.2 State Management
- ❌ Lifting state unnecessarily when a context (`useCart`, `useWishlist`)
  already manages it globally.
- ❌ Resetting `categoryFilter` or `query` state in a way that is not
  connected to the existing `showAllProducts()` or `selectCategory()` handlers.

### 4.3 Content Duplication
- ❌ Adding a second sticky header.
- ❌ Adding a second footer.
- ❌ Adding a second search bar outside the established header locations.
- ❌ Adding a second toast/notification system alongside Sonner.

### 4.4 Performance
- ❌ Importing the entire Framer Motion library for a single CSS transition
  that Tailwind can handle.
- ❌ Using `useEffect` to set state that could be derived via `useMemo`.
- ❌ Loading product images eagerly (`priority`) for images below the fold.

---

## 5. Out-of-Scope Changes

The following are explicitly out of scope for UI polish tasks and require a
separate explicit request:

- Database schema changes.
- API endpoint additions, modifications, or removals.
- Authentication logic changes.
- Payment or courier integration changes.
- Environment variable additions.
- `package.json` dependency changes.
- Changes to `apps/web/middleware.ts`.
- Changes to `packages/db/src/seed.ts`.
- Any commit, push, or deployment action.

---

## 6. Proposals Disguised as "Small Improvements"

The following requests often sound simple but carry hidden risks. Treat each
as a proposal requiring approval before implementation:

| Request | Hidden Risk |
| :--- | :--- |
| "Add a newsletter signup" | Needs a real backend integration |
| "Show customer reviews" | Needs real data; fake reviews are prohibited |
| "Add social media links" | Needs verified URLs from the business owner |
| "Add a contact/support section" | Needs verified phone number and address |
| "Show free delivery threshold" | Must match actual business logistics policy |
| "Add a countdown timer for deals" | Needs real expiry data from the backend |
| "Add a currency or region selector" | Multi-currency is not implemented |
| "Add a product recommendation section" | Needs a real recommendation API |
