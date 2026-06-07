'use client';

import { Suspense } from 'react';
import HotelCheckoutClient from './HotelCheckoutClient';

export default function HotelCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808]" />}>
      <HotelCheckoutClient />
    </Suspense>
  );
}
