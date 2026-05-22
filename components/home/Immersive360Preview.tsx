'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableMarker {
  id: string;
  name: string;
  capacity: number;
  price: number;
  status: 'available' | 'reserved';
  position: { x: string; y: string };
}

const MARKERS: TableMarker[] = [
  { id: '1', name: 'Table 1', capacity: 4, price: 120, status: 'available', position: { x: '24%', y: '38%' } },
  { id: '2', name: 'Table 4', capacity: 2, price: 80, status: 'available', position: { x: '66%', y: '48%' } },
  { id: '3', name: 'Table 7', capacity: 6, price: 150, status: 'reserved', position: { x: '46%', y: '64%' } },
  { id: '4', name: 'Table 9', capacity: 2, price: 75, status: 'available', position: { x: '78%', y: '28%' } },
];

function TableTooltip({ marker, visible }: { marker: TableMarker; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2"
        >
          <div className="whitespace-nowrap rounded-xl border border-amber-400/30 bg-black/95 px-3.5 py-2 shadow-2xl backdrop-blur-md">
            <div className="mb-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-amber-400">
              <MapPin className="size-3.5" />
              {marker.name}
            </div>
            <div className="text-[11px] text-white/70">
              {marker.capacity} pers ·{' '}
              <span className="font-semibold text-amber-400">{marker.price} DT</span>
            </div>
          </div>
          <div className="absolute left-1/2 top-full -mt-px -translate-x-1/2">
            <div className="size-2 rotate-45 border-b border-r border-amber-400/30 bg-black/95" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MarkerDot({ marker, index }: { marker: TableMarker; index: number }) {
  const [hovered, setHovered] = React.useState(false);
  const available = marker.status === 'available';
  const rgb = available ? '74, 222, 128' : '248, 113, 113';

  return (
    <motion.div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: marker.position.x, top: marker.position.y }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5 + index * 0.12, duration: 0.4 }}
    >
      <TableTooltip marker={marker} visible={hovered} />
      <motion.div className="relative cursor-pointer" whileHover={{ scale: 1.25 }} transition={{ duration: 0.2 }}>
        <motion.div
          className={cn('relative z-10 size-3.5 rounded-full', available ? 'bg-green-400' : 'bg-red-400')}
          animate={{
            boxShadow: [
              `0 0 0 0 rgba(${rgb}, 0.7)`,
              `0 0 0 9px rgba(${rgb}, 0)`,
              `0 0 0 0 rgba(${rgb}, 0)`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className={cn('absolute inset-0 rounded-full', available ? 'bg-green-400/30' : 'bg-red-400/30')}
          animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.div>
    </motion.div>
  );
}

/**
 * Visual showpiece for the hero — a faux live 360° immersive viewer
 * with clickable table markers. Conveys the app's core concept:
 * explore a venue in 360° → pick your table → reserve.
 */
export function Immersive360Preview() {
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  React.useEffect(() => {
    const show = setTimeout(() => {
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3200);
    }, 2400);
    return () => clearTimeout(show);
  }, []);

  return (
    <motion.div
      className="relative h-full w-full"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Ambient gold glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.12] blur-[120px]"
      />

      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-amber-400/15 bg-[#0B0B0C] shadow-2xl">
        {/* Venue interior */}
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop"
          alt="Intérieur de restaurant en vue 360°"
          className="size-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-amber-400/[0.06] via-transparent to-transparent" />

        {/* Table markers */}
        {MARKERS.map((m, i) => (
          <MarkerDot key={m.id} marker={m} index={i} />
        ))}

        {/* 360° badge */}
        <motion.div
          className="absolute right-4 top-4 z-40"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <motion.div
            className="flex items-center gap-2 rounded-full bg-amber-400 px-3.5 py-1.5 text-[13px] font-bold text-black"
            animate={{
              boxShadow: [
                '0 0 18px rgba(251,191,36,0.45)',
                '0 0 28px rgba(251,191,36,0.65)',
                '0 0 18px rgba(251,191,36,0.45)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}>
              <RotateCw className="size-3.5" />
            </motion.div>
            360°
          </motion.div>
        </motion.div>

        {/* Status legend */}
        <motion.div
          className="absolute left-4 top-4 z-40 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex items-center gap-2 text-[11px] font-medium text-white/80">
            <span className="size-2 rounded-full bg-green-400" /> Disponible
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-white/80">
            <span className="size-2 rounded-full bg-red-400" /> Réservée
          </div>
        </motion.div>

        {/* Drag hint */}
        <motion.div
          className="absolute bottom-5 left-1/2 z-40 -translate-x-1/2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <div className="flex items-center gap-2.5 rounded-full border border-amber-400/25 bg-black/75 px-5 py-2.5 shadow-xl backdrop-blur-md">
            <motion.div
              animate={{ rotate: [0, 18, -18, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <RotateCw className="size-4 text-amber-400" />
            </motion.div>
            <span className="text-[13px] font-medium text-white/90">Glissez pour explorer</span>
          </div>
        </motion.div>

        {/* Reservation confirmation chip */}
        <AnimatePresence>
          {showConfirmation && (
            <motion.div
              className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0.8, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-3 shadow-2xl">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring' }}
                  className="flex size-6 items-center justify-center rounded-full bg-white"
                >
                  <Check className="size-4 text-emerald-600" strokeWidth={3} />
                </motion.div>
                <span className="text-sm font-semibold text-white">Table réservée</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
