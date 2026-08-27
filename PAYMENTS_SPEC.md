# Nirvana Massage Studio — Payments & Pricing Spec

> **STATUS: IMPLEMENTED (2026-08-28).** The decisions below were made and built.
> This document now records what was decided and where it lives in the code.
> The subscription/membership side is specified in `SUBSCRIPTION_SPEC.md`.

## Decisions made

- **Payment model: B — deposit at booking**, with a client choice at checkout:
  pay a **30% deposit** online (rest at the session) or the **full price** online.
  (Originally spec'd as deposit-only; the full-payment option was added per owner decision.)
- **Processor: Stripe** (hosted Checkout; card + BLIK + Apple/Google Pay), **PLN only**.
  EUR prices remain display-only on the site.
- **Cancellation policy:** free cancellation/rescheduling with full refund of any
  amount paid up to **24 hours before** the session; later cancellations forfeit it.
  Refunds are processed manually in the Stripe dashboard (no self-service refund API).
- **Subscriptions:** 6 monthly membership tiers with session credits, auto-debit via
  Stripe Billing — see `SUBSCRIPTION_SPEC.md` and `api/_lib/tiers.js`.

## Where it lives in the code

| Concern | Location |
|---|---|
| Canonical prices (server authority) | `api/_lib/pricing.js` (mirror of `src/services/storage.ts` TREATMENTS + `custom_treatments` settings) |
| Deposit rule (30%, rounded up) | `depositFor()` in `api/_lib/pricing.js` |
| Booking checkout (deposit/full) | `api/create-checkout.js` |
| Payment confirmation | `api/stripe-webhook.js` → confirms booking, emails, calendar |
| Credit redemption (0 PLN member bookings) | `api/create-checkout.js` (`paymentChoice: 'credit'`) |
| Membership purchase/cancel | `api/subscribe.js`, `api/cancel-subscription.js` |
| Tier definitions (admin-editable) | `settings.subscription_tiers` (seeded in `supabase/migrations/001_payments.sql`) |
| Payment UI (Step 3) | `src/pages/BookingPage.tsx` |
| Membership / account pages | `src/pages/MembershipPage.tsx`, `src/pages/AccountPage.tsx` |
| Admin memberships tab + tier editor | `src/pages/AdminPage.tsx` |

## Compliance notes (unchanged from original spec)

- Card data never touches the site (Stripe-hosted Checkout) — no PCI scope.
- Polish tax/receipt obligations should be confirmed with the studio's accountant;
  Stripe provides invoices/receipts but any faktura VAT process is a business decision.

## Still open (deferred)

- Apple/Google Wallet member passes + QR check-in scanner (`SUBSCRIPTION_SPEC.md` Phase 3)
  — requires Apple Developer + Google Wallet issuer accounts and scanner hardware.
- Self-service client cancellation/rescheduling of bookings (`WEBSITE_SPECS.md` §7).
- Multi-currency charging (EUR).
