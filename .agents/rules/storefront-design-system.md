# Rule: Storefront Design Tokens & Component Standards

## 🎯 Purpose
Defines the canonical Tailwind CSS tokens, typography hierarchy, responsive layout rules, and component interaction states for the Anonna Mart storefront.

---

## 🎨 1. Semantic Color Tokens

All colors must reference the semantic tokens configured in `apps/web/app/globals.css`:

### Light Mode (`:root`)
| Token | Tailwind Class | HSL Value | Description |
| :--- | :--- | :--- | :--- |
| `--background` | `bg-background` | `48 20% 98%` | Warm ivory canvas |
| `--foreground` | `text-foreground` | `150 40% 9%` | Deep forest body text |
| `--card` | `bg-card` | `0 0% 100%` | Pure white card surface |
| `--primary` | `bg-primary`, `text-primary` | `150 60% 18%` | Brand Emerald Green |
| `--primary-foreground` | `text-primary-foreground` | `0 0% 100%` | White text on primary |
| `--secondary` | `bg-secondary` | `150 15% 94%` | Subtle green-tinted neutral |
| `--accent` | `bg-accent`, `text-accent` | `42 65% 52%` | Warm Amber / Gold |
| `--muted` | `bg-muted` | `150 12% 93%` | Disabled and skeleton surfaces |
| `--muted-foreground` | `text-muted-foreground` | `150 10% 40%` | Subtitles and placeholders |
| `--border` | `border-border` | `150 14% 88%` | Subtle divider border |
| `--ring` | `ring-ring` | `150 60% 25%` | Keyboard focus ring |

### Dark Mode (`.dark`)
| Token | HSL Value | Usage |
| :--- | :--- | :--- |
| `--background` | `150 18% 6%` | Deep forest dark canvas |
| `--foreground` | `150 15% 96%` | Crisp light body text |
| `--card` | `150 14% 10%` | Elevated surface |
| `--primary` | `152 68% 46%` | Luminous emerald |
| `--accent` | `42 65% 55%` | High-contrast gold |
| `--border` | `150 12% 18%` | Dark surface border |

---

## 🔤 2. Typography Scale

The font stack relies on system rendering with optimized font weights:
* **Display / Hero Headings (`h1`, `h2`):** `font-semibold` or `font-bold`, tight tracking (`tracking-tight`).
* **Section Titles (`h3`, `h4`):** `font-medium` to `font-semibold`, line-height `leading-snug`.
* **Body Text (`p`, `span`):** `text-sm` (14px) or `text-base` (16px), regular weight (`font-normal`), line-height `leading-relaxed`.
* **Micro-copy & Badges:** `text-xs` (12px), `font-medium`, uppercase with `tracking-wider` when used as category tags.

---

## 📱 3. Responsive Breakpoints & Grid Rules

All layouts must be tested across the four canonical breakpoints:

| Breakpoint | Minimum Width | Standard Layout Behavior |
| :--- | :--- | :--- |
| **Mobile (`<640px`)** | `320px` - `639px` | 1-column layout, bottom navigation or drawer menu, compact 2-col product grid |
| **Tablet (`sm`)** | `≥640px` | 2-column grids, collapsed sidebar |
| **Desktop (`md` & `lg`)** | `≥768px` / `≥1024px` | 3 or 4-column product grids, persistent filter sidebar |
| **Wide Desktop (`xl`)** | `≥1280px` | Maximum content container `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |

---

## ⚡ 4. Component Interaction States

Every interactive element (buttons, cards, links, inputs) must provide explicit feedback across all lifecycle states:
1. **Default:** Crisp border and typography adhering to semantic tokens.
2. **Hover (`hover:`):** Subtle transition (`transition-colors duration-200` or `hover:shadow-md`).
3. **Active (`active:`):** Scale transform `active:scale-[0.98]` or darker background fill.
4. **Focus Visible (`focus-visible:`):** `outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
5. **Disabled (`disabled:`):** `opacity-50 cursor-not-allowed pointer-events-none`.
