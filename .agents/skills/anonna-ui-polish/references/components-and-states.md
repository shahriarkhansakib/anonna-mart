# Components & Interaction States — Anonna Mart

Guidelines for visual behavior and interaction patterns across the Anonna Mart
storefront UI. All component descriptions are based on the verified codebase in
`apps/web`.

---

## 1. Product Card (`ProductCard.tsx`)

**Location:** `apps/web/components/storefront/ProductCard.tsx`

### Anatomy

```
┌─────────────────────────────────┐
│  [Discount Badge]  [♥ Wishlist] │  ← Absolute overlays on image
│                                 │
│         Product Image           │  ← Square aspect ratio, object-cover
│         (click → Quick View)    │
│─────────────────────────────────│
│  CATEGORY LABEL (emerald, xs)   │
│  Product Name (sm, semibold,    │
│  max 2 lines, clamp)            │
│  ★ 4.8 (320)   (if rating set)  │
│─────────────────────────────────│
│  ৳1,590   ~~৳1,990~~            │  ← Price + optional strikethrough
│  [ Add to Cart ]                │  ← Full-width button
└─────────────────────────────────┘
```

### States

| State | Visual Treatment |
| :--- | :--- |
| **Default** | White card, 1px `border-border`, `shadow-xs` |
| **Hover** | `hover:border-emerald-600/50`, `hover:shadow-lg`, image scales `1.04x` |
| **Wished (wishlist on)** | Heart icon: `fill-current text-rose-500 border-rose-400` |
| **Wished (wishlist off)** | Heart icon: `text-muted-foreground border-border` |
| **Discount present** | Gold badge top-left: `bg-gold-400 text-brand-950` |
| **No discount** | Badge absent — do not render an empty badge element |
| **Out of stock** | Add to Cart button: `disabled` + `opacity-50 cursor-not-allowed` text change to "Out of Stock" |
| **Loading** | Use `Skeleton` component from `components/ui/skeleton.tsx` — same card dimensions |

### Rules

- Product name: `line-clamp-2`. Never allow unbounded height growth.
- Category label: `line-clamp-1`, `uppercase`, `tracking-wider`.
- Ratings and review count: only render if `product.rating` is a number and
  `typeof product.rating === "number"`. Do not fabricate rating data.
- Do not hardcode product details. All data comes from the live API via React
  Query.

---

## 2. Section Heading (`SectionHeading`)

**Location:** `apps/web/app/page.tsx` (local component)

### Anatomy

```
[EYEBROW TEXT — xs, bold, uppercase, tracking, emerald]
Section Title (2xl–3xl, black)
Optional description (sm, muted-foreground)
                              [Optional action / "View all" link]
```

### Rules

- Eyebrow text: always `uppercase tracking-[0.2em] text-emerald-700
  dark:text-emerald-400`.
- Title: `text-2xl font-black sm:text-3xl tracking-tight text-foreground`.
- Action element: right-aligned, only `sm+` — stacks below title on mobile.

---

## 3. Navigation Links (Desktop Sub-Nav)

- Active state: bottom border indicator `after:scale-x-100`, `text-brand-900`.
- Hover state: `hover:text-brand-900 hover:after:scale-x-100`.
- Inactive: `text-slate-600 after:scale-x-0`.
- Transition: `duration-200` on color and pseudo-element scale.
- All links must have clear hover and focus states.

---

## 4. Category Pill Filter Buttons

**Location:** All Products section, `page.tsx`

| State | Classes |
| :--- | :--- |
| **Selected** | `bg-brand-900 text-white shadow-sm` |
| **Unselected** | `bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50` |

- `aria-pressed` must reflect the current selection state.
- Minimum height: `min-h-10` (touch target).
- Shape: `rounded-full` pill.

---

## 5. CTA Buttons

### Primary Button (Shop Now, Add to Cart)

```
bg-[#064e3b] text-white rounded-full px-6 py-3
hover:bg-emerald-950 hover:shadow-lg
focus-visible:ring-2 focus-visible:ring-[#D4AF37]
```

### Secondary / Ghost Button (Explore Categories)

```
rounded-full px-3 text-[#064e3b]
underline decoration-[#064e3b]/30 underline-offset-4
hover:decoration-[#064e3b]
```

### Destructive Button (Delete, Remove)

```
bg-destructive text-destructive-foreground
hover:bg-destructive/90
```

### Disabled State (any button)

```
opacity-50 cursor-not-allowed pointer-events-none
```

Never remove the button from the DOM to hide disabled state — use the
`disabled` HTML attribute alongside the visual styling.

---

## 6. Cart & Wishlist Drawers

**Locations:**
- `apps/web/components/storefront/CartDrawer.tsx`
- `apps/web/components/storefront/StorefrontPanels.tsx` (`WishlistDrawer`)

### Behavior

