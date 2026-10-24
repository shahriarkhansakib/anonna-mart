# Skill: Storefront & Admin UI/UX Polish

## 🎯 Purpose
Provides a disciplined, zero-regression procedural execution guide for polishing, refining, or auditing the visual design, accessibility, interaction states, and responsive layout of the Anonna Mart storefront and GrowMate Admin Suite.

---

## ⚡ 1. Scope & Pre-Flight Invariants
* **Target Workspace:** `apps/web` (layouts, pages, components, and CSS).
* **Isolation Rule:** Do not touch `apps/api`, `packages/db`, or backend routes during visual design refactoring.
* **Prerequisite Reading:**
  * Review `.agents/rules/ui-and-branding.md` for dual co-branding boundaries.
  * Review `.agents/rules/ui-avoid-list.md` for prohibited patterns and protected functional systems.
  * Review `.agents/rules/storefront-design-system.md` for semantic color tokens and breakpoint grids.

---

## 📋 2. Six-Step Execution Pipeline

### Step 1 — Inspection & Data Trace
1. Identify the target page or component in `apps/web/`.
2. Inspect data dependencies: verify whether the component renders live React Query / Hono API data.
3. Preserve the data fetching layer intact without converting Server Components into Client Components unnecessarily.

### Step 2 — Multidimensional Diagnosis
Audit the component across five objective criteria:
* **Usability:** Are interactive controls intuitive with clear visual affordances?
* **Visual Hierarchy:** Do headlines, badges, and primary actions have proportional visual weight?
* **Design Consistency:** Are Tailwind semantic variables (`bg-primary`, `text-foreground`, `border-border`) utilized instead of arbitrary hex codes?
* **Responsiveness:** Does the layout render gracefully across `320px`, `640px`, `768px`, `1024px`, and `1280px`?
* **Accessibility:** Are focus rings visible, contrast ratios compliant with WCAG AA, and icon buttons labeled with `aria-label`?

### Step 3 — Focused Plan & Review
* Outline specific CSS and markup adjustments.
* Verify that no protected functional system (Cart, Wishlist, Checkout, PBAC) is affected.

### Step 4 — Surgical Implementation
* Apply focused, reviewable edits using Tailwind utility classes.
* Reuse existing components from `apps/web/components/ui/`.
* Maintain complete backward compatibility for all props and event handlers.

### Step 5 — Verification & Testing
Before concluding any UI task, run the verification checklist below.

### Step 6 — Report & Document
Summarize visual adjustments, responsive behavior tested, and confirm that zero regressions were introduced.

---

## 🔍 3. Verification Checklist Before Completion

- [ ] **Live Data Integrity:** Component renders live database/API data, not mock fixtures.
- [ ] **Four Breakpoints Tested:** Layout verified at `sm` (≥640px), `md` (≥768px), `lg` (≥1024px), and `xl` (≥1280px).
- [ ] **No Horizontal Overflow:** Zero unwanted horizontal scrolling on mobile viewports (`320px` - `414px`).
- [ ] **Keyboard Accessibility:** All interactive elements (`<button>`, `<a>`, `<input>`) have visible `:focus-visible` rings.
- [ ] **Screen Reader Labels:** All icon-only buttons possess descriptive `aria-label` attributes.
- [ ] **Dark Mode Support:** All custom text and surfaces use proper `dark:` variants or semantic CSS variables.
- [ ] **Zero Functional Regression:** Cart drawer, wishlist toggle, checkout form, search input, and admin tables remain 100% operational.
