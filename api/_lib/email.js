/**
 * Transactional email via Resend.
 *
 * Two emails per confirmed booking:
 *   - sendPractitionerNotification: full appointment + client details to Alina.
 *   - sendClientConfirmation: date/time/treatment/location, deposit and the
 *     24-hour cancellation policy to the client.
 *
 * GRACEFUL DEGRADATION: when RESEND_API_KEY is missing (local dev), sending
 * is skipped with a console warning and the functions resolve to null.
 */

import { Resend } from 'resend';
import { DEPOSIT_PLN } from './availabilityCore.js';
import { STUDIO_ADDRESS } from './googleCalendar.js';

/** Sender identity; override with EMAIL_FROM env var. */
const EMAIL_FROM =
  process.env.EMAIL_FROM || 'Nirvana Massage Studio <bookings@nirvanamassage.pl>';

/** Resend client, or null when the API key is absent. */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

let warned = false;
function warnUnconfigured() {
  if (warned) return;
  warned = true;
  console.warn('[email] RESEND_API_KEY not set — email sending disabled (skip mode).');
}

/* ---------------------------------------------------------------------------
 * Shared presentation helpers
 * ------------------------------------------------------------------------- */

/** Escapes user-supplied text before interpolating into HTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `2026-09-14` + `14:30` -> "Monday, 14 September 2026" etc. */
function formatDateLong(dateStr, locale = 'en-GB') {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Resolves the human-readable location line for a booking. */
function locationLine(booking) {
  return booking.booking_type === 'in_studio'
    ? STUDIO_ADDRESS
    : booking.location || 'Client location (private appointment)';
}

/**
 * Wraps body content in the studio's warm neutral email shell
 * (cream background, espresso text, terracotta accent).
 */
function emailShell({ heading, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5f0e8;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#3e342c;">
    <div style="background-color:#fdfaf5;border:1px solid #e5dccc;border-radius:12px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a9805b;">Nirvana Massage Studio</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:normal;color:#3e342c;">${heading}</h1>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e5dccc;margin:28px 0 16px;">
      <p style="margin:0;font-size:12px;color:#8a7d6d;">
        Nirvana Massage Studio &middot; ul. Przedmiejska 2/02, 54-201 Wrocław, Poland
      </p>
    </div>
  </div>
</body>
</html>`;
}

/** Renders a labelled detail row inside the detail table. */
function detailRow(label, value) {
  return `<tr>
    <td style="padding:6px 16px 6px 0;font-size:13px;color:#8a7d6d;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#3e342c;">${value}</td>
  </tr>`;
}

/* ---------------------------------------------------------------------------
 * Practitioner notification
 * ------------------------------------------------------------------------- */

/**
 * Sends the new-booking notification to the practitioner.
 *
 * @param {object} booking the bookings table row (snake_case fields)
 * @param {string} practitionerEmail resolved recipient address
 * @returns {Promise<object|null>} Resend response, or null when skipped.
 */
export async function sendPractitionerNotification(booking, practitionerEmail) {
  if (!resend) {
    warnUnconfigured();
    return null;
  }

  const clientName = `${escapeHtml(booking.client_first_name)} ${escapeHtml(booking.client_surname)}`;
  const when = `${formatDateLong(booking.booking_date)} at ${escapeHtml(
    String(booking.start_time).slice(0, 5)
  )}`;

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
      A new appointment has been booked.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${detailRow('Client', clientName)}
      ${detailRow('Email', `<a href="mailto:${escapeHtml(booking.client_email)}" style="color:#a9805b;">${escapeHtml(booking.client_email)}</a>`)}
      ${detailRow('Phone', escapeHtml(booking.client_phone))}
      ${detailRow('Treatment', `${escapeHtml(booking.treatment_name)} (${booking.duration_minutes} min)`)}
      ${detailRow('When', when)}
      ${detailRow('Type', booking.booking_type === 'in_studio' ? 'In studio' : 'Private / outcall')}
      ${detailRow('Location', escapeHtml(locationLine(booking)))}
      ${detailRow('Price', `${booking.price_pln} PLN (deposit ${booking.deposit_pln} PLN)`)}
      ${booking.client_notes ? detailRow('Client notes', escapeHtml(booking.client_notes)) : ''}
    </table>`;

  return resend.emails.send({
    from: EMAIL_FROM,
    to: practitionerEmail,
    subject: `New booking: ${booking.treatment_name} — ${when}`,
    html: emailShell({ heading: 'New booking received', bodyHtml }),
  });
}

/* ---------------------------------------------------------------------------
 * Client confirmation
 * ------------------------------------------------------------------------- */

/** Payment-summary box shown in the client confirmation, by payment status. */
function paymentBoxHtml(booking) {
  const price = booking.price_pln;
  const paid = booking.amount_paid_pln;
  switch (booking.payment_status) {
    case 'deposit_paid':
      return `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#3e342c;">
        <strong>Deposit paid online:</strong> ${paid ?? booking.deposit_pln} PLN.
        The remaining ${paid != null ? price - paid : price - booking.deposit_pln} PLN
        is payable at your session.
      </p>`;
    case 'paid_full':
      return `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#3e342c;">
        <strong>Paid in full online:</strong> ${paid ?? price} PLN. Nothing is due at your session.
      </p>`;
    case 'credit':
      return `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#3e342c;">
        <strong>Membership:</strong> this session is covered by one of your membership
        session credits. Nothing is due at your session.
      </p>`;
    default:
      return `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#3e342c;">
        <strong>Deposit:</strong> a deposit of ${booking.deposit_pln ?? DEPOSIT_PLN} PLN secures your
        appointment. The remaining balance is payable at the studio.
      </p>`;
  }
}

/**
 * Sends the booking confirmation to the client, including payment info and
 * the 24-hour cancellation policy.
 *
 * @param {object} booking the bookings table row (snake_case fields)
 * @returns {Promise<object|null>} Resend response, or null when skipped.
 */
export async function sendClientConfirmation(booking) {
  if (!resend) {
    warnUnconfigured();
    return null;
  }

  const when = `${formatDateLong(booking.booking_date)} at ${escapeHtml(
    String(booking.start_time).slice(0, 5)
  )}`;

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
      Dear ${escapeHtml(booking.client_first_name)},<br>
      thank you for booking with Nirvana Massage Studio. Your appointment is confirmed.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${detailRow('Treatment', `${escapeHtml(booking.treatment_name)} (${booking.duration_minutes} min)`)}
      ${detailRow('When', when)}
      ${detailRow('Location', escapeHtml(locationLine(booking)))}
      ${detailRow('Price', `${booking.price_pln} PLN`)}
    </table>
    <div style="margin:24px 0 0;padding:16px;background-color:#f3ece1;border-radius:8px;">
      ${paymentBoxHtml(booking)}
      <p style="margin:0;font-size:13px;line-height:1.6;color:#3e342c;">
        <strong>Cancellation policy:</strong> you may cancel or reschedule free of charge up to
        24 hours before your appointment. Cancellations made less than 24 hours in advance
        forfeit any amount already paid.
      </p>
    </div>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;">
      We look forward to welcoming you.<br>Warm regards,<br>Alina
    </p>`;

  return resend.emails.send({
    from: EMAIL_FROM,
    to: booking.client_email,
    subject: `Your booking is confirmed — ${when}`,
    html: emailShell({ heading: 'Booking confirmation', bodyHtml }),
  });
}

/* ---------------------------------------------------------------------------
 * Membership / subscription emails
 * ------------------------------------------------------------------------- */

/**
 * Welcome email after a subscription's first payment succeeds.
 *
 * @param {object} args { email, fullName, tierName, monthlyPricePLN, creditsPerCycle, periodEnd }
 */
export async function sendSubscriptionWelcome({ email, fullName, tierName, monthlyPricePLN, creditsPerCycle, periodEnd }) {
  if (!resend) {
    warnUnconfigured();
    return null;
  }

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
      Dear ${escapeHtml(fullName || 'member')},<br>
      welcome to your <strong>${escapeHtml(tierName)}</strong> membership.
      Your first payment has been received and your session credits are ready to use.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${detailRow('Membership', escapeHtml(tierName))}
      ${detailRow('Monthly price', `${monthlyPricePLN} PLN`)}
      ${detailRow('Session credits', `${creditsPerCycle} per month`)}
      ${detailRow('Renews', escapeHtml(formatDateLong(String(periodEnd).slice(0, 10))))}
    </table>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;">
      Book your sessions as usual on the website — while your membership is active,
      the price at checkout is 0 PLN and one credit is used per session.
      Unused sessions carry over to the next month (maximum 1).
      You can manage or cancel your membership anytime from your account page.
    </p>`;

  return resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `Welcome to ${tierName} — your membership is active`,
    html: emailShell({ heading: 'Membership activated', bodyHtml }),
  });
}

