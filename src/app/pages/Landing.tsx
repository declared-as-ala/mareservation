import { Hero } from '../components/landing/Hero';
import { Categories } from '../components/landing/Categories';
import { HowItWorks } from '../components/landing/HowItWorks';
import { SignupCards } from '../components/landing/SignupCards';
import { LandingEventsAndVenues } from '../components/landing/LandingEventsAndVenues';
import { WorldSection } from '../components/landing/WorldSection';

export function Landing() {
  return (
    <div className="landing">
      <Hero />
      <Categories />
      <HowItWorks />
      <SignupCards />
      <LandingEventsAndVenues />
      <WorldSection />
    </div>
  );
}
