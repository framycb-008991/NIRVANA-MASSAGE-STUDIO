import { Locale } from '../types';

export function updatePageSEO(page: string, locale: Locale): void {
  if (typeof document === 'undefined') return;

  const baseTitles: Record<string, Record<Locale, string>> = {
    home: {
      en: 'Nirvana Massage Studio — From tension to tranquility | Wrocław, Poland',
      pl: 'Nirvana Studio Masażu — Od napięcia do spokoju | Wrocław',
      uk: 'Nirvana Студія Масажу — Від напруги до спокою | Вроцлав'
    },
    about: {
      en: 'Philosophy & Alina Heorhiieva, Physiotherapy & Massage Specialist | Nirvana Wrocław',
      pl: 'Filozofia & Alina Heorhiieva, Specjalista Fizjoterapii i Masażu | Nirvana Wrocław',
      uk: 'Філософія & Аліна Георгієва, Фізіотерапевт та Масажист | Nirvana Вроцлав'
    },
    services: {
      en: 'Curated Treatment Menu & Holistic Bodywork | Nirvana Massage Poland',
      pl: 'Menu Zabiegów & Holistyczna Praca z Ciałem | Nirvana Studio Polska',
      uk: 'Меню Процедур & Холістичний Масаж | Nirvana Студія Польща'
    },
    booking: {
      en: 'Reserve an Unhurried Session | Nirvana Massage Studio Wrocław',
      pl: 'Rezerwacja Terminu | Nirvana Studio Masażu Wrocław',
      uk: 'Бронювання Сесії | Nirvana Студія Масажу Вроцлав'
    },
    intake: {
      en: 'Health & Consultation Intake | Nirvana Massage Studio',
      pl: 'Karta Zdrowia & Konsultacja | Nirvana Studio Masażu',
      uk: 'Консультаційна Анкета Здоров\'я | Nirvana Студія Масажу'
    },
    contact: {
      en: 'Location & Private Travel Inquiries | Nirvana Wrocław, Poland',
      pl: 'Lokalizacja & Sesje Wyjazdowe | Nirvana Wrocław, Polska',
      uk: 'Локація & Виїзні Сесії | Nirvana Вроцлав, Польща'
    },
    privacy: {
      en: 'GDPR Privacy & Data Protection Policy | Nirvana Massage Studio',
      pl: 'Polityka Prywatności RODO | Nirvana Studio Masażu',
      uk: 'Політика Конфіденційності GDPR | Nirvana Студія Масажу'
    },
    admin: {
      en: 'Practitioner Portal | Nirvana Massage Studio',
      pl: 'Panel Terapeuty | Nirvana Studio Masażu',
      uk: 'Кабінет Терапевта | Nirvana Студія Масажу'
    }
  };

  const descriptions: Record<string, Record<Locale, string>> = {
    home: {
      en: 'Nirvana Massage Studio in Wrocław, Poland. A calm, timeless sanctuary for physiotherapy, holistic bodywork, and private travel sessions by Alina Heorhiieva.',
      pl: 'Nirvana Studio Masażu we Wrocławiu. Spokojna przestrzeń fizjoterapii, masażu holistycznego oraz sesji wyjazdowych prowadzona przez Alinę Heorhiievą.',
      uk: 'Студія масажу Nirvana у Вроцлаві. Простір фізіотерапії, холістичного масажу та виїзних сесій від Аліни Георгієвої.'
    },
    about: {
      en: 'Discover the Nirvana philosophy and meet Alina Heorhiieva, physiotherapy and massage specialist with over 7 years experience and academic training in Taiwan.',
      pl: 'Poznaj filozofię Nirvana i Alinę Heorhiievą – specjalistkę fizjoterapii i masażu z ponad 7-letnim doświadczeniem i praktyką na Tajwanie.',
      uk: 'Дізнайтеся про філософію Nirvana та познайомтеся з Аліною Георгієвою, спеціалістом із фізіотерапії та масажу з понад 7-річним досвідом.'
    },
    services: {
      en: 'Explore our treatments: Signature Holistic Massage, Deep Tension Release & Rehabilitation, Restorative Warm Stone, and Cranial Alignment in Wrocław.',
      pl: 'Sprawdź nasze zabiegi: Masaż Autorski, Głębokie Uwalnianie Napięć & Rehabilitacja, Ciepłe Kamienie Wulkaniczne oraz Balans Czaszkowo-Szyjny.',
      uk: 'Ознайомтеся з процедурами: Авторський масаж, Глибоке вивільнення напруги & Реабілітація, Гаряче каміння та Краніосакральний баланс.'
    },
    booking: {
      en: 'Book your in-studio session in Wrocław (ul. Przedmiejska 2/02) or request a private travel massage session across Poland and Europe.',
      pl: 'Zarezerwuj sesję w studio we Wrocławiu (ul. Przedmiejska 2/02) lub zamów prywatną sesję wyjazdową.',
      uk: 'Забронюйте сеанс у студії у Вроцлаві (вул. Przedmiejska 2/02) або замовте приватну виїзну сесію.'
    },
    intake: {
      en: 'Pre-session health intake for Nirvana Massage Studio. Safe, encrypted, GDPR-compliant consultation.',
      pl: 'Przedzabiegowa karta zdrowia dla klientów Nirvana. Bezpieczna, szyfrowana, zgodna z RODO.',
      uk: 'Консультаційна анкета здоров\'я перед сеансом у Nirvana Massage Studio. Згідно з GDPR.'
    },
    contact: {
      en: 'Visit Nirvana Massage Studio at ul. Przedmiejska 2/02 in Wrocław, Poland. Hours, directions, and Instagram @nirvana_massage.studio.',
      pl: 'Odwiedź studio Nirvana przy ul. Przedmiejskiej 2/02 we Wrocławiu. Dojazd, godziny otwarcia i Instagram @nirvana_massage.studio.',
      uk: 'Завітайте до студії Nirvana на вул. Przedmiejska 2/02 у Вроцлаві. Графік, проїзд та Instagram @nirvana_massage.studio.'
    },
    privacy: {
      en: 'Comprehensive GDPR privacy policy, data controller details, health information handling, and client rights.',
      pl: 'Szczegółowa polityka prywatności RODO, dane administratora i prawa klienta.',
      uk: 'Повна політика конфіденційності GDPR, обробка медичних даних та права клієнтів.'
    },
    admin: {
      en: 'Practitioner schedule management, bookings list, health records, and notification controls.',
      pl: 'Zarządzanie grafikiem, lista rezerwacji, karty zdrowia i powiadomienia.',
      uk: 'Керування розкладом, бронюваннями та анкетами клієнтів.'
    }
  };

  const title = (baseTitles[page] && baseTitles[page][locale]) || baseTitles.home[locale];
  const desc = (descriptions[page] && descriptions[page][locale]) || descriptions.home[locale];

  document.title = title;

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', desc);

  // Update Schema.org JSON-LD
  let schemaScript = document.getElementById('schema-structured-data') as HTMLScriptElement;
  if (!schemaScript) {
    schemaScript = document.createElement('script');
    schemaScript.id = 'schema-structured-data';
    schemaScript.type = 'application/ld+json';
    document.head.appendChild(schemaScript);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HealthAndBeautyBusiness',
        '@id': 'https://nirvanamassage.pl/#studio',
        name: 'Nirvana Massage Studio',
        alternateName: 'Nirvana Studio Masażu',
        description: 'A calm, timeless solo-practitioner physiotherapy and massage studio in Wrocław, Poland.',
        slogan: 'From tension to tranquility.',
        url: 'https://nirvanamassage.pl',
        telephone: '+48 731 920 280',
        email: 'contact@nirvanamassage.pl',
        sameAs: [
          'https://www.instagram.com/nirvana_massage.studio/',
          'https://nirvana-massage-studio.easyweek.pl?ref=instagram'
        ],
        priceRange: '180 PLN - 380 PLN',
        currenciesAccepted: 'PLN, EUR',
        paymentAccepted: 'Cash, Credit Card, BLIK, Online Deposit',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'ul. Przedmiejska 2/02',
          addressLocality: 'Wrocław',
          postalCode: '54-201',
          addressCountry: 'PL'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: '51.1118',
          longitude: '16.9985'
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Friday'],
            opens: '08:00',
            closes: '14:00'
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday'],
            opens: '14:30',
            closes: '22:00'
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Saturday', 'Sunday'],
            opens: '09:00',
            closes: '21:00'
          }
        ],
        founder: {
          '@type': 'Person',
          name: 'Alina Heorhiieva',
          jobTitle: 'Physiotherapist & Massage Specialist',
          hasCredential: 'dyp. med. / Physiotherapist'
        }
      },
      {
        '@type': 'Person',
        '@id': 'https://nirvanamassage.pl/#therapist',
        name: 'Alina Heorhiieva',
        jobTitle: 'Physiotherapist, Massage & Rehabilitation Specialist',
        worksFor: {
          '@id': 'https://nirvanamassage.pl/#studio'
        },
        sameAs: [
          'https://www.instagram.com/nirvana_massage.studio/'
        ]
      }
    ]
  };

  schemaScript.textContent = JSON.stringify(structuredData, null, 2);
}
