# Ma Reservation 🍽️

**Ma Reservation** is a modern table reservation platform that allows users to discover, explore, and reserve tables at restaurants, cafes, and event venues across Tunisia. The platform features immersive 360° virtual tours, allowing customers to choose their perfect table before arriving.

## ✨ Features

### For Customers
- **Browse Venues**: Explore restaurants, cafes, and event venues across Tunisia
- **360° Virtual Tours**: Experience venues through immersive panoramic views before visiting
- **Table Selection**: Choose your perfect table based on location preferences (window, terrace, stage, etc.)
- **Event Discovery**: Browse and discover events happening at various venues
- **Instant Reservations**: Book tables with instant confirmation via email and SMS
- **User Dashboard**: Manage your reservations and preferences

### For Admins
- **Admin Dashboard** (`/admin`): KPIs, charts (réservations par jour, revenu, par type, par ville, top lieux), gestion utilisateurs, lieux, réservations, événements
- **Export CSV**: Exporter les réservations
- **Annulation**: Annuler toute réservation (admin)

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose (recommended), or Node.js 20+
- **MongoDB Atlas** account (connection string in `backend/.env` as `MONGO_URI`)
- npm, yarn, or pnpm package manager

### Quick Start with Docker (Recommended)

**Database:** The app uses **MongoDB Atlas only** (no MongoDB in Docker). Set your Atlas connection string in `backend/.env`:

```bash
# Copy example and set your Atlas URI (do not commit real credentials)
cp backend/env.example backend/.env
# Edit backend/.env: MONGO_URI, JWT_SECRET, FRONTEND_URL (CORS)
```

```bash
# Start backend and frontend (no MongoDB container)
docker-compose up -d

# Seed the database with realistic Tunisia data (users, venues, tables, hotspots, events, sample reservations)
docker-compose exec backend npm run seed

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
```

**Seed accounts** (password: `password123` for all):

| Role     | Email                    | Use case              |
|----------|--------------------------|------------------------|
| Admin    | `admin@mareservation.tn` | Admin dashboard at `/admin` (KPIs, charts, gestion) |
| Customer | `client1@example.com`    | Compte avec réservations (table, chambre, siège, passées) |
| Customer | `client2@example.com`    | Compte avec résa annulée + en attente |
| Customer | `client3@example.com`, `client4@example.com`, `client5@example.com` | Login, réserver |

### Manual Setup

#### 1. Backend Setup

```bash
cd backend
npm install
cp env.example .env
# Edit .env: MONGODB_URI, JWT_SECRET, FRONTEND_URL
npm run dev
```

#### 2. Frontend Setup

```bash
# From project root
npm install
cp env.example .env
# Edit .env: VITE_API_BASE_URL=http://localhost:3001 (no trailing slash)
npm run dev
```

#### 3. Seed Database

Use **MongoDB Atlas** only. Set `MONGO_URI` in `backend/.env` (see `backend/env.example`). No local MongoDB or Docker MongoDB.

```bash
cd backend
cp env.example .env
# Set MONGO_URI to your Atlas connection string
npm run seed
```

This creates: 1 admin, 5 customers; 2 cafés (2 tables each), 1 restaurant, 1 hotel (4 rooms), 1 cinema (3 seats); **Klapty 360° embed URLs**; events; 7 réservations (CONFIRMED, CANCELLED, PENDING) for client1 et client2. Données réalistes Tunisie, prix en TND.

For detailed setup instructions, see [SETUP.md](./SETUP.md) if present.

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
npm run build
# Output in dist/ directory. Set VITE_API_BASE_URL to your backend URL for production.
```

## Deploy (Vercel)

- **Backend** : repo [mareservtaion-backend](https://github.com/declared-as-ala/mareservtaion-backend). Variables : `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`. Health : `GET /api/v1/health`. Voir `backend/README.md`.
- **Frontend** : repo [mareservtaion-frontend](https://github.com/declared-as-ala/mareservtaion-frontend). Variable : `VITE_API_BASE_URL` = URL du backend (ex: `https://mareservtaion-backend.vercel.app`). Build : `npm run build` ; pas de localhost en production.

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - UI library
- **TypeScript** - Type safety
- **Vite 6.3.5** - Build tool and dev server
- **React Router 7.13.0** - Client-side routing
- **Tailwind CSS 4.1.12** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Pre-built component library

### Backend
- **Node.js 20+** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Key Libraries
- **Pannellum React** - 360° panoramic viewer
- **React Hook Form** - Form management
- **date-fns** - Date manipulation
- **Sonner** - Toast notifications

## 📁 Project Structure

