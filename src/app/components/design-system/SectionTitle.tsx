import { type ReactNode } from 'react';

interface SectionTitleProps {
  children: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

export function SectionTitle({ children, subtitle, className = '' }: SectionTitleProps) {
  return (
    <div className={`mb-8 md:mb-12 ${className}`}>
      <h2
        className="text-landing-text text-xl md:text-2xl font-semibold"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {children}
      </h2>
      {subtitle && (
        <p className="mt-2 text-landing-text-muted text-sm md:text-base max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
