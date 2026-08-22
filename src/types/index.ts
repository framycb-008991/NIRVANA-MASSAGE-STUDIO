export type Locale = 'en' | 'pl' | 'uk';

export type BookingType = 'in_studio' | 'private';

export interface TreatmentDuration {
  minutes: number;
  pricePLN: number;
  priceEUR: number;
}

export interface Treatment {
  id: string;
  nameKey: string;
  shortDescKey: string;
  fullDescKey: string;
  categoryKey: string;
  durations: TreatmentDuration[];
  image: string;
  featured?: boolean;
}

export interface TimeSlot {
  time: string; // e.g. "09:30"
  available: boolean;
  reason?: 'booked' | 'blocked' | 'buffer' | 'past';
}

export interface BookingClient {
  firstName: string;
  surname: string;
  email: string;
  phone?: string;
  notes?: string;
}

export interface Booking {
  id: string;
  treatmentId: string;
  durationMinutes: number;
  pricePLN: number;
  priceEUR: number;
  depositPLN: number;
  bookingType: BookingType;
  location?: string; // Address or city if private travel
  timezone: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  client: BookingClient;
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  locale: Locale;
  intakeCompleted?: boolean;
  intakeId?: string;
}

export interface BlockedPeriod {
  id: string;
  date: string; // YYYY-MM-DD
  allDay: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  reason: string;
}

export interface HealthIntake {
  id: string;
  bookingId?: string;
  clientName: string;
  clientEmail: string;
  dateSubmitted: string;
  injuriesOrPain?: string;
  pregnancyStatus?: string;
  medicalConditions?: string; // circulatory, allergies to oils, skin
  medications?: string;
  pressurePreference: 'gentle' | 'medium' | 'firm' | 'therapeutic_deep';
  focusAreas?: string;
  gdprExplicitConsent: boolean;
  locale: Locale;
}

export interface NotificationRecord {
  id: string;
  bookingId: string;
  type: 'booking_confirmed' | 'reminder_24h' | 'intake_invitation' | 'booking_cancelled';
  recipient: 'client' | 'practitioner';
  recipientEmail: string;
  subject: string;
  body: string;
  timestamp: string;
  locale: Locale;
}

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  hasResponded: boolean;
}

export interface AnalyticsEvent {
  id: string;
  event: string;
  step?: string;
  treatmentId?: string;
  bookingType?: BookingType;
  locale: Locale;
  timestamp: string;
  path: string;
}
