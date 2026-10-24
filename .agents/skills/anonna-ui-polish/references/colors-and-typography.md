# Colors & Typography — Anonna Mart Design System

All values in this document are verified directly from
`apps/web/app/globals.css` and `apps/web/app/layout.tsx`.
Do not introduce colors or tokens that are not already present here
unless a new token is explicitly approved.

---

## 1. Semantic Color Tokens (CSS Custom Properties)

These are the tokens you should reference in Tailwind classes via
`bg-background`, `text-foreground`, `border-border`, etc.

### Light Mode (`:root`)

| Token | HSL Value | Usage |
| :--- | :--- | :--- |
| `--background` | `48 20% 98%` | Page canvas — warm ivory, not pure white |
| `--foreground` | `150 40% 9%` | Primary body text — deep forest tint |
| `--card` | `0 0% 100%` | Card & surface background |
| `--card-foreground` | `150 40% 9%` | Text inside cards |
| `--primary` | `150 60% 18%` | Brand green — buttons, active states, links |
| `--primary-foreground` | `0 0% 100%` | Text on primary-colored surfaces |
| `--secondary` | `150 15% 94%` | Subtle fill for pills, chips, secondary buttons |
| `--secondary-foreground` | `150 45% 15%` | Text on secondary fills |
| `--muted` | `150 12% 93%` | Skeleton loaders, input backgrounds, disabled fills |
| `--muted-foreground` | `150 10% 40%` | Placeholder text, captions, subtitles |
| `--accent` | `42 65% 52%` | Warm gold — star ratings, discount badges, highlights |
| `--accent-foreground` | `150 50% 10%` | Text on accent-gold surfaces |
| `--destructive` | `0 72% 51%` | Error states, delete actions |
| `--border` | `150 14% 88%` | Card borders, dividers, input borders |
| `--ring` | `150 60% 25%` | Focus ring color |

### Dark Mode (`.dark`)

| Token | HSL Value | Usage |
| :--- | :--- | :--- |
| `--background` | `150 18% 6%` | Deep forest dark canvas |
| `--foreground` | `150 15% 96%` | Near-white body text |
| `--card` | `150 14% 10%` | Elevated card surface |
| `--primary` | `152 68% 46%` | Luminous emerald for dark mode |
| `--accent` | `42 65% 55%` | Brighter gold in dark context |
| `--border` | `150 12% 18%` | Subtle dark borders |

---

## 2. Brand Palette (Direct Color Tokens)

Use these for hardcoded brand-specific styling that semantic tokens
don't cover (e.g., hero gradients, promotional banners).

### Emerald Green Scale (`brand-*`)

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--color-brand-950` | `#071a10` | Deepest forest; hero backgrounds, footer |
| `--color-brand-900` | `#0f3821` | Dark green; footer, CTA button fills |
| `--color-brand-800` | `#14462a` | Deep green; button hover states |
| `--color-brand-700` | `#1a4d2e` | Focus rings on brand elements |
| `--color-brand-600` | `#23653e` | Icon fills, active nav indicators |
| `--color-brand-500` | `#2d8050` | Mid-range green |
| `--color-brand-400` | `#40a36b` | Success icon fills |
| `--color-brand-300` | `#68c391` | Light success text |
| `--color-brand-100` | `#d5f2e2` | Very light green tint backgrounds |
| `--color-brand-50` | `#f0f9f4` | Near-white green tint; empty-state fills |

### Warm Gold Scale (`gold-*`)

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--color-gold-600` | `#d4af37` | Primary gold — the `#D4AF37` used in the hero CTA |
| `--color-gold-500` | `#dfc05a` | Hover gold |
| `--color-gold-400` | `#e9d182` | Star rating fill, badge tints |
| `--color-gold-900` | `#8a6e18` | Deep gold for dark contexts |

---

## 3. Functional Color Rules

### Discount & Promotional Badges
- Background: `bg-gold-400` (Tailwind token) or inline `#e9d182`.
- Text: `text-brand-950` for maximum contrast.
- Do not use arbitrary yellows or oranges.

### Star Ratings
- Fill: `fill-gold-500 text-gold-600`.
- Verified in `ProductCard.tsx`.

### Success / Error / Warning
| State | Background Token | Text Token |
| :--- | :--- | :--- |
| Success | `--success: 152 65% 38%` | `--success-foreground` (white) |
| Warning | `--warning: 38 92% 50%` | `--warning-foreground` |
| Error | `--destructive: 0 72% 51%` | `--destructive-foreground` (white) |

