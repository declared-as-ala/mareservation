'use client';

import { useState } from 'react';
import { apiGetRaw, apiPatchRaw } from '@/lib/api/client';

export default function OwnerScannerPage() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  async function onVerify() {
    setMessage('');
    try {
      const scan = await apiGetRaw<{ data?: { _id: string } }>(`/reservations/scan?code=${encodeURIComponent(code)}`);
      const reservationId = scan?.data?._id;
      if (!reservationId) {
        setMessage('Reservation introuvable.');
        return;
      }
      await apiPatchRaw(`/owner/reservations/${reservationId}/verify-qr`, {});
      setMessage('QR verifie avec succes.');
    } catch {
      setMessage('Echec verification QR.');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-10 text-zinc-100">
      <h1 className="text-2xl font-semibold">Scanner proprietaire</h1>
      <p className="text-sm text-zinc-400">Validation QR reservee au proprietaire du lieu.</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
        placeholder="Code de reservation"
      />
      <button onClick={onVerify} className="rounded-md bg-amber-500 px-4 py-2 font-medium text-black">
        Verifier
      </button>
      {message && <p className="text-sm text-zinc-300">{message}</p>}
    </div>
  );
}
