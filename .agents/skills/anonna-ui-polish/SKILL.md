---
name: anonna-ui-polish
description: >-
  Use this skill when the user asks to improve, polish, refactor, or audit the
  visual design, layout, responsiveness, accessibility, or interaction states of
  any Anonna Mart storefront or GrowMate admin page. Also activates for tasks
  like adding new UI sections, adjusting spacing and typography, reviewing
  component hierarchy, and validating WCAG compliance. Always read this skill
  before touching any file in apps/web.
---

# Anonna UI Polish Skill

A concise workflow for making safe, focused, high-quality UI improvements to
the Anonna Mart storefront (`apps/web`) and the GrowMate Admin Panel (`/admin`).

> **Scope of this skill:** `apps/web` only — pages, components, layouts, and
> `globals.css`. Do not touch `apps/api`, `packages/db`, or `packages/type`
> during UI tasks.

---

## Before You Touch Anything

Read these files first. They contain non-negotiable constraints.

1. `AGENTS.md` — Top-level project rules and invariants (Windows PowerShell,
   port allocations, dual-branding integrity, etc.)
2. `.agents/rules/ui-and-branding.md` — Brand identity rules and the
   dual-branding isolation contract between Anonna Mart and GrowMate Admin.
3. `.agents/skills/anonna-ui-polish/references/avoid-list.md` — Prohibited
   patterns and common mistakes. Check before every change.

Then read the relevant reference file for the specific type of change:

- Colors or tokens → `references/colors-and-typography.md`
- Layout or breakpoints → `references/responsive-design.md`
- Components or interaction states → `references/components-and-states.md`
- Design intent or rationale → `references/design-decisions.md`

---

## Standard Workflow

Follow these steps in order for every UI task.

### Step 1 — Identify and Inspect

- Read the user's exact request carefully.
- Identify the target page or component file(s) in `apps/web`.
- Read those files fully before proposing changes.
- Trace all data sources: if the component renders live API data, identify the
  query and the data shape. Do not touch the query or data layer.

### Step 2 — Diagnose

Identify the highest-impact issues across these five dimensions:

1. **Usability** — Is the UI confusing, hard to use, or missing obvious affordances?
2. **Visual Hierarchy** — Do important elements receive appropriate visual weight?
3. **Consistency** — Are tokens, spacing, and component patterns used consistently?
4. **Responsiveness** — Does the layout work across all four breakpoints?
5. **Accessibility** — Are focus states, labels, ARIA roles, and contrast adequate?

Distinguish objective problems from subjective preferences. Report both, but
prioritize objective problems.

### Step 3 — Plan Before Editing

For any change larger than a one-line correction:

- Present a concise plan (what files, what specific changes, what is not being changed).
- Wait for approval if the plan touches more than three files or risks breaking
  any of the protected functional systems listed in `references/avoid-list.md`.

### Step 4 — Make Changes

- Make small, focused, reviewable edits.
- Reuse existing tokens (`--primary`, `--brand-*`, `--gold-*`), breakpoints,
  and shared components.
- Do not duplicate components or extract premature abstractions.
- Do not add `"use client"` unless the component genuinely needs browser-only
  APIs or React hooks.
- Do not replace Server Components with Client Components without a clear need.
- Preserve all existing comments, docstrings, and ARIA attributes.

### Step 5 — Check Your Work

After editing, verify:

- [ ] The component renders correct live data (not mock data).
- [ ] All four responsive breakpoints are addressed: `sm` (≥640px),
      `md` (≥768px), `lg` (≥1024px), `xl` (≥1280px).
- [ ] Interactive elements have visible focus rings (`:focus-visible`).
- [ ] Icon-only buttons have `aria-label`.
- [ ] No horizontal overflow is introduced.
- [ ] Dark mode classes work correctly (use `dark:` variants where needed).
- [ ] No existing features (cart, wishlist, search, auth) are broken.

### Step 6 — Report

Clearly state:

- Files changed and what was changed.
- Issues resolved.
- Remaining issues and why they were not addressed.
- Any decisions requiring user approval (e.g., proposals from the design
  reference that require new data, integrations, or business confirmation).

---

## External Skill Status

**UI/UX Pro Max** (`github.com/nextlevelbuilder/ui-ux-pro-max-skill`):
Not installed. Not available in this workspace.

**better-web-ui** (`github.com/aladicf/better-web-ui`):
Not installed. Not available in this workspace.

These skills were checked at the time of system setup and were not present in
any Antigravity discovery path. Do not claim to use them. Apply their general
principles (design critique, accessibility auditing, component polish) manually
using the guidance in this skill's reference files.

---

## Reference Files

- [Design Decisions](./references/design-decisions.md)
- [Colors & Typography](./references/colors-and-typography.md)
- [Responsive Design](./references/responsive-design.md)
- [Components & States](./references/components-and-states.md)
- [Avoid List](./references/avoid-list.md)