- Slide in from the right on open; slide out on close.
- Full-screen width on mobile (`w-full`); `sm:max-w-md` on larger screens.
- `z-40` — above the sticky header (`z-30`).
- Closing triggers: `Escape` key, backdrop overlay click, explicit close button.
- Close button must have `aria-label="Close cart"` or `aria-label="Close wishlist"`.
- Focus must return to the triggering element when the drawer closes.

### Quantity Controls

- Decrease / Increase: minimum target `h-8 w-8`.
- Input field for quantity: `min-w-[2.5rem]`, centered text.
- Remove item: shows a trash icon; `aria-label="Remove [product name] from cart"`.

### Empty State

- Cart: Icon + "Your cart is empty" + "Continue Shopping" link to `#products`.
- Wishlist: Icon + "Your wishlist is empty" + CTA.
- Do not show a loading spinner on an empty drawer.

---

## 7. Product Quick-View Modal (`ProductDetails`)

**Location:** `apps/web/components/storefront/StorefrontPanels.tsx`

- Renders product images (gallery), name, category, price, description, stock.
- Add to Cart inside modal uses the same `handleAddToCart` handler.
- Must trap keyboard focus inside the modal while open.
- `aria-modal="true"` and `role="dialog"` required.
- Close: `Escape`, close button (`aria-label="Close product details"`), backdrop.

---

## 8. Loading States

Use the `Skeleton` component from `components/ui/skeleton.tsx` for all loading
states. Skeleton shapes should match the real content dimensions to minimize
layout shift.

| Context | Skeleton Shape |
| :--- | :--- |
| Product card | Square (image area) + 2 lines (name) + 1 line (price) |
| Category card | Aspect-ratio box + 1 line |
| Section heading | 2 lines of varying width |
| Trust pillars | 4 equally sized boxes |

The central loading state in the All Products section uses a `Loader2` spinner
(`animate-spin`) with a description: *"Loading catalog from database..."*

---

## 9. Empty States

Every section that can be empty must render a helpful empty state:

| Context | Icon | Message | Action |
| :--- | :--- | :--- | :--- |
| Search no results | `Search` icon | "No matching products found" | "Show all products" button |
| Cart empty | `ShoppingBag` icon | "Your cart is empty" | Link to products |
| Wishlist empty | `Heart` icon | "Nothing saved yet" | Link to products |

Empty states must never be blank white boxes.

---

## 10. Search Results

- Results count: `aria-live="polite"` — screen readers announce count changes.
- Active search query: shown as *Search results for "**{query}**"*.
- Clear filters button: visible when `query` or `categoryFilter !== "All"`.

---

## 11. Form & Input States

| State | Visual Treatment |
| :--- | :--- |
| **Default** | `border-border bg-muted/50` |
| **Focus** | `focus-within:border-emerald-600 ring-2 ring-emerald-600/15` |
| **Error** | `border-destructive` + error message below in `text-destructive text-sm` |
| **Disabled** | `opacity-50 cursor-not-allowed` |
| **Successful submit** | Sonner toast: `toast.success("...")` |
| **API error** | Sonner toast: `toast.error("...")` |

All form inputs must have an associated `<label>` (visible) or `aria-label`
(screen-reader only for search inputs).

---

## 12. Toast Notifications (Sonner)

- `toast.success()` — adding to cart, wishlist toggle, order placed.
- `toast.error()` — API failures, validation errors.
- `toast.info()` — neutral informational messages.
- Position: `top-right`. Configured globally in `layout.tsx`.
- Do not add a second notification system.

---

## 13. Theme Toggle

**Location:** `apps/web/components/common/ThemeToggle.tsx`

- Button must always have `aria-label` stating the current mode and what it
  will switch to (e.g., *"Switch to dark mode"*).
- Do not animate the icon with complex keyframes — a simple opacity or
  `rotate` transition is sufficient.

---

## 14. Logo (`Logo.tsx`)

- **Storefront:** Renders `/logo.png` or `/anonna-mart-logo.png`.
- **Admin:** Renders `/growmate-logo.png` alongside the Anonna Mart identity.
- Dimensions must be provided as explicit `width` and `height` props to
  avoid Cumulative Layout Shift (CLS).
- In the dark footer: wrap in `bg-white p-2 rounded-xl` for legibility.

---

## 15. Accessibility Checklist (Per Component)

Before finalizing any component change:

- [ ] All interactive elements are reachable via `Tab` key.
- [ ] Focus order is logical and matches visual order.
- [ ] All icon-only buttons have `aria-label`.
- [ ] Images have meaningful `alt` text (or `alt=""` if purely decorative).
- [ ] Form inputs have associated labels.
- [ ] Dynamic content changes are announced via `aria-live` where appropriate.
- [ ] Color is not the only means of conveying information.
- [ ] Sufficient contrast for text and interactive elements.
- [ ] Modal / drawer traps focus correctly.
