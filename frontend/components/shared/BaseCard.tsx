import * as React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface BaseCardProps extends React.ComponentProps<'div'> {
  hoverable?: boolean;
  children?: React.ReactNode;
}

export const BaseCard = React.forwardRef<HTMLDivElement, BaseCardProps>(
  ({ className, hoverable = true, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          'rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm',
          hoverable &&
            'transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-lg',
          className
        )}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

BaseCard.displayName = 'BaseCard';
