import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'facebook';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  asChild?: boolean;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-landing-gold text-[#161616] font-medium shadow-[0_4px_14px_rgba(201,162,39,0.35)] hover:bg-landing-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-transparent border border-landing-gold text-landing-text hover:bg-landing-gold/10 transition-colors',
  ghost:
    'bg-transparent text-landing-text hover:bg-white/5 transition-colors',
  facebook:
    'bg-[#2d3a4d] border border-landing-border/50 text-landing-text hover:bg-[#364153] transition-colors',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-landing-gold focus:ring-offset-2 focus:ring-offset-landing-bg';
  return (
    <button
      type={type}
      className={`${base} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