```
Mareservation/
├── backend/                   # Node.js + Express backend
│   ├── src/
│   │   ├── models/           # MongoDB models
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth middleware
│   │   ├── config/           # Database config
│   │   ├── scripts/          # Seed script
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── src/                      # React frontend
│   ├── app/
│   │   ├── components/      # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service
│   │   ├── context/        # React context
│   │   └── routes.ts
│   └── styles/
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## 🎨 Landing page (Accueil) — images and colors

The landing page at `/` uses a dark charcoal + gold theme. To adjust:

- **Images**: Edit `src/app/data/landingData.ts`:
  - `heroImage` — hero background (e.g. luxury restaurant/rooftop)
  - `worldMapImage` — world map section
  - `howItWorksSteps[].image` — step card images
- **Colors**: In `src/styles/theme.css`, change the `:root` variables:
  - `--landing-bg` — main background (#161616)
  - `--landing-card` — card background (#1a1a1a)
  - `--landing-gold` / `--landing-gold-light` — accent (#c9a227 / #d4af37)
  - `--landing-text` / `--landing-text-muted` — text (#e8e4dc / #b8b4ac)
  - `--landing-border` — borders (gold-tinted rgba)

Fonts are loaded from Google Fonts in `index.html`: Playfair Display (headings), Inter (body).

**Data:** All venue, table, and event data comes from the backend (MongoDB). No mock data. Images and 360° URLs are in `VenueMedia` (HERO_IMAGE, GALLERY_IMAGE, TOUR_360_VIDEO). Landing images: `src/app/data/landingData.ts`.

## 🗺️ Routes

- `/` - Landing page (Accueil)
- `/connexion` - Connexion / Créer un compte (auth)
- `/login` - Alias de `/connexion`
- `/explorer` - Explorer (recherche + filtres + grille de lieux)
- `/restaurants` - Liste restaurants (filtres par défaut)
- `/cafes` - Liste cafés
- `/evenements` - Liste événements (filtres Ville, Date, Type)
- `/lieu/:id` - Détail lieu (hero, 360°, carte réservation)
- `/reservation` - Tunnel réservation (détails → infos client → confirmation)
- `/dashboard` - Mes réservations + profil
- `/admin` - Tableau de bord admin (stats, utilisateurs, lieux, réservations) — réservé aux comptes ADMIN
- `/proposer` - Redirige vers `/` (pas d'espace établissement)

**Design** : toutes les pages (y compris l'accueil) utilisent la même navbar et le même footer (AppBar unifié avec recherche).
## 🎨 Key Features Explained

### 360° Virtual Tours (Klapty embeds)
The iframe `src` is **never** set to anything except `https://www.klapty.com/tour/tunnel/<ID>`. Invalid URLs show "Lien de visite 360° invalide" and "Ouvrir sur Klapty". If you see storage.klapty.com errors, run `npm run fix-klapty-urls` in the backend (add `-- --fix` to replace invalid DB URLs). Tours use **Klapty tunnel embed URLs only** in the database (`VenueMedia` with kind `TOUR_360_EMBED_URL`). Store **only** the official tunnel URL: `https://www.klapty.com/tour/tunnel/<TOUR_ID>`. Do **not** use `storage.klapty.com` or public page URLs (`/p/.../t/...`). The frontend renders them via `<iframe>` (skeleton while loading; fallback with “Ouvrir la visite dans un nouvel onglet” if the URL is invalid or the iframe fails). By venue type:
- **Café / Restaurant:** 360 tour + selection de table (max 2 tables par café; cartes sélectionnables).
- **Hôtel:** liste de chambres; chaque chambre peut avoir son tour 360 + "Réserver cette chambre".
- **Cinéma:** 360 tour + sélecteur de places (3 sièges en seed).

### Table Reservation Flow
1. Browse venues and view 360° tours (markers from DB hotspots).
2. Select a table from the virtual tour or table list; choose date and time.
3. Click “Réserver cette table” (user must be logged in). Reservation is created via `POST /api/reservations` with `startAt`/`endAt` (2h slot). Double booking is prevented by time-overlap checks.
4. Redirect to confirmation; manage bookings under “Mes réservations”.

### Real-time Availability
- Tables show availability for the selected date/time window (`startAt`/`endAt`).
- Backend prevents double booking by checking overlapping reservations for the same table.

### API & Auth
- **Base URL:** All API routes are under `/api/v1`. Health: `GET /api/v1/health`.
- **Auth:** `POST /api/v1/auth/register`, `/login`, `/refresh` (refresh token in httpOnly cookie), `/logout`, `GET /me`. JWT access token in response; use `credentials: 'include'` for cookies.
- **Venues:** `GET /api/v1/venues`, `GET /api/v1/venues/:idOrSlug` (includes media, tables, hotspots, virtualTours, tourHotspots, events; optional `startAt`/`endAt` for availability).
- **Reservations:** `POST /api/v1/reservations` (guestFirstName, guestLastName, guestPhone, partySize requis), `GET /api/v1/reservations/me`, `GET /api/v1/reservations/:id/ticket`, `PATCH /api/v1/reservations/:id/cancel`.
- **Admin:** `GET /api/v1/admin/overview?range=30d`, `/charts/*`, `/users`, `/venues`, `/reservations`, `/virtual-tours`, `/tour-hotspots`. Toutes les données depuis MongoDB.

## 📝 Data Models

### Venue
- Basic information (name, type, location, rating)
- Images and descriptions
- Available tables count
- Event information
- Pricing

### Table
- Table number and capacity
- Location description
- Pricing
- Availability status
- Position coordinates (for visual representation)

### Event
- Event name and type
- Venue association
- Date and time
- Description and images

## 🔧 Development

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Component-based architecture
- Tailwind CSS for styling

### Adding a new venue and 360° video
1. Create the venue (and owner user if needed) via API or seed. Add `VenueMedia` entries: one `HERO_IMAGE`, optional `GALLERY_IMAGE`s, and one `TOUR_360_VIDEO` with the 360 video URL.
2. Create `Table` documents for the venue (tableNumber, capacity, locationLabel, price, isVip).
3. For each table, create a `TableHotspot` with the same `venueId`, `tableId`, `sceneId` (e.g. `"scene0"`), and `pitch`/`yaw` (angles in radians) that match where the table appears in the 360° view. Optionally set `radius` and `label`.
4. When you have real 360 videos with visible table numbers, update hotspots’ pitch/yaw to match. The UI will show green/gold/gray markers and table info on hover/click.

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For contributions or questions, please contact the project maintainers.

## 📞 Support

For support or inquiries, please reach out through the appropriate channels.

---

**Tagline**: *"Choisissez votre table. Vivez l'instant."* (Choose your table. Live the moment.)
