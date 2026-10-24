# .agents — AI Agent Knowledge Base & Guardrails

This directory contains specialized instructions, procedural skills, architectural rules, and Architecture Decision Records (ADRs) that govern the development of the **Anonna Mart** e-commerce platform and the **GrowMate Admin Suite**.

---

## 📁 Standardized Directory Structure

```text
.agents/
├── README.md                           # Directory index and agent usage rules
├── skills/                             # Actionable procedural execution guides (flat *.md)
│   ├── database-operations.md          # Database setup, reset, push, seeding, and studio
│   ├── api-development.md              # Building Hono endpoints, controllers, and schemas
│   ├── testing-and-qa.md               # Unit tests, integration tests, and stress tests
│   ├── admin-pbac-permissions.md       # PBAC permission registration and role assignment
│   └── ui-and-ux-polish.md             # UI/UX design inspection, WCAG audit, and responsive workflow
├── rules/                              # Strict, non-negotiable coding guardrails (flat *.md)
│   ├── architecture-and-code-style.md  # Monorepo separation and coding conventions
│   ├── database-conventions.md         # Schema constraints, indexing, and relations rules
│   ├── security-and-credentials.md     # Better Auth, sessions, and environment safety
│   ├── ui-and-branding.md              # Theme tokens and Anonna Mart / GrowMate co-branding
│   ├── ui-avoid-list.md                # Prohibited patterns and protected functional systems
│   └── storefront-design-system.md     # Semantic tokens, typography scale, and responsive grids
└── decisions/                          # Architecture Decision Records (ADRs)
    ├── 0001-deterministic-single-database-architecture.md
    ├── 0002-dual-mode-cloud-and-local-redis-db.md
    ├── 0003-unified-admin-and-store-branding.md
    ├── 0004-monorepo-structure-and-routing.md
    └── 0005-storefront-and-admin-design-system.md
```

---

## 🧠 How Agents Should Use This Directory

1. **Before writing database code:** Review `rules/database-conventions.md` and `skills/database-operations.md`.
2. **Before adding or modifying API routes:** Review `skills/api-development.md` and `skills/admin-pbac-permissions.md`.
3. **Before modifying UI or themes:** Review `rules/ui-and-branding.md`, `rules/ui-avoid-list.md`, `rules/storefront-design-system.md`, and execute using `skills/ui-and-ux-polish.md`.
4. **When understanding architectural intent:** Read the corresponding ADR in `decisions/`.
