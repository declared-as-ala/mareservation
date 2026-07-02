'use client';

import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#08080a] px-6 py-16 text-center text-neutral-100">
      {/* Page Title for SEO and Browser Tab */}
      <title>Exploria360 — Site en préparation</title>
      
      {/* Ambient glowing background circles */}
      <div 
        aria-hidden 
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/[0.08] blur-[150px]" 
      />
      <div 
        aria-hidden 
        className="pointer-events-none absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-amber-600/[0.04] blur-[130px]" 
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        {/* Animated Wordmark */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center leading-none"
        >
          <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text font-serif text-3xl font-black uppercase tracking-[0.22em] text-transparent drop-shadow-[0_1px_14px_rgba(212,175,55,0.3)] sm:text-4xl">
            Exploria&nbsp;<span className="text-amber-400">360</span>
          </span>
          <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400 sm:text-[11px]">
            Explorez l&apos;instant, <span className="text-amber-300/85">Réservez l&apos;expérience</span>
          </span>
        </motion.div>

        {/* Animated Badge */}
        <motion.span 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-12 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-4 py-1.5 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">En construction</span>
        </motion.span>

        {/* Animated Heading */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-6 font-serif text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl"
        >
          Notre site est en{' '}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              cours de préparation
            </span>
          </span>
        </motion.h1>

        {/* Animated Paragraph */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-6 max-w-md text-sm leading-relaxed text-neutral-400 sm:text-base"
        >
          Nous construisons une expérience de réservation{' '}
          <strong className="font-semibold text-neutral-200">immersive en 360°</strong> — 
          cafés, restaurants, hôtels &amp; sorties. Revenez très bientôt&nbsp;!
        </motion.p>

        {/* Custom Progress bar */}
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '100%', opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.06]"
        >
          <div className="h-full w-1/2 animate-[maint-slide_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0" />
        </motion.div>

        {/* Contact info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-12 flex flex-col items-center gap-2"
        >
          <p className="text-xs text-neutral-500">
            Une question ou un partenariat&nbsp;?
          </p>
          <a 
            href="mailto:contact@exploria360.com" 
            className="group flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-amber-300 transition-all hover:border-amber-300/40 hover:bg-amber-300/[0.05] hover:text-amber-200"
          >
            <Mail className="size-3.5 transition-transform group-hover:scale-110" />
            contact@exploria360.com
          </a>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="mt-12 text-[11px] text-neutral-600"
        >
          © {new Date().getFullYear()} Exploria 360 — Book your moment
        </motion.p>
      </div>

      {/* Slide keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes maint-slide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}`,
        }}
      />
    </main>
  );
}