/**
 * Renewal notice after a successful monthly auto-debit.
 *
 * @param {object} args { email, tierName, creditsGranted, creditBalance, periodEnd }
 */
export async function sendSubscriptionRenewal({ email, tierName, creditsGranted, creditBalance, periodEnd }) {
  if (!resend) {
    warnUnconfigured();
    return null;
  }

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
      Your <strong>${escapeHtml(tierName)}</strong> membership has renewed for another month.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${detailRow('New credits added', String(creditsGranted))}
      ${detailRow('Your credit balance', String(creditBalance))}
      ${detailRow('Next renewal', escapeHtml(formatDateLong(String(periodEnd).slice(0, 10))))}
    </table>`;

  return resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `${tierName} renewed — new session credits added`,
    html: emailShell({ heading: 'Membership renewed', bodyHtml }),
  });
}

/**
 * Payment-failure notice: subscription moved to past_due, privileges suspended.
 *
 * @param {object} args { email, tierName }
 */
export async function sendSubscriptionPaymentFailed({ email, tierName }) {
  if (!resend) {
    warnUnconfigured();
    return null;
  }

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
      We couldn't collect the monthly payment for your
      <strong>${escapeHtml(tierName)}</strong> membership. Your card issuer declined the charge.
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
      Credit-based booking is paused until the payment succeeds. Stripe will retry
      automatically over the coming days — updating your card in your account page
      resolves it immediately.
    </p>`;

  return resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `Action needed: ${tierName} payment didn't go through`,
    html: emailShell({ heading: 'Payment problem', bodyHtml }),
  });
}

/**
 * Cancellation confirmation (access stays until the paid period ends).
 *
 * @param {object} args { email, tierName, periodEnd }
 */
export async function sendSubscriptionCancelled({ email, tierName, periodEnd }) {
  if (!resend) {
    warnUnconfigured();
    return null;
  }

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
      Your <strong>${escapeHtml(tierName)}</strong> membership has been cancelled.
      No further payments will be taken.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;">
      Your remaining session credits stay usable until
      <strong>${escapeHtml(formatDateLong(String(periodEnd).slice(0, 10)))}</strong>,
      the end of your current paid period.
    </p>`;

  return resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `${tierName} membership cancelled`,
    html: emailShell({ heading: 'Membership cancelled', bodyHtml }),
  });
}
