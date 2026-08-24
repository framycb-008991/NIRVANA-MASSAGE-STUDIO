# Prompt for Kimi: Custom Serverless Backend for Nirvana Massage Studio

Copy and paste the entire prompt below directly into Kimi to generate the backend code, database schemas, and integration logic for your React application.

---

Act as a Full-Stack Senior Developer specializing in React, Node.js, and serverless architecture.

I am building a web application for a private massage studio ("Nirvana Massage Studio"). My React frontend UI and Practitioner Admin Panel are already fully designed and built. I need you to write the complete backend serverless architecture and API integration code to bring it to life.

### MY TECH STACK:
- Frontend: React (already built)
- Database: Supabase (PostgreSQL)
- Serverless Functions: Node.js (Vercel Serverless Functions / Next.js API routes)
- Integrations: Google Calendar API (v3) + Resend (or SendGrid) for transactional emails

---

### CORE ARCHITECTURE & LOGIC REQUIREMENTS:

1. DATABASE SCHEMA & AVAILABILITY LOGIC
- Provide a clean SQL schema for Supabase:
  - `working_hours` table: Weekly schedule (day of week, start time, end time, buffer time, slot increment).
  - `date_overrides` table: Specific dates where the practitioner sets custom hours or marks herself as off/unavailable.
  - `bookings` table: Stores confirmed appointments (client details, treatment type, duration, price, status, google_event_id).
- Provide API route code for:
  - `POST /api/admin/set-hours`: Allows the practitioner from her existing Admin Panel to update weekly default hours or add date overrides.
  - `GET /api/availability?date=YYYY-MM-DD`: Calculates real-time open slots by combining:
    1. Practitioner's working hours/overrides from Supabase.
    2. Existing appointments in Supabase.
    3. Live events on the practitioner's Google Calendar (to block out personal events).
    4. Required 30-minute restorative buffer time between appointments.

2. GOOGLE CALENDAR SYNC (Service Account API)
- Provide a modular Node.js helper module (`googleCalendar.js`) using the `googleapis` library.
- Require environment variables: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and `GOOGLE_CALENDAR_ID`.
- Include functions:
  - `getCalendarEvents(startIso, endIso)`: Fetches busy slots for real-time conflict checking.
  - `createCalendarEvent(bookingData)`: Creates a new event with client name, treatment type, duration (1h / 1.5h), location (In-studio vs Travel), and client notes.

3. EMAIL NOTIFICATION SYSTEM
- Integrate Resend (or SendGrid) API for automated notifications.
- When `POST /api/create-booking` is triggered:
  - Insert record into Supabase `bookings` table.
  - Create the Google Calendar event.
  - Send an instant, styled HTML notification email to the Practitioner with full appointment and client details.
  - Send an instant confirmation email to the Client with location and appointment details.

4. REACT FRONTEND INTEGRATION CODE
- Show how to connect my existing React components:
  - Fetching available times dynamically based on date selection.
  - Submitting the booking form payload to `/api/create-booking`.
  - Submitting schedule changes from the Admin Panel to `/api/admin/set-hours`.

---

### DELIVERABLES NEEDED:
1. Complete PostgreSQL / Supabase SQL DDL scripts.
2. Serverless API route files (`/api/availability.js`, `/api/create-booking.js`, `/api/admin/set-hours.js`).
3. Google Calendar API setup helper module with service account authorization.
4. Email notification helper module.
5. Custom React hooks (`useAvailability.js`, `useAdminSchedule.js`) to plug into my existing React UI.

Please write clean, production-ready, fully commented JavaScript/Node.js code.