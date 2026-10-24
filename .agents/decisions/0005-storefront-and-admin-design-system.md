# ADR 0005: Storefront and Admin Design System Architecture

## Status
**Accepted & Enforced**

## Context
The repository houses two disparate application interfaces:
1. **Anonna Mart Storefront (`/`)**: A consumer-facing Bangladeshi e-commerce experience emphasizing organic warmth, emerald accents, ivory backgrounds, trustworthy commerce micro-badges, and responsive mobile-first layouts.
2. **GrowMate Admin Suite (`/admin`)**: A high-density SaaS management portal emphasizing electric blue accent tokens, responsive data tables, PBAC controls, and logistics workflows.

Without explicit design contracts and documented guidelines, UI upgrades risk introducing conflicting CSS tokens, arbitrary color overrides, unverified mock content, or breaking fragile e-commerce functional systems (cart, wishlist, checkout).

## Decision
1. **Semantic Color & Token System**:
   * Storefront uses semantic tokens configured in `apps/web/app/globals.css`:
     * Canvas: `--background` (`48 20% 98%` warm ivory) and `--card` (`0 0% 100%`).
     * Primary Brand: `--primary` (`150 60% 18%` emerald forest).
     * Accent: `--accent` (`42 65% 52%` warm gold).
   * Admin uses scoped Electric Blue (`hsl(211, 100%, 50%)`) under `.admin-shell`, `[data-admin="true"]`, and `body.admin-portal`.
2. **Typography Architecture**:
   * Uses system font stack without external web font blocking:
     ```css
     --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Plus Jakarta Sans", system-ui, sans-serif;
     --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Plus Jakarta Sans", system-ui, sans-serif;
     ```
3. **Four Standard Responsive Breakpoints**:
   * `sm` (≥640px), `md` (≥768px), `lg` (≥1024px), and `xl` (≥1280px).
   * Grid patterns must gracefully collapse: 4-col (desktop) -> 2-col (tablet) -> 1-col / 2-col compact (mobile).
4. **Strict Ban on Fabricated Data**:
   * Prohibit hardcoding invented customer reviews, fake hotline numbers, or unverified free delivery thresholds. All badges and copy must reflect verified business state.

## Consequences
* **Positive**: Complete visual consistency across all storefront and admin pages.
* **Positive**: Guardrails prevent regressions to cart, wishlist, auth, and checkout during UI refactoring.
* **Positive**: Predictable CSS variable inheritance across light and dark modes.
