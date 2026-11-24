'use client';

import { motion } from 'framer-motion';

/**
 * Public page transition: a short opacity cross-fade on navigation.
 * Opacity only — a transform here would become the containing block of position:fixed children
 * (mobile booking bar, sheets) and break them.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
