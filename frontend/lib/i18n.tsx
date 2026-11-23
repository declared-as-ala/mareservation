'use client';

/**
 * Lightweight i18n for the public shell & home page: French (primary), English, Arabic (RTL).
 * The choice is remembered (localStorage + cookie) and applied to <html lang dir>.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'fr' | 'en' | 'ar';
export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ar', label: 'العربية', short: 'AR' },
];

const fr = {
  'nav.home': 'Accueil',
  'nav.explore': 'Explorer',
  'nav.host': 'Devenir hôte',
  'nav.login': 'Se connecter',
  'nav.signup': "S'inscrire",
  'nav.where': 'Où en Tunisie ?',
  'nav.account': 'Mon compte',
  'nav.bookings': 'Mes réservations',
  'nav.ownerSpace': 'Espace propriétaire',
  'nav.admin': 'Administration',
  'nav.logout': 'Se déconnecter',
  'nav.menu': 'Menu',
  'nav.language': 'Langue',
  'hero.title': "Les plus belles maisons d'hôtes de Tunisie",
  'hero.subtitle': 'Votre prochaine escapade commence ici.',
  'hero.lead': "Des maisons d'hôtes uniques, à visiter en 360° avant de réserver — du bord de mer aux montagnes du Nord-Ouest.",
  'search.where': 'Où',
  'search.wherePh': 'Ville ou région',
  'search.checkIn': 'Arrivée',
  'search.checkOut': 'Départ',
  'search.addDate': 'Ajouter une date',
  'search.guests': 'Voyageurs',
  'search.addGuests': 'Ajouter des voyageurs',
  'search.adults': 'Adultes',
  'search.adultsHint': '13 ans et plus',
  'search.children': 'Enfants',
  'search.childrenHint': 'De 2 à 12 ans',
  'search.submit': 'Rechercher',
  'search.anywhere': 'Toute la Tunisie',
  'search.clear': 'Effacer',
  'search.done': 'Valider',
  'search.suggestions': 'Destinations',
  'cat.title': 'Trouvez votre style',
  'home.destinations': 'Destinations populaires',
  'home.destinationsLead': "Les régions où nos maisons d'hôtes vous attendent.",
  'home.featured': "Maisons d'hôtes à découvrir",
  'home.featuredLead': 'Sélectionnées pour leur caractère, visitables en 360°.',
  'home.seeAll': 'Tout voir',
  'home.houses': 'maisons',
  'home.house': 'maison',
  'home.soon': 'Bientôt disponible',
  'home.360.kicker': "L'expérience Exploria360",
  'home.360.title': 'Visitez avant de réserver.',
  'home.360.lead': "Chaque pièce, la terrasse, la vue : parcourez la maison en 360° comme si vous y étiez, puis réservez en toute confiance.",
  'home.360.b1': 'Aucune mauvaise surprise : ce que vous voyez est ce que vous trouverez.',
  'home.360.b2': 'Sur ordinateur, tablette ou mobile, en plein écran.',
  'home.360.b3': 'Choisissez votre chambre en connaissant les lieux.',
  'home.360.cta': 'Découvrir les visites 360°',
  'home.host.title': "Vous possédez une maison d'hôtes ?",
  'home.host.lead': 'Faites-la visiter en 360°, gérez votre calendrier et recevez des réservations directement.',
  'home.host.cta': 'Devenir partenaire Exploria360',
  'footer.tagline': "Les maisons d'hôtes de Tunisie, à visiter en 360° avant de réserver.",
  'footer.explore': 'Explorer',
  'footer.company': 'Exploria360',
  'footer.legal': 'Informations',
  'footer.about': 'À propos',
  'footer.contact': 'Contact',
  'footer.terms': 'Conditions générales',
  'footer.privacy': 'Politique de confidentialité',
  'footer.legalNotice': 'Mentions légales',
  'footer.cancellation': "Conditions d'annulation",
  'footer.faq': 'Questions fréquentes',
  'footer.map': 'Carte des maisons',
  'footer.rights': 'Tous droits réservés.',
  'card.from': 'À partir de',
  'card.night': 'nuit',
  'card.guests': 'voyageurs',
  'card.bedrooms': 'chambres',
  'card.instant': 'Instantanée',
  'card.demo': 'Démo',
};
export type MessageKey = keyof typeof fr;
type Dict = Record<MessageKey, string>;

const en: Dict = {
  'nav.home': 'Home', 'nav.explore': 'Explore', 'nav.host': 'Become a host', 'nav.login': 'Log in', 'nav.signup': 'Sign up',
  'nav.where': 'Where in Tunisia?', 'nav.account': 'My account', 'nav.bookings': 'My bookings', 'nav.ownerSpace': 'Owner space',
  'nav.admin': 'Administration', 'nav.logout': 'Log out', 'nav.menu': 'Menu', 'nav.language': 'Language',
  'hero.title': 'The finest guesthouses in Tunisia', 'hero.subtitle': 'Your next getaway starts here.',
  'hero.lead': 'Unique guesthouses you can tour in 360° before booking — from the coast to the north-western mountains.',
  'search.where': 'Where', 'search.wherePh': 'City or region', 'search.checkIn': 'Check-in', 'search.checkOut': 'Check-out',
  'search.addDate': 'Add a date', 'search.guests': 'Guests', 'search.addGuests': 'Add guests', 'search.adults': 'Adults',
  'search.adultsHint': 'Ages 13 or above', 'search.children': 'Children', 'search.childrenHint': 'Ages 2–12', 'search.submit': 'Search',
  'search.anywhere': 'All of Tunisia', 'search.clear': 'Clear', 'search.done': 'Done', 'search.suggestions': 'Destinations',
  'cat.title': 'Find your style', 'home.destinations': 'Popular destinations', 'home.destinationsLead': 'Regions where our guesthouses await you.',
  'home.featured': 'Guesthouses to discover', 'home.featuredLead': 'Chosen for their character, all viewable in 360°.', 'home.seeAll': 'See all',
  'home.houses': 'houses', 'home.house': 'house', 'home.soon': 'Coming soon', 'home.360.kicker': 'The Exploria360 experience',
  'home.360.title': 'Visit before you book.', 'home.360.lead': 'Every room, the terrace, the view: walk through the house in 360° as if you were there, then book with confidence.',
  'home.360.b1': 'No bad surprises: what you see is what you get.', 'home.360.b2': 'On desktop, tablet or phone, full screen.',
  'home.360.b3': 'Pick your room knowing the place.', 'home.360.cta': 'Discover the 360° tours',
  'home.host.title': 'Do you own a guesthouse?', 'home.host.lead': 'Showcase it in 360°, manage your calendar and receive bookings directly.',
  'home.host.cta': 'Become an Exploria360 partner', 'footer.tagline': "Tunisia's guesthouses, to tour in 360° before you book.",
  'footer.explore': 'Explore', 'footer.company': 'Exploria360', 'footer.legal': 'Information', 'footer.about': 'About', 'footer.contact': 'Contact',
  'footer.terms': 'Terms & conditions', 'footer.privacy': 'Privacy policy', 'footer.legalNotice': 'Legal notice', 'footer.cancellation': 'Cancellation terms',
  'footer.faq': 'FAQ', 'footer.map': 'Map of guesthouses', 'footer.rights': 'All rights reserved.', 'card.from': 'From', 'card.night': 'night',
  'card.guests': 'guests', 'card.bedrooms': 'bedrooms', 'card.instant': 'Instant', 'card.demo': 'Demo',
};

const ar: Dict = {
  'nav.home': 'الرئيسية', 'nav.explore': 'استكشف', 'nav.host': 'كن مضيفًا', 'nav.login': 'تسجيل الدخول', 'nav.signup': 'إنشاء حساب',
  'nav.where': 'إلى أين في تونس؟', 'nav.account': 'حسابي', 'nav.bookings': 'حجوزاتي', 'nav.ownerSpace': 'فضاء المالك',
  'nav.admin': 'الإدارة', 'nav.logout': 'تسجيل الخروج', 'nav.menu': 'القائمة', 'nav.language': 'اللغة',
  'hero.title': 'أجمل دور الضيافة في تونس', 'hero.subtitle': 'عطلتك القادمة تبدأ من هنا.',
  'hero.lead': 'دور ضيافة فريدة يمكنك زيارتها بتقنية 360° قبل الحجز — من الساحل إلى جبال الشمال الغربي.',
  'search.where': 'أين', 'search.wherePh': 'مدينة أو منطقة', 'search.checkIn': 'الوصول', 'search.checkOut': 'المغادرة',
  'search.addDate': 'أضف تاريخًا', 'search.guests': 'المسافرون', 'search.addGuests': 'أضف مسافرين', 'search.adults': 'البالغون',
  'search.adultsHint': '13 سنة فما فوق', 'search.children': 'الأطفال', 'search.childrenHint': 'من 2 إلى 12 سنة', 'search.submit': 'بحث',
  'search.anywhere': 'كل تونس', 'search.clear': 'مسح', 'search.done': 'تأكيد', 'search.suggestions': 'الوجهات',
  'cat.title': 'اختر أسلوبك', 'home.destinations': 'الوجهات الأكثر طلبًا', 'home.destinationsLead': 'المناطق التي تنتظرك فيها دور الضيافة لدينا.',
  'home.featured': 'دور ضيافة لاكتشافها', 'home.featuredLead': 'مختارة لطابعها المميز، وكلها قابلة للزيارة بتقنية 360°.', 'home.seeAll': 'عرض الكل',
  'home.houses': 'دور', 'home.house': 'دار', 'home.soon': 'قريبًا', 'home.360.kicker': 'تجربة Exploria360',
  'home.360.title': 'زر قبل أن تحجز.', 'home.360.lead': 'كل غرفة، الشرفة، الإطلالة: تجوّل في الدار بتقنية 360° كأنك هناك، ثم احجز بثقة.',
  'home.360.b1': 'لا مفاجآت: ما تراه هو ما ستجده.', 'home.360.b2': 'على الحاسوب أو اللوحة أو الهاتف، بملء الشاشة.',
  'home.360.b3': 'اختر غرفتك وأنت تعرف المكان.', 'home.360.cta': 'اكتشف جولات 360°',
  'home.host.title': 'هل تملك دار ضيافة؟', 'home.host.lead': 'اعرضها بتقنية 360°، وأدر رزنامتك، واستقبل الحجوزات مباشرة.',
  'home.host.cta': 'كن شريكًا في Exploria360', 'footer.tagline': 'دور الضيافة في تونس، لزيارتها بتقنية 360° قبل الحجز.',
  'footer.explore': 'استكشف', 'footer.company': 'Exploria360', 'footer.legal': 'معلومات', 'footer.about': 'من نحن', 'footer.contact': 'اتصل بنا',
  'footer.terms': 'الشروط العامة', 'footer.privacy': 'سياسة الخصوصية', 'footer.legalNotice': 'الإشعار القانوني', 'footer.cancellation': 'شروط الإلغاء',
  'footer.faq': 'الأسئلة الشائعة', 'footer.map': 'خريطة الدور', 'footer.rights': 'جميع الحقوق محفوظة.', 'card.from': 'ابتداءً من', 'card.night': 'ليلة',
  'card.guests': 'مسافرين', 'card.bedrooms': 'غرف', 'card.instant': 'فوري', 'card.demo': 'عرض توضيحي',
};

const DICTS: Record<Locale, Dict> = { fr, en, ar };

interface Ctx {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (l: Locale) => void;
  t: (k: MessageKey) => string;
}
const LocaleContext = createContext<Ctx>({ locale: 'fr', dir: 'ltr', setLocale: () => undefined, t: (k) => fr[k] });

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ex-locale') as Locale | null;
      if (saved && saved in DICTS) setLocaleState(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('ex-locale', l);
      document.cookie = `ex-locale=${l};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo<Ctx>(() => ({ locale, dir: locale === 'ar' ? 'rtl' : 'ltr', setLocale, t: (k) => DICTS[locale][k] ?? fr[k] }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useI18n = () => useContext(LocaleContext);
