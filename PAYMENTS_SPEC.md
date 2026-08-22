# Nirvana Massage Studio — Payments & Pricing Spec

> Determines whether payment happens online at booking time, and what that requires. This is one of the biggest scope decisions left open — it affects the booking flow, the tech stack, and legal/compliance needs.

---

## 1. Decision needed: payment model

**A. Pay at session (no online payment)**
- Simplest to build — the current booking flow spec (`WEBSITE_SPECS.md` §4) already supports this as-is.
- Risk: higher no-show rate with no financial commitment at booking.

**B. Deposit required to confirm booking**
- A partial payment (fixed amount or percentage) taken online to hold the slot; remainder paid at session.
- Reduces no-shows; requires a payment processor integration.

**C. Full payment at booking**
- Entire treatment cost paid online upfront.
- Cleanest for the practitioner's cash flow, but the highest-friction option for the client and the most build complexity.

**Recommendation:** given the brand's calm, low-pressure positioning, a **deposit model (B)** balances protecting the practitioner's time against not making the booking experience feel transactional — but this is ultimately a business decision, not a design one.

## 2. If online payment is included (B or C)

- **Payment processor:** needs a provider that supports the currencies/regions relevant here (Poland-based, but private/travel clients may book from other countries — confirm multi-currency needs).
- **Refund/cancellation policy:** must be defined and clearly stated at the point of payment, not buried in a separate policy page. Ties into the cancellation/reschedule questions already open in `WEBSITE_SPECS.md` §7.
- **Receipts/invoicing:** Polish tax/accounting requirements may apply — confirm with whoever handles the studio's accounting before finalizing.
- **PCI compliance:** using a reputable third-party payment processor (rather than handling card data directly) avoids the site needing to be PCI-compliant itself — this should be a hard requirement for whichever processor is chosen.

## 3. Design implications

- Wherever payment happens, it should sit as a clearly separated step after the existing Step 2 (contact info), not blended into it — keeps the calm, unhurried booking flow from suddenly feeling like a checkout page.
- Price should be shown clearly earlier in the flow (Services page, and again in Step 1 once a treatment/duration is selected) so payment isn't a surprise at the end.

## 4. Open questions

- Which payment model (A/B/C)?
- If B or C: preferred payment processor, if the practitioner has one in mind, or should this be researched as part of the technical build?
- Cancellation policy terms (how close to the appointment can a client cancel and still get a refund/deposit back)?
