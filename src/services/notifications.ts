import { Booking, Locale, NotificationRecord } from '../types';
import { formatLocaleDate } from './i18n';
import { logNotification } from './storage';

export function sendBookingConfirmedNotification(booking: Booking, treatmentName: string): { clientRecord: NotificationRecord; practitionerRecord: NotificationRecord } {
  const clientLocale: Locale = booking.locale || 'en';
  const dateFormatted = formatLocaleDate(booking.date, clientLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const locationStr = booking.bookingType === 'in_studio'
    ? 'Nirvana Massage Studio (ul. Przedmiejska 2/02, 54-201 Wrocław, Poland)'
    : `Private Session at ${booking.location || 'Client location'}`;

  // Client Email
  let subject = '';
  let body = '';

  if (clientLocale === 'pl') {
    subject = `Potwierdzenie rezerwacji: ${treatmentName} — Nirvana Massage Studio`;
    body = `Dzień dobry ${booking.client.firstName},\n\nTwój termin został pomyślnie zarezerwowany. Czekamy na spotkanie z Tobą w naszej spokojnej przestrzeni we Wrocławiu.\n\nSzczegóły wizyty:\n• Zabieg: ${treatmentName} (${booking.durationMinutes} min)\n• Data: ${dateFormatted}\n• Godzina: ${booking.timeSlot}\n• Miejsce: ${locationStr}\n• Wpłacony zadatek: ${booking.depositPLN} PLN (pozostała kwota: ${booking.pricePLN - booking.depositPLN} PLN płatna na miejscu)\n\nPrzed wizytą prosimy o wypełnienie krótkiej ankiety zdrowotnej: ${window.location.origin}/intake?booking_id=${booking.id}\n\nZasady anulacji: Bezpłatna zmiana terminu do 24h przed wizytą.\n\nZ ciepłymi pozdrowieniami,\nAlina Heorhiieva\nNirvana Massage Studio (Wrocław)`;
  } else if (clientLocale === 'uk') {
    subject = `Підтвердження бронювання: ${treatmentName} — Nirvana Massage Studio`;
    body = `Вітаємо, ${booking.client.firstName}!\n\nВаш сеанс успішно заброньовано. Ми з нетерпінням чекаємо на зустріч у нашій студії у Вроцлаві.\n\nДеталі сеансу:\n• Процедура: ${treatmentName} (${booking.durationMinutes} хв)\n• Дата: ${dateFormatted}\n• Час: ${booking.timeSlot}\n• Локація: ${locationStr}\n• Сплачений завдаток: ${booking.depositPLN} PLN (залишок: ${booking.pricePLN - booking.depositPLN} PLN сплачується під час візиту)\n\nБудь ласка, заповніть коротку анкету здоров'я перед візитом: ${window.location.origin}/intake?booking_id=${booking.id}\n\nЗ повагою,\nАліна Георгієва\nNirvana Massage Studio (Вроцлав)`;
  } else {
    subject = `Booking Confirmation: ${treatmentName} — Nirvana Massage Studio`;
    body = `Dear ${booking.client.firstName},\n\nYour session has been reserved. We look forward to welcoming you into a calm space in Wrocław.\n\nAppointment Details:\n• Treatment: ${treatmentName} (${booking.durationMinutes} min)\n• Date: ${dateFormatted}\n• Time: ${booking.timeSlot}\n• Location: ${locationStr}\n• Deposit Paid: ${booking.depositPLN} PLN (Balance remaining: ${booking.pricePLN - booking.depositPLN} PLN at session)\n\nBefore arrival, please complete your brief health intake: ${window.location.origin}/intake?booking_id=${booking.id}\n\nCancellation policy: Free cancellation or reschedule up to 24h before your session.\n\nWarmly,\nAlina Heorhiieva\nNirvana Massage Studio (Wrocław)`;
  }

  const clientRecord: NotificationRecord = {
    id: 'notif_' + Math.random().toString(36).substr(2, 9),
    bookingId: booking.id,
    type: 'booking_confirmed',
    recipient: 'client',
    recipientEmail: booking.client.email,
    subject,
    body,
    timestamp: new Date().toISOString(),
    locale: clientLocale
  };

  // Practitioner copy (Polish / internal)
  const practitionerRecord: NotificationRecord = {
    id: 'notif_' + Math.random().toString(36).substr(2, 9),
    bookingId: booking.id,
    type: 'booking_confirmed',
    recipient: 'practitioner',
    recipientEmail: 'alina@nirvanamassage.pl',
    subject: `[Nowa Rezerwacja] ${booking.client.firstName} ${booking.client.surname} — ${treatmentName} (${booking.date} ${booking.timeSlot})`,
    body: `Nowa rezerwacja online:\n• Klient: ${booking.client.firstName} ${booking.client.surname} (${booking.client.email}, tel: ${booking.client.phone || 'brak'})\n• Zabieg: ${treatmentName} (${booking.durationMinutes} min)\n• Data: ${booking.date} godz. ${booking.timeSlot}\n• Typ: ${booking.bookingType === 'in_studio' ? 'W studio (Wrocław)' : `Wyjazdowa: ${booking.location}`}\n• Notatka klienta: ${booking.client.notes || 'brak'}\n• Zadatek: ${booking.depositPLN} PLN opłacony.`,
    timestamp: new Date().toISOString(),
    locale: 'pl'
  };

  logNotification(clientRecord);
  logNotification(practitionerRecord);

  return { clientRecord, practitionerRecord };
}

export function sendCancellationNotification(booking: Booking, treatmentName: string): { clientRecord: NotificationRecord; practitionerRecord: NotificationRecord } {
  const clientLocale: Locale = booking.locale || 'en';
  const dateFormatted = formatLocaleDate(booking.date, clientLocale);

  const subject = clientLocale === 'pl'
    ? `Anulowanie rezerwacji: ${treatmentName} — Nirvana Massage Studio`
    : clientLocale === 'uk'
    ? `Скасування бронювання: ${treatmentName} — Nirvana Massage Studio`
    : `Cancellation Notice: ${treatmentName} — Nirvana Massage Studio`;

  const body = clientLocale === 'pl'
    ? `Dzień dobry ${booking.client.firstName},\n\nTwoja rezerwacja na zabieg ${treatmentName} w dniu ${dateFormatted} została anulowana.\n\nJeśli chcesz dokonać nowej rezerwacji, zapraszamy na stronę: ${window.location.origin}/booking\n\nPozdrawiamy,\nAlina Heorhiieva\nNirvana Massage Studio`
    : clientLocale === 'uk'
    ? `Вітаємо, ${booking.client.firstName}.\n\nВаше бронювання на процедуру ${treatmentName} на дату ${dateFormatted} скасовано.\n\nДля нового запису перейдіть за посиланням: ${window.location.origin}/booking\n\nЗ повагою,\nАліна Георгієва\nNirvana Massage Studio`
    : `Dear ${booking.client.firstName},\n\nYour appointment for ${treatmentName} on ${dateFormatted} has been cancelled.\n\nTo rebook a future session, please visit: ${window.location.origin}/booking\n\nWarmly,\nAlina Heorhiieva\nNirvana Massage Studio`;

  const clientRecord: NotificationRecord = {
    id: 'notif_' + Math.random().toString(36).substr(2, 9),
    bookingId: booking.id,
    type: 'booking_cancelled',
    recipient: 'client',
    recipientEmail: booking.client.email,
    subject,
    body,
    timestamp: new Date().toISOString(),
    locale: clientLocale
  };

  const practitionerRecord: NotificationRecord = {
    id: 'notif_' + Math.random().toString(36).substr(2, 9),
    bookingId: booking.id,
    type: 'booking_cancelled',
    recipient: 'practitioner',
    recipientEmail: 'alina@nirvanamassage.pl',
    subject: `[Anulowano] Rezerwacja ${booking.client.firstName} ${booking.client.surname} (${booking.date})`,
    body: `Rezerwacja na ${treatmentName} w dniu ${booking.date} (${booking.timeSlot}) została anulowana.`,
    timestamp: new Date().toISOString(),
    locale: 'pl'
  };

  logNotification(clientRecord);
  logNotification(practitionerRecord);

  return { clientRecord, practitionerRecord };
}
