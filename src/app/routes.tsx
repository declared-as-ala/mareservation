import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './Layout';
import { Landing } from './pages/Landing';
import { Explorer } from './pages/Explorer';
import { Restaurants } from './pages/Restaurants';
import { Cafes } from './pages/Cafes';
import { Events } from './pages/Events';
import { VenueDetails } from './pages/VenueDetails';
import { Reservation } from './pages/Reservation';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Landing },
      { path: 'explorer', Component: Explorer },
      { path: 'restaurants', Component: Restaurants },
      { path: 'cafes', Component: Cafes },
      { path: 'evenements', Component: Events },
      { path: 'lieu/:id', Component: VenueDetails },
      { path: 'reservation', Component: Reservation },
      { path: 'connexion', Component: Login },
      { path: 'login', Component: Login },
      { path: 'dashboard', Component: UserDashboard },
      { path: 'admin', Component: AdminDashboard },
      { path: 'proposer', Component: () => <Navigate to="/" replace /> },
      { path: '*', Component: NotFound },
    ],
  },
]);