### Wishlist / Favourites
- Active (wished): `text-rose-500`, `border-rose-400`, `fill-current`.
- Inactive: `text-muted-foreground`, `border-border`.

### Focus Rings
- **Always visible on keyboard focus.** Use `focus-visible:ring-2
  focus-visible:ring-emerald-600` for storefront elements.
- Admin portal uses `focus-visible:ring-[hsl(211,100%,50%)]` (Electric Blue).
- Never remove focus rings. Never use `outline-none` without a `ring` replacement.

---

## 4. Contrast Requirements

Minimum contrast ratios per WCAG 2.1 AA:

| Text Type | Minimum Ratio |
| :--- | :--- |
| Normal body text (< 18px) | 4.5 : 1 |
| Large text or bold headings (≥ 18px or 14px bold) | 3 : 1 |
| UI component borders (active states) | 3 : 1 |

- `--foreground` on `--background`: verified to meet AA.
- `--primary-foreground` (white) on `--primary` (dark green): meets AA.
- Gold (`--accent`) on white: borderline for small text — use only for decorative
  elements (stars, badge fills) or large, bold text. Never use gold for body copy.

---

## 5. Typography

### 5.1 Font Stack

No custom Google Font or web font is loaded in the project. The system
relies on the OS font cascade:

```
--font-sans:    system-ui → Plus Jakarta Sans → sans-serif
--font-display: system-ui → Plus Jakarta Sans → sans-serif
```

`Plus Jakarta Sans` will only render if available on the user's machine.
It is not guaranteed to load without explicit import.

**Rule:** Do not add font dependencies during UI polish tasks. If a font change
is needed, raise it as a proposal (see `design-decisions.md` PROPOSAL-002).

### 5.2 Type Scale (Practical Hierarchy)

Apply these consistent sizes. Avoid arbitrary one-off values.

| Role | Tailwind Class | Notes |
| :--- | :--- | :--- |
| **Display / Hero H1** | `text-4xl` / `text-5xl` / `text-[3.5rem]` | Used in hero section. Scales down on mobile. |
| **Section Heading H2** | `text-2xl` / `text-3xl` | Used with `SectionHeading` component. |
| **Sub-section H3** | `text-xl` / `text-lg` | Trust pillars, footer column headings. |
| **Product Name** | `text-sm font-semibold` | 2-line clamp in cards. |
| **Category Label** | `text-xs font-semibold uppercase tracking-wider` | Emerald color, above product name. |
| **Body / Description** | `text-sm leading-6` | Maximum line length ~65–70 characters. |
| **Caption / Supporting** | `text-xs` | Subcategory labels, helper text, timestamps. |
| **Price (Primary)** | `text-base font-extrabold` / `text-lg font-extrabold` | Always bold; Taka sign `৳`. |
| **Price (Strikethrough)** | `text-xs text-muted-foreground line-through` | Original price beside discounted price. |
| **Button Label** | `text-sm font-bold` | All CTA and action buttons. |
| **Nav Link** | `text-sm font-semibold` | Header sub-navigation. |
| **Form Label** | `text-sm font-medium` | Checkout and auth forms. |
| **Badge / Tag** | `text-xs font-bold` | Discount percentage badges. |
| **Eyebrow** | `text-xs font-bold uppercase tracking-[0.2em]` | Above section headings in emerald. |

### 5.3 Font Weight Rules

| Weight | Usage |
| :--- | :--- |
| `font-black` (900) | Hero H1 only |
| `font-extrabold` (800) | Product prices, key section headings |
| `font-bold` (700) | Buttons, eyebrows, trust copy, footer column titles |
| `font-semibold` (600) | Product names, nav links, card category labels |
| `font-medium` (500) | Form labels, secondary metadata |
| `font-normal` (400) | Body copy, descriptions |

### 5.4 Line Height

- Headings: `leading-tight` (1.25) or `leading-[1.02]` for very large display text.
- Body text: `leading-6` (1.5) — comfortable reading rhythm.
- Captions and small text: `leading-5` or default.

### 5.5 Letter Spacing

- Eyebrow labels: `tracking-[0.2em]` or `tracking-[0.24em]`.
- Navigation links: default or `tracking-tight` on large headings.
- Do not use `tracking-widest` on body text.
