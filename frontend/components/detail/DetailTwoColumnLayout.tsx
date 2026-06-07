import { cn } from '@/lib/utils';

interface DetailTwoColumnLayoutProps {
  children: React.ReactNode;
  /** Left column (booking card on desktop) */
  sidebar: React.ReactNode;
  className?: string;
}

export function DetailTwoColumnLayout({ children, sidebar, className }: DetailTwoColumnLayoutProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 md:py-8', className)}>
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <aside className="order-2 lg:order-1 lg:sticky lg:top-24 lg:self-start">
          {sidebar}
        </aside>
        <div className="order-1 min-w-0 lg:order-2">
          {children}
        </div>
      </div>
    </div>
  );
}
