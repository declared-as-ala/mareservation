import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  imageUrl: string | null;
  imageAlt?: string;
  badges?: React.ReactNode;
  metaRight?: React.ReactNode;
  className?: string;
}

export function DetailHeader({
  title,
  subtitle,
  imageUrl,
  imageAlt = '',
  badges,
  metaRight,
  className,
}: DetailHeaderProps) {
  return (
    <header className={cn('relative h-[52vh] min-h-[340px] max-h-[560px] w-full overflow-hidden bg-zinc-900', className)}>
      {imageUrl ? (
        <Image src={imageUrl} alt={imageAlt} fill className="object-cover" sizes="100vw" priority />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
          <span className="text-8xl font-bold text-zinc-700 select-none">{title.slice(0, 1)}</span>
        </div>
      )}
      {/* Multi-layer gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
      {/* Content pinned to bottom */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-24 md:px-10">
        <div className="mx-auto max-w-7xl">
          {badges && (
            <div className="flex flex-wrap items-center gap-2 mb-3">{badges}</div>
          )}
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-xl md:text-4xl lg:text-5xl leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1.5 text-sm text-white/70 md:text-base">{subtitle}</p>
              )}
            </div>
            {metaRight && (
              <div className="shrink-0 text-right text-white drop-shadow">{metaRight}</div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
