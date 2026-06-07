interface LogoProps {
  className?: string;
  variant?: 'default' | 'light';
}

export function Logo({ className = "", variant = 'default' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.png"
        alt="Ma Reservation"
        className="h-8 w-auto shrink-0"
      />
      <span className={`text-2xl font-bold tracking-tight ${variant === 'light' ? 'text-[#FAF9F6]' : 'text-primary'}`}>
        Ma Reservation
      </span>
    </div>
  );
}
