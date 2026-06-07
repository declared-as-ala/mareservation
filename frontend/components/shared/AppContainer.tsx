import { cn } from '@/lib/utils';

interface AppContainerProps {
  children: React.ReactNode;
  className?: string;
  /** default: max-w-7xl */
  narrow?: boolean;
}

export function AppContainer({ children, className, narrow }: AppContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4',
        narrow ? 'max-w-6xl' : 'max-w-7xl',
        className
      )}
    >
      {children}
    </div>
  );
}
