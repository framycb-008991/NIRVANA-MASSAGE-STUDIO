import { TimeSlot, Booking } from '../types';
import { getBookings, getBlockedPeriods } from './storage';

// Weekly studio schedule (24h). Key: JS Date.getDay() — 0 = Sunday ... 6 = Saturday
export const WEEKLY_HOURS: Record<number, { open: string; close: string }> = {
  0: { open: '09:00', close: '21:00' }, // Sunday
  1: { open: '08:00', close: '14:00' }, // Monday
  2: { open: '14:30', close: '22:00' }, // Tuesday
  3: { open: '14:30', close: '22:00' }, // Wednesday
  4: { open: '14:30', close: '22:00' }, // Thursday
  5: { open: '08:00', close: '14:00' }, // Friday
  6: { open: '09:00', close: '21:00' }  // Saturday
};

export const SLOT_INCREMENT_MINUTES = 90;
export const BUFFER_MINUTES = 30; // 30-min buffer between sessions

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generate bookable start times for a given date so that
 * start + duration fits within that weekday's studio hours.
 */
export function getSlotsForDate(dateStr: string, durationMinutes: number): string[] {
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  const hours = WEEKLY_HOURS[weekday];
  if (!hours) return [];

  const open = timeToMinutes(hours.open);
  const close = timeToMinutes(hours.close);

  const slots: string[] = [];
  for (let t = open; t + durationMinutes <= close; t += SLOT_INCREMENT_MINUTES) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

/**
 * Check if date is in the past (before today 00:00)
 */
export function isPastDate(year: number, monthZeroIndexed: number, day: number): boolean {
  const target = new Date(year, monthZeroIndexed, day, 23, 59, 59);
  const now = new Date();
  return target.getTime() < now.getTime();
}

/**
 * Returns available time slots for a given date and treatment duration
 */
export function calculateAvailableSlots(
  dateStr: string, // YYYY-MM-DD
  durationMinutes: number
): TimeSlot[] {
  const now = new Date();
  const [year, month, day] = dateStr.split('-').map(Number);

  // If date is before today, all slots are past
  const isToday = now.toISOString().split('T')[0] === dateStr;
  const isPast = isPastDate(year, month - 1, day) && !isToday;

  const daySlots = getSlotsForDate(dateStr, durationMinutes);

  if (isPast) {
    return daySlots.map(time => ({ time, available: false, reason: 'past' }));
  }

  // Get active bookings for this date
  const bookings = getBookings().filter(
    b => b.date === dateStr && b.status === 'confirmed'
  );

  // Get blocked periods for this date
  const blockedPeriods = getBlockedPeriods().filter(b => b.date === dateStr);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return daySlots.map(slotTime => {
    const slotStart = timeToMinutes(slotTime);
    const slotEnd = slotStart + durationMinutes;

    // If today and slot start is in the past (+ 1 hour notice)
    if (isToday && slotStart <= currentMinutes + 60) {
      return { time: slotTime, available: false, reason: 'past' };
    }

    // Check all-day block
    const allDayBlocked = blockedPeriods.some(p => p.allDay);
    if (allDayBlocked) {
      return { time: slotTime, available: false, reason: 'blocked' };
    }

    // Check partial block
    const partialBlock = blockedPeriods.some(p => {
      if (!p.startTime || !p.endTime) return false;
      const bStart = timeToMinutes(p.startTime);
      const bEnd = timeToMinutes(p.endTime);
      return slotStart < bEnd && slotEnd > bStart;
    });
    if (partialBlock) {
      return { time: slotTime, available: false, reason: 'blocked' };
    }

    // Check booking overlap including buffer time
    const hasConflict = bookings.some(b => {
      const bStart = timeToMinutes(b.timeSlot);
      const bEnd = bStart + b.durationMinutes + BUFFER_MINUTES;
      const proposedStart = slotStart;
      const proposedEnd = slotEnd + BUFFER_MINUTES;
      return proposedStart < bEnd && proposedEnd > bStart;
    });

    if (hasConflict) {
      return { time: slotTime, available: false, reason: 'booked' };
    }

    return { time: slotTime, available: true };
  });
}

/**
 * Generate iCalendar (.ics) format file for client download
 */
export function generateICS(booking: Booking, treatmentName: string): string {
  const [year, month, day] = booking.date.split('-').map(Number);
  const [hours, mins] = booking.timeSlot.split(':').map(Number);

  const startDate = new Date(Date.UTC(year, month - 1, day, hours - 2, mins)); // Poland CET approx
  const endDate = new Date(startDate.getTime() + booking.durationMinutes * 60000);

  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const location = booking.bookingType === 'in_studio'
    ? 'Nirvana Massage Studio, ul. Przedmiejska 2/02, 54-201 Wrocław, Poland'
    : (booking.location || 'Private Session');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nirvana Massage Studio//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:nirvana-${booking.id}@nirvanamassage.pl`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:Nirvana Massage — ${treatmentName}`,
    `DESCRIPTION:Appointment with Alina Heorhiieva at Nirvana Massage Studio.\\nDuration: ${booking.durationMinutes} min.\\nDeposit: ${booking.depositPLN} PLN paid.`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Create Google Calendar Web Link
 */
export function createGoogleCalendarUrl(booking: Booking, treatmentName: string): string {
  const [year, month, day] = booking.date.split('-').map(Number);
  const [hours, mins] = booking.timeSlot.split(':').map(Number);

  const startDate = new Date(Date.UTC(year, month - 1, day, hours - 2, mins));
  const endDate = new Date(startDate.getTime() + booking.durationMinutes * 60000);

  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const location = booking.bookingType === 'in_studio'
    ? 'Nirvana Massage Studio, ul. Przedmiejska 2/02, 54-201 Wrocław, Poland'
    : (booking.location || 'Private Session');

  const title = encodeURIComponent(`Nirvana Massage — ${treatmentName}`);
  const details = encodeURIComponent(`Session with Alina Heorhiieva (${booking.durationMinutes} min). Deposit: ${booking.depositPLN} PLN.`);
  const loc = encodeURIComponent(location);
  const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${loc}&dates=${dates}`;
}
