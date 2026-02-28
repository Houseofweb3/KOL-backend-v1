# System Context – Influencer Service Marketplace

**Treat this as the single source of truth for all data models, relationships, and business logic.**

---

## What This System Is

A **service-based eCommerce backend** where the **service being sold is an Influencer**.  
There are **no physical products** and **no other service types**.

---

## Core Entities

| Entity | Role |
|--------|------|
| **Admin User** | Manages the system; has access to the admin panel. |
| **Client** | The customer who **purchases** influencer services. |
| **Influencer** | The service provider. **Each influencer is the service.** |

---

## Business Flow

1. **Clients** browse a list of **influencers** (filter by industry/category).
2. **Clients** select influencers and add them to a **cart**.
3. **Clients** complete **payment** to purchase influencer services.
4. **The client pays the platform**, not the influencer directly. The platform is the **mediator**.
5. **After payment:**
   - Platform **pays the influencer** (payout).
   - Platform **keeps a commission** (fixed percentage).
6. Payments are processed using **Stripe**.

---

## Revenue & Payment Model

```
Client  →  Platform   (full payment)
Platform →  Influencer (payout after commission deduction)
Platform →  Commission (platform income)
```

This **client → platform → influencer** flow is the core purpose of the backend.

---

## Important Rules (Avoid Confusion)

- **Influencer = Service** (always treat them as the same thing).
- **Do NOT introduce:**
  - Separate “service” tables unrelated to influencers.
  - Product-based logic.
- **Cart, orders, and payments** must always **reference influencers**, not generic services.

---

## Development Instructions

When creating or updating:

- **Data models** – Refer to this flow; treat influencers as the service.
- **Relationships** – Design correct relations between:
  - **Client**
  - **Influencer**
  - **Cart**
  - **Order**
  - **Payment**
  - **Commission / Payout**
- **Fields** – Add all required fields even if not explicitly requested.
- **Suggestions** – Actively suggest improvements and missing fields based on this context.

---

*Keep this document in mind for all backend design and implementation.*
