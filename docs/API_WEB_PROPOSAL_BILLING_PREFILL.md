# Web proposal billing auto-fill (no auth)

When a client opens a proposal link (no JWT), the backend now returns **saved client billing info** so the frontend can **auto-fill** the billing form. When the client submits the proposal, the backend also **updates** the client’s saved billing info for future proposals.

Related: [API_PROPOSAL_LINK.md](./API_PROPOSAL_LINK.md)

---

## 1) Get proposal details (includes prefill)

### Readable URL (recommended)

**GET** `/api/v1/web/proposal/slug/:clientSlug/:date/:cartId`

Success (200):

```json
{
  "cart": { "id": "cart-uuid", "clientId": "client-uuid", "items": [] },
  "billingInfoPrefill": {
    "registeredCompanyName": "Acme Ltd",
    "registeredCompanyAddress": "123 Street, City",
    "authorizedSignatoryName": "John Doe",
    "authorizedSignatoryDesignation": "Director",
    "officialEmailId": "legal@acme.com",
    "phoneNumber": "+1234567890",
    "preferredPaymentMode": "bank_transfer",
    "docusignProofLink": null,
    "isTermsConfirmed": true
  }
}
```

If the client has no saved billing info yet, `billingInfoPrefill` is `null`.

### Legacy token URL

**GET** `/api/v1/web/proposal/:token`

Same response shape.

---

## 2) Submit proposal confirmation (also updates saved billing info)

### Readable URL

**POST** `/api/v1/web/proposal/slug/:clientSlug/:date/:cartId/submit`

### Legacy token URL

**POST** `/api/v1/web/proposal/:token/submit`

Body (JSON) — same as before; the submitted billing fields are used to:

1. save billing info in `billing_info` (one per cart)
2. **upsert** client billing info in `client_billing_info` (one per client)

```json
{
  "items": [
    { "id": "cart-item-uuid-1", "accepted": true },
    { "id": "cart-item-uuid-2", "accepted": false }
  ],
  "registeredCompanyName": "Acme Ltd",
  "registeredCompanyAddress": "123 Street, City",
  "authorizedSignatoryName": "John Doe",
  "authorizedSignatoryDesignation": "Director",
  "officialEmailId": "legal@acme.com",
  "phoneNumber": "+1234567890",
  "preferredPaymentMode": "bank_transfer",
  "docusignProofLink": null,
  "isTermsConfirmed": true
}
```

Success (200):

```json
{ "success": true, "message": "Proposal confirmed successfully" }
```

---

## Frontend integration notes

- Use `billingInfoPrefill` to initialize your form state.
- Let users edit fields; send the final values on submit.
- After submit, the link becomes invalid (410 on further GET/POST for same link).

