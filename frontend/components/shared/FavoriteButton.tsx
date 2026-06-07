'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';
import { toggleFavorite, fetchFavoriteIds } from '@/lib/api/favorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  venueId: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function FavoriteButton({ venueId, className, size = 'md' }: FavoriteButtonProps) {
  const { user } = useAuthStore();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchFavoriteIds().then((ids) => {
      setFavorited(ids.includes(venueId));
    });
  }, [user, venueId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Connectez-vous pour ajouter aux favoris.');
      return;
    }
    setLoading(true);
    try {
      const result = await toggleFavorite(venueId);
      setFavorited(result.favorited);
      toast.success(result.favorited ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch {
      toast.error('Erreur, veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4';
  const btnSize = size === 'sm' ? 'size-7' : 'size-9';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={cn(
        btnSize,
        'rounded-full flex items-center justify-center transition-all duration-200',
        'bg-black/50 backdrop-blur-sm border border-white/20 shadow-sm',
        'hover:bg-black/70 hover:border-amber-400/40 hover:shadow-md',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        loading && 'animate-pulse',
        className
      )}
    >
      <Heart
        className={cn(
          iconSize,
          'transition-all duration-200',
          favorited
            ? 'fill-red-500 text-red-500 scale-110'
            : 'text-white/70'
        )}
      />
    </button>
  );
}
