# Responsive Design — Anonna Mart

Rules and conventions for building layouts that work correctly across mobile,
tablet, laptop, and desktop. All breakpoints are the **Tailwind CSS v4
defaults** used throughout `apps/web`. Do not introduce custom breakpoints
unless they solve a documented, specific problem.

---

## 1. Breakpoint Reference

| Prefix | Min Width | Typical Device |
| :--- | :--- | :--- |
| *(none)* | 0px | Mobile-first base (≤ 639px) |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets in portrait |
| `lg:` | 1024px | Tablets in landscape, small laptops |
| `xl:` | 1280px | Laptops and desktops |
| `2xl:` | 1536px | Wide monitors |
| `xs:` | 480px | Defined in `globals.css` as `--breakpoint-xs`. Available for narrow-phone edge cases only. |

**Rule:** Always write mobile styles first (no prefix), then layer up with
`sm:`, `lg:`, and `xl:` as needed. Avoid `md:` overrides that conflict with
`sm:` — prefer a clean 3-tier mobile → tablet → desktop pattern.

---

## 2. Page Container

The main content constraint is:

```html
<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
```

- Maximum content width: `1280px` (`max-w-7xl`).
- Side padding: 16px mobile → 24px tablet → 32px desktop.
- Do not change this container or introduce a competing `container` utility
  inside storefront pages.

---

## 3. Header & Navigation

### Sticky Header
- Position: `sticky top-0 z-30`.
- Height: `h-14` mobile → `sm:h-16` desktop.
- Background: `bg-background/95 backdrop-blur-md` — semi-transparent blur.
- Do not change the `z-index` value. Cart/wishlist drawers use `z-40`+.

### Search Bar
- **Desktop (sm+):** Full-width flex input inside the header bar.
- **Mobile (< sm):** Moves to the secondary sub-navigation bar below the header.
- Both forms share the same `onSubmit` handler. Do not create a separate state.

### Sub-Navigation
- Desktop (`lg+`): Horizontal link bar with bottom-border active indicator.
- Mobile (< `lg`): Collapses into a dropdown menu triggered by the hamburger
  button. The drawer opens below the header and is `z-20`.

### Mobile Menu
- Contains nav links and the `CustomerProfileMenu`.
- Closes on link click or on outside tap.
- Must not clip outside the viewport horizontally.

### Action Icons (Wishlist, Cart, Profile)
- Minimum touch target: `h-11 w-11` (44px).
- Badge counters: `min-w-5` pill, positioned `absolute right-1 top-1`.

---

## 4. Hero Section

| Viewport | Layout |
| :--- | :--- |
| Mobile | Single column — text above, image below |
| `lg+` | Two columns: `grid-cols-[0.95fr_1.05fr]` |

- Minimum height: `min-h-[350px]` mobile → `xl:min-h-[400px]` wide.
- Image column: `min-h-[260px]` mobile → `lg:min-h-full`.
- CTA buttons: wrap on very narrow screens (`flex flex-wrap gap-3`).
- Trust micro-badges below CTAs: 2 columns mobile → 3 columns `sm+`.

---

## 5. Product Grids

The same responsive grid pattern applies to Featured, Offers, New Arrivals,
and All Products sections:

```html
<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
```

| Breakpoint | Columns |
| :--- | :--- |
| Mobile | 1 |
| `sm` (640px) | 2 |
| `md` (768px) | 3 |
| `lg` (1024px) | 4 |

- Gap: `gap-5` (20px) consistently.
- Do not use `gap-x` / `gap-y` splits unless there is a specific reason.
- Product cards use `h-full` to equalize row heights in the grid.

---

## 6. Category Cards

Current grid:

```html
<div class="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
```

| Breakpoint | Columns |
| :--- | :--- |
| Mobile | 2 |
| `sm` | 3 |
| `lg` | 5 (or more if categories expand) |

- Card aspect ratio: `aspect-[4/3]`.
- Images: `fill` with `object-cover`, `sizes` attribute provided for CLS prevention.

---

## 7. Special Offer Strip

Three-column layout only on `lg+`:

```
Mobile:    stacked (image → text → perks)
lg+:       grid-cols-[0.7fr_1.25fr_1fr]
```

- Image panel: hidden below `sm` is allowed; must remain above `lg`.

---

## 8. Trust Pillars / "Why Choose" Section

```html
<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
```

| Breakpoint | Columns |
| :--- | :--- |
| Mobile | 1 |
| `sm` | 2 |
| `lg` | 4 |

---

## 9. Footer

Current grid:

```
Mobile / sm:  grid-cols-1 → grid-cols-2
lg:           grid-cols-[2fr_1.2fr_1fr]
```

- Padding: `px-6 py-10 sm:px-8`.
- Footer logo: include a white background patch to maintain legibility on the
  dark footer (`bg-white p-2 rounded-xl`).
- Decorative leaf flourishes: `pointer-events-none`, positioned absolutely,
  `z-0` behind content.

---

## 10. Drawers (Cart & Wishlist)

- Both drawers slide in from the right.
- Width: `w-full sm:max-w-md` — full-screen on mobile, fixed width on desktop.
- `z-index`: `z-40` or above (must float above the sticky header at `z-30`).
- Scroll area: uses Radix `ScrollArea` inside the drawer body.
- Close behavior: `Escape` key and overlay click both close the drawer.

---

## 11. Product Quick-View Modal

- Rendered as a full-screen overlay modal on mobile.
- On `md+`: centered dialog with max-width constraint.
- Close: `Escape` key, close button (`aria-label="Close"`), and backdrop click.

---

## 12. Forms (Auth, Checkout, Account)

- Form fields: `w-full` by default.
- Two-column field groups on `sm+` only when grouping logically related fields
  (e.g., first name + last name).
- Error messages: rendered below the input, `text-destructive text-sm`.
- Submit buttons: full-width on mobile (`w-full`), auto-width on `sm+`.

---

## 13. Touch & Interaction Targets

- Minimum interactive element size: `min-h-11` and `min-w-11` (44px × 44px)
  for anything tapped with a finger.
- This applies to: nav links, icon buttons, filter pills, form inputs,
  add-to-cart buttons, and drawer close buttons.
- Do not reduce these sizes to save space. Use `sr-only` labels instead of
  shrinking targets.

---

## 14. Overflow Prevention

- Use `overflow-x-clip` on the root `<div>` in `page.tsx` to prevent horizontal
  scroll from decorative elements.
- All images must have `sizes` attributes when using `next/image` with `fill`.
- Long product names must use `line-clamp-2` to prevent layout breaks.
- Category names must use `line-clamp-1` in pill filters.

---

## 15. Reduced Motion

Wrap Framer Motion animations and CSS transitions in reduced-motion checks:

```css
@media (prefers-reduced-motion: reduce) {
  /* Override or disable transitions */
}
```

Or use Framer Motion's `useReducedMotion()` hook.

Do not add animations to elements that convey critical information.
