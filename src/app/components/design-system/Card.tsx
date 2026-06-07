import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = '', glow }: CardProps) {
  const glowStyle = glow
    ? { boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(201,162,39,0.15)' }
    : undefined;
  return (
    <div
      className={`rounded-xl border border-landing-border bg-landing-card ${className}`}
      style={glowStyle}
    >
      {children}
    </div>
  );
}
