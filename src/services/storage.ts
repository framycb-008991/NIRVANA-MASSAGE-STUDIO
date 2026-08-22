import { Treatment, Booking, BlockedPeriod, HealthIntake, NotificationRecord, CookiePreferences, AnalyticsEvent } from '../types';

export const TREATMENTS: Treatment[] = [
  {
    id: 'masaz_profilaktyczny',
    nameKey: 'services.profilaktyczny_name',
    shortDescKey: 'services.profilaktyczny_short',
    fullDescKey: 'services.profilaktyczny_full',
    categoryKey: 'Profilaktyka & Zdrowie',
    durations: [
      { minutes: 60, pricePLN: 200, priceEUR: 46 },
      { minutes: 90, pricePLN: 300, priceEUR: 70 }
    ],
    image: '/assets/alina-portrait-back.jpg',
    featured: true
  },
  {
    id: 'drenaz_limfatyczny',
    nameKey: 'services.limfatyczny_name',
    shortDescKey: 'services.limfatyczny_short',
    fullDescKey: 'services.limfatyczny_full',
    categoryKey: 'Regeneracja & Obrzęki',
    durations: [
      { minutes: 60, pricePLN: 200, priceEUR: 46 },
      { minutes: 90, pricePLN: 300, priceEUR: 70 }
    ],
    image: '/assets/treatment-cupping.jpg',
    featured: true
  },
  {
    id: 'masaz_stretchingowy',
    nameKey: 'services.stretchingowy_name',
    shortDescKey: 'services.stretchingowy_short',
    fullDescKey: 'services.stretchingowy_full',
    categoryKey: 'Mobilność & Elastyczność',
    durations: [
      { minutes: 30, pricePLN: 150, priceEUR: 35 },
      { minutes: 60, pricePLN: 250, priceEUR: 58 }
    ],
    image: '/assets/alina-stretching-leg.jpg',
    featured: true
  },
  {
    id: 'masaz_sportowy',
    nameKey: 'services.sportowy_name',
    shortDescKey: 'services.sportowy_short',
    fullDescKey: 'services.sportowy_full',
    categoryKey: 'Sport & Regeneracja',
    durations: [
      { minutes: 30, pricePLN: 150, priceEUR: 35 },
      { minutes: 60, pricePLN: 250, priceEUR: 58 }
    ],
    image: '/assets/treatment-blade-iastm.jpg',
    featured: true
  },
  {
    id: 'masaz_antystresowy',
    nameKey: 'services.antystresowy_name',
    shortDescKey: 'services.antystresowy_short',
    fullDescKey: 'services.antystresowy_full',
    categoryKey: 'Relaks & Wyciszenie',
    durations: [
      { minutes: 60, pricePLN: 200, priceEUR: 46 },
      { minutes: 90, pricePLN: 300, priceEUR: 70 }
    ],
    image: '/assets/alina-portrait-back.jpg',
    featured: true
  }
];

const STORAGE_KEYS = {
  BOOKINGS: 'nirvana_bookings',
  BLOCKED: 'nirvana_blocked_periods',
  INTAKES: 'nirvana_health_intakes',
  NOTIFICATIONS: 'nirvana_notifications',
  COOKIES: 'nirvana_cookie_prefs',
  ANALYTICS: 'nirvana_analytics_events'
};

