# ADR 0003: Unified Admin & Storefront Co-Branding

## Status
**Accepted & Enforced**

## Context
The platform represents a partnership between:
* **Anonna Mart:** The client's consumer-facing e-commerce storefront.
* **GrowMate:** The software provider providing the underlying e-commerce engine and administrative management suite.

The UI needed to clearly reflect this partnership without breaking the shopping experience or creating conflicting CSS themes.

## Decision
1. **Storefront Identity:** The storefront (`/`) strictly uses **Anonna Mart** branding, rectangular logo (`/logo.png`), emerald green accents (`hsl(160, 84%, 39%)`), and localized Bangladeshi styling.
2. **Admin Operations Suite:** The admin panel (`/admin`) uses **GrowMate Admin Panel** co-branding:
   * Header and Sidebar display the subtle GrowMate partner logo (`/growmate-logo.png`).
   * Color tokens switch dynamically to Electric Blue (`hsl(211, 100%, 50%)`).
   * Browser tab metadata displays: `GrowMate Admin Panel — Anonna Mart` with `/growmate-logo.png` favicon.
3. **Scoping Mechanism:** Theme tokens are scoped using CSS attribute selectors (`[data-admin="true"]` and `body.admin-portal`) to guarantee zero style leakage into customer shopping flows.

## Consequences
* **Positive:** Clear, professional distinction between store operations and consumer shopping.
* **Positive:** Complete styling isolation between storefront and admin interfaces.
