# .agents — AI Agent Knowledge Base & Guardrails

This directory contains specialized instructions, procedural skills, architectural rules, and Architecture Decision Records (ADRs) that govern the development of the **Anonna Mart** e-commerce platform and the **GrowMate Admin Suite**.

---

## 📁 Directory Structure

```text
.agents/
├── README.md                           # Directory index and guidelines
├── skills/                             # Actionable procedural execution guides
│   ├── database-operations.md          # Database setup, reset, push, seeding, and studio
│   ├── api-development.md              # Building Hono endpoints, controllers, and schemas
│   ├── testing-and-qa.md               # Unit tests, integration tests, and stress tests
│   ├── admin-pbac-permissions.md       # PBAC permission registration and role assignment
│   └── anonna-ui-polish/               # ★ UI/UX design system and polish skill
│       ├── SKILL.md                    # Skill activation conditions and standard workflow
│       └── references/
│           ├── design-decisions.md     # Verified design choices and pending proposals
│           ├── colors-and-typography.md # Color tokens, type scale, contrast rules
│           ├── responsive-design.md    # Breakpoints, grids, layout patterns
│           ├── components-and-states.md # Component anatomy and interaction states
│           └── avoid-list.md           # Prohibited patterns and protected systems
├── rules/                              # Strict, non-negotiable coding guardrails
│   ├── architecture-and-code-style.md  # Monorepo separation and coding conventions
│   ├── database-conventions.md         # Schema constraints, indexing, and relations rules
│   ├── security-and-credentials.md     # Better Auth, sessions, and environment safety
│   └── ui-and-branding.md              # Theme tokens and Anonna Mart / GrowMate co-branding
└── decisions/                          # Architecture Decision Records (ADRs)
    ├── 0001-deterministic-single-database-architecture.md
    ├── 0002-dual-mode-cloud-and-local-redis-db.md
    ├── 0003-unified-admin-and-store-branding.md
    └── 0004-monorepo-structure-and-routing.md
```

---

## 🧠 How Agents Should Use This Directory

1. **Before writing database code:** Review `rules/database-conventions.md` and `skills/database-operations.md`.
2. **Before adding or modifying API routes:** Review `skills/api-development.md` and `skills/admin-pbac-permissions.md`.
3. **Before modifying UI or themes:** Review `rules/ui-and-branding.md` **and** activate the `anonna-ui-polish` skill for detailed design system guidance.
4. **When understanding architectural intent:** Read the corresponding ADR in `decisions/`.
