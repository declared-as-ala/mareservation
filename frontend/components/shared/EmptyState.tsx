import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700/60 bg-zinc-900/40 px-6 py-14 text-center',
        className
      )}
    >
      {icon && <div className="mb-4 text-zinc-600 [&_svg]:size-12">{icon}</div>}
      <h3 className="font-semibold text-zinc-200">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-zinc-500 leading-relaxed">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
