# Rule: UI Prohibitions & Protected Systems (Avoid List)

## 🎯 Purpose
Defines strictly prohibited patterns, forbidden code practices, and the inventory of protected functional systems that must never be broken or regressed during visual design or frontend refactoring.

---

## 🛡️ 1. Protected Functional Systems — Zero-Regression Contract
The following systems are fully functional in production and must remain 100% operational after any UI modification:

| System | Key Files | Critical Invariants |
| :--- | :--- | :--- |
| **Cart** | `CartContext.tsx`, `CartDrawer.tsx`, `page.tsx` | Must preserve item addition, quantity increments, drawer opening, and subtotal calculation |
| **Wishlist** | `WishlistContext.tsx`, `ProductCard.tsx` | Must persist active wishlist items to local state / user profile |
| **Product Filter & Search** | `page.tsx`, `ProductListingPage.tsx` | Real-time category filtering, price range sorting, and search term debounce |
| **Checkout & Logistics** | `CheckoutPage.tsx`, `/app/checkout/` | Steadfast delivery zone fee calculations (Inside/Outside Dhaka) and COD validation |
| **Authentication & PBAC** | `(auth)/`, `AdminAuthGuard.tsx`, `middleware.ts` | Better Auth session persistence, PBAC permission check, redirect protection |
| **Customer Account** | `app/account/`, `CustomerAccountLayout.tsx` | Addresses, order history, profile settings, and notes |
| **AI Support Chat** | `AIChatWidget.tsx`, `useSupportChat.ts` | TokenHarbor LLM streaming, conversation persistence, and session management |
| **Admin Operations** | `apps/web/views/admin/` | Server-side pagination, Steadfast courier consignment booking, Cloudinary uploads |

---

## ❌ 2. Fabricated and Mock Content — Strictly Prohibited
Never introduce unverified or fake content into storefront or admin components:
* ❌ **Fake Reviews & Ratings:** Do not invent customer testimonials, fake reviewer avatars, or fabricated 5-star ratings without live database backing.
* ❌ **Fake Hotline Numbers:** Do not introduce placeholder telephone numbers (e.g., `+880 1234-567890`) unless confirmed in store settings.
* ❌ **Unverified Business Policies:** Do not advertise unconfirmed guarantees (e.g. "Free shipping above ৳1,000" or "7-day instant returns") without dynamic configuration from `/api/settings`.
* ❌ **Dummy Form Submissions:** Do not add newsletter or callback forms that silently drop input without a real backend handler.

---

## 🚫 3. Prohibited Code Patterns

### 3.1 Data Layer & Architecture
* ❌ **Never** replace live API queries with hardcoded JSON fixtures in frontend components.
* ❌ **Never** import directly from `packages/db` or Drizzle ORM inside React Client Components.
* ❌ **Never** bypass the `useCart()` or `useWishlist()` contexts to manage temporary local state.

### 3.2 Component Lifecycle & Next.js Conventions
* ❌ **Never** mark a component `"use client"` unless it genuinely requires React hooks, browser events, or window APIs.
* ❌ **Never** convert Server Components into Client Components merely for cosmetic animation wrappers.
* ❌ **Never** suppress React key warnings using random `Math.random()` keys; always use canonical entity IDs.

### 3.3 Layout, Responsive & CSS Guardrails
* ❌ **Never** hardcode arbitrary pixel widths (`w-[342px]`); always use Tailwind grid columns or percentage scales.
* ❌ **Never** introduce horizontal page scrolling on mobile screens (`overflow-x-hidden` on body is a band-aid, not a fix; eliminate overflowing children).
* ❌ **Never** override core theme variables with `!important` inline styles.
* ❌ **Never** remove keyboard focus outlines (`outline-none`) without providing an explicit `:focus-visible` replacement ring.
