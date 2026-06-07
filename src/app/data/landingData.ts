/** Mock data for Ma Reservation landing page */

export const navItems = [
  { label: 'Explorer', href: '/explorer' },
  { label: 'Lieux', href: '/explorer' },
  { label: 'À propos', href: '#a-propos' },
] as const;

export const categories = [
  { label: 'Cafés & Lounges', icon: 'coffee' },
  { label: 'Bars & Rooftops', icon: 'cocktail' },
  { label: 'Restaurants Gastronomiques', icon: 'restaurant' },
  { label: 'Clubs & Resto de Nuit', icon: 'champagne' },
  { label: 'Salles Privés & Événementiel', icon: 'events' },
  { label: 'Hôtels & Resorts', icon: 'hotel' },
  { label: 'Beach Clubs', icon: 'beach' },
  { label: 'Spas & Bien-être', icon: 'spa' },
] as const;

export const howItWorksSteps = [
  {
    number: 1,
    title: 'Explorez le lieu',
    subtitle: 'Visite virtuelle immersive',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
  },
  {
    number: 2,
    title: 'Choisissez votre espace',
    subtitle: 'Table, VIP ou terrasse',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80',
  },
  {
    number: 3,
    title: 'Réservez et payez',
    subtitle: 'Paiement sécurisé en ligne',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  },
] as const;

export const footerSections = [
  {
    title: 'Ma Reservation',
    links: [
      { label: 'À propos', href: '#a-propos' },
      { label: 'Cafés', href: '/cafes' },
    ],
  },
  {
    title: 'À propos',
    links: [
      { label: 'Vision', href: '#vision' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Professionnels',
    links: [
      { label: 'Devenir partenaire', href: '/proposer' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Conditions générales', href: '#cgv' },
    ],
  },
] as const;

export const heroImage = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&q=80';
export const worldMapImage = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80';
