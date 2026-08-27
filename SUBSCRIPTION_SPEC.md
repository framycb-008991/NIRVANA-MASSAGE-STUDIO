# Feature Request Specification: Website Subscription Engine & Digital Wallet Loyalty Integration

## 1. Project Overview & Objective
This document outlines the architecture, data models, functional requirements, and integration logic required to build an in-house **Monthly Subscription Engine** and **Digital Wallet Loyalty System** directly into our custom website. 

The primary objective is to allow clients—specifically **athletes**, **post-stroke/neurological recovery patients**, **office workers**, and **chronic pain patients**—to purchase recurring monthly massage memberships using local payment gateways (**Stripe** or **PayU** in **PLN** currency) and seamlessly check in at the studio using **Apple Wallet** and **Google Wallet** passes.

---

## 2. Business Logic & Monthly Subscription Tiers

The system will sell and auto-renew recurring monthly memberships. Each active subscription level grants the user a specific quota of booking credits per billing cycle (every 30 days).

### Subscription Tier Structure (Polish Market Standard)

| Tier Name | Modalities / Focus | Included Sessions | Targeted Persona | Recommended Monthly Price (PLN) |
| :--- | :--- | :--- | :--- | :--- |
| **Recovery Pass** | Masaż Sportowy, Tkanek Głębokich, Trigger Point | 2x 60-min sessions / month | Amateur athletes, desk workers, stress relief | **320 – 380 PLN** |
| **Performance Pass** | Masaż Sportowy, IASTM, Functional Mobility | 4x 60-min sessions / month (1/week) | Serious athletes, crossfitters, runners | **600 – 720 PLN** |
| **Neuro-Rehab Pass** | Masaż Leczniczy, Rehabilitacyjny, Drenaż Limfatyczny | 4x to 8x 45-min sessions / month | Post-stroke recovery, neuromuscular care | **700 – 1,200 PLN** |
| **Desk Detox Pass** | Masaż Tkanek Głębokich, Neck/Shoulder Focus | 1x or 2x 60-min sessions / month | Remote workers, office staff with tech neck | **180 – 350 PLN** |
| **Lymphatic Care Pass** | Manual Lymphatic Drainage (MLD) | 2x to 4x 60-min sessions / month | Post-surgery recovery, swelling/edema management | **400 – 750 PLN** |
| **Maternity Journey** | Prenatal / Postpartum Bodywork | 2x 60-min sessions / month | Expectant and new mothers | **350 – 420 PLN** |

### Subscription Rules & Policy Constraints
1. **Billing Cycle:** Auto-renew every 30 days starting from the sign-up date.
2. **Credit Allocation:** Session credits are credited to the user account upon successful payment webhooks.
3. **Credit Rollover Policy:** Unused sessions roll over up to a **maximum limit of 1 session** into the following month; all additional unused credits expire at the end of the billing cycle.
4. **Cancellation:** Users can manage/cancel subscriptions directly from their website account portal. Access remains active until the end of the current paid billing period.

---

## 3. Technology Stack & Software Architecture

### A. CMS & Subscription Core
* **Platform options:** WordPress + WooCommerce + WooCommerce Subscriptions / Custom Node.js + Express / Next.js.
* **Payment Gateways:**
  * **Stripe Billing / Subscriptions API:** Card auto-debit, Apple Pay, Google Pay support.
  * **PayU Poland API:** Direct recurring card authorization / BLIK recurring processing in PLN.

### B. Booking & Appointment Integration
* **Logic:** When a subscriber books a service via the online scheduler, the system checks if `active_subscription == true` and `session_credits > 0`.
* **Checkout Bypass:** If criteria are met, the balance due displays **0 PLN** and deducts 1 credit upon confirmation.
* **Overdue Payments:** If auto-renewal fails (e.g., declined credit card), subscription status transitions to `past_due`, and free booking privileges are immediately suspended.

### C. Mobile Wallet Pass Infrastructure (Apple & Google)
* **Apple Wallet (PassKit):**
  * `.pkpass` bundle generated dynamically upon subscription creation.
  * Signed server-side using Apple Developer Certificate & Pass Type ID.
  * Includes customer name, pass type, QR code (containing hashed User ID / Pass Token), and current credit balance.
* **Google Wallet API:**
  * Uses Google Pay & Wallet Console (`LoyaltyClass` and `LoyaltyObject`).
  * Generates a signed JWT link for one-click "Save to Google Wallet".
* **Live Updates (Push Service):**
  * Webhooks trigger Apple Push Notification Service (APNs) and Google Wallet REST API to update the pass on the user's phone lock screen whenever a session is redeemed or renewed.

---

## 4. Hardware & In-Studio Check-In Requirements

To scan and process subscriber appointments at the front desk:

1. **2D Barcode / QR Code Scanner:**
   * USB or Bluetooth 2D image scanner capable of reading illuminated smartphone screens (e.g., Eyoyo, Zebra, Honeywell).
2. **Reception Terminal:**
   * iPad, tablet, or PC logged into the studio website Admin Dashboard (`/admin/check-in`).
3. **Check-In Workflow:**
   * Client presents Apple/Google Wallet pass $ightarrow$ Receptionist scans QR code $ightarrow$ Web hook validates subscription status and decrements 1 session credit in real time $ightarrow$ Digital Wallet pass updates balance instantly.

---

## 5. Website Database Schema Design

### Database Table: `users`
```sql
CREATE TABLE users (
    user_id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Table: `subscriptions`
```sql
CREATE TABLE subscriptions (
    subscription_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id),
    plan_tier VARCHAR(50) NOT NULL, -- e.g., 'recovery_pass', 'performance_pass', 'neuro_rehab_pass'
    status VARCHAR(20) NOT NULL,    -- 'active', 'past_due', 'canceled'
    monthly_price_pln DECIMAL(10,2) NOT NULL,
    credits_total INT NOT NULL,     -- Allocated monthly credits
    credits_remaining INT NOT NULL, -- Current available credits
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    payment_gateway VARCHAR(20),   -- 'stripe', 'payu'
    gateway_subscription_id VARCHAR(100)
);
```

### Database Table: `pass_tokens`
```sql
CREATE TABLE pass_tokens (
    token_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id),
    pass_type VARCHAR(20),         -- 'apple', 'google'
    qr_code_hash VARCHAR(255) UNIQUE NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Implementation & Integration Roadmap for Kimi

To implement this full subscription model on our website, execute the following steps in order:

### Phase 1: Database & Payment Setup
1. Configure database models for `users`, `subscriptions`, and `session_credits`.
2. Connect **Stripe API** or **PayU SDK** to enable subscription billing in **PLN**.
3. Create payment webhooks (`customer.subscription.created`, `invoice.payment_succeeded`, `invoice.payment_failed`) to auto-allocate credits upon monthly renewal.

### Phase 2: Booking Engine Logic
1. Modify the website appointment booking flow to detect logged-in subscribers.
2. Implement credit-check validation before displaying standard session rates.
3. Add subscription management portal under the customer profile page (`/my-account/subscriptions`).

### Phase 3: Digital Wallet & Check-In System
1. Integrate Apple PassKit generation scripts and Google Wallet REST API.
2. Place "Add to Apple Wallet" and "Save to Google Wallet" badges on order confirmation pages and user account dashboards.
3. Build the Admin Check-In Web Application (`/admin/scan`) to process 2D scanner input and automatically update customer credit balances.
