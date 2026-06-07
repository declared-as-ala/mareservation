import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Impossible de charger les données. Veuillez réessayer.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-12 text-center',
        className
      )}
    >
      <AlertCircle className="size-12 text-red-400 mb-4" />
      <h3 className="font-semibold text-zinc-200">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-500 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-6 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={onRetry}
        >
          Réessayer
        </Button>
      )}
    </div>
  );
}
