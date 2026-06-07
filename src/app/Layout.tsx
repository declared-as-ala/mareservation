import { Outlet } from 'react-router';
import { Navbar } from './components/navbar';
import { Footer } from './components/landing/Footer';
import { AuthRequiredModal } from './components/AuthRequiredModal';

export function Layout() {
  return (
    <div className="min-h-screen bg-landing-bg text-landing-text">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <AuthRequiredModal />
    </div>
  );
}
