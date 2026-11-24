'use client';

/**
 * Exploria360 motion primitives (framer-motion).
 * House style (Apple-like): critically damped springs — no overshoot — for UI; transform/opacity only;
 * every animation respects prefers-reduced-motion through <MotionConfig reducedMotion="user">.
 */
import { MotionConfig, motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

export const SPRING = { type: 'spring' as const, bounce: 0, duration: 0.55 };
export const SPRING_FAST = { type: 'spring' as const, bounce: 0, duration: 0.32 };

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={SPRING}>{children}</MotionConfig>;
}

/** Reveals its children once when they scroll into view (small rise + fade). */
export function Reveal({ children, delay = 0, y = 18, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'section' | 'li' }) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ ...SPRING, delay }}
    >
      {children}
    </Comp>
  );
}

/** Staggered children (e.g. card grids). Use <StaggerItem> inside. */
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: SPRING } };

export function Stagger({ children, className, as = 'ul' }: { children: ReactNode; className?: string; as?: 'ul' | 'div' | 'ol' }) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.li className={className} variants={item}>{children}</motion.li>;
}
