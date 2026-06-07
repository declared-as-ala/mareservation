import { type ReactNode } from 'react';

type Variant = 'gold' | 'success' | 'muted' | 'event';

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  gold: 'bg-landing-gold/20 text-landing-gold border border-landing-gold/40',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  muted: 'bg-landing-text-muted/20 text-landing-text-muted border border-landing-border',
  event: 'bg-landing-gold text-[#161616] border-0',
};

export function Badge({ children, variant = 'gold', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