// Default seed sample bookings for realism in Admin and availability testing
function getInitialBookings(): Booking[] {
  const today = new Date();
  const d1 = new Date(today);
  d1.setDate(today.getDate() + 1);
  const d1Str = d1.toISOString().split('T')[0];

  const d2 = new Date(today);
  d2.setDate(today.getDate() + 3);
  const d2Str = d2.toISOString().split('T')[0];

  return [
    {
      id: 'bk_sample_101',
      treatmentId: 'masaz_profilaktyczny',
      durationMinutes: 90,
      pricePLN: 300,
      priceEUR: 70,
      depositPLN: 50,
      bookingType: 'in_studio',
      timezone: 'Europe/Warsaw',
      date: d1Str,
      timeSlot: '11:00',
      client: {
        firstName: 'Aleksandra',
        surname: 'Kowalska',
        email: 'aleksandra.k@example.pl',
        phone: '+48 601 234 567',
        notes: 'Frequent desk work, neck tightness'
      },
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      locale: 'pl'
    },
    {
      id: 'bk_sample_102',
      treatmentId: 'deep_tension',
      durationMinutes: 60,
      pricePLN: 240,
      priceEUR: 55,
      depositPLN: 50,
      bookingType: 'private',
      location: 'The Bridge Wrocław MGallery, Plac Katedralny 8, Wrocław',
      timezone: 'Europe/Warsaw',
      date: d2Str,
      timeSlot: '16:00',
      client: {
        firstName: 'David',
        surname: 'Miller',
        email: 'david.miller@example.com',
        phone: '+44 7911 123456',
        notes: 'In Wrocław for conference, upper back rehabilitation'
      },
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      locale: 'en'
    }
  ];
}

// Initial seed blocked periods (e.g. Sunday studio closure or retreat day)
function getInitialBlocked(): BlockedPeriod[] {
  return [
    {
      id: 'blk_1',
      date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      allDay: false,
      startTime: '13:00',
      endTime: '15:00',
      reason: 'Practitioner Somatic Workshop'
    }
  ];
}

export function getBookings(): Booking[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!raw) {
      const initial = getInitialBookings();
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveBooking(booking: Booking): void {
  const current = getBookings();
  const index = current.findIndex(b => b.id === booking.id);
  if (index >= 0) {
    current[index] = booking;
  } else {
    current.unshift(booking);
  }
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(current));
}

export function updateBookingStatus(id: string, status: 'confirmed' | 'cancelled' | 'completed'): void {
  const current = getBookings();
  const target = current.find(b => b.id === id);
  if (target) {
    target.status = status;
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(current));
  }
}

export function getBlockedPeriods(): BlockedPeriod[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED);
    if (!raw) {
      const initial = getInitialBlocked();
      localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addBlockedPeriod(period: BlockedPeriod): void {
  const current = getBlockedPeriods();
  current.push(period);
  localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(current));
}

export function removeBlockedPeriod(id: string): void {
  const current = getBlockedPeriods().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(current));
}

export function getHealthIntakes(): HealthIntake[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INTAKES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHealthIntake(intake: HealthIntake): void {
  const current = getHealthIntakes();
  current.unshift(intake);
  localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(current));

  // If associated with a booking, mark it
  if (intake.bookingId) {
    const bookings = getBookings();
    const bk = bookings.find(b => b.id === intake.bookingId);
    if (bk) {
      bk.intakeCompleted = true;
      bk.intakeId = intake.id;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    }
  }
}

export function getNotifications(): NotificationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function logNotification(record: NotificationRecord): void {
  const current = getNotifications();
  current.unshift(record);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(current));
}

export function getCookiePreferences(): CookiePreferences {
  if (typeof window === 'undefined') return { essential: true, analytics: false, marketing: false, hasResponded: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COOKIES);
    return raw ? JSON.parse(raw) : { essential: true, analytics: false, marketing: false, hasResponded: false };
  } catch {
    return { essential: true, analytics: false, marketing: false, hasResponded: false };
  }
}

export function saveCookiePreferences(prefs: CookiePreferences): void {
  localStorage.setItem(STORAGE_KEYS.COOKIES, JSON.stringify({ ...prefs, hasResponded: true }));
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  const prefs = getCookiePreferences();
  if (!prefs.analytics) return; // Only log if user consented
  try {
    const current = getAnalyticsEvents();
    current.unshift(event);
    if (current.length > 500) current.pop();
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(current));
  } catch {
    // Ignore storage issues
  }
}
