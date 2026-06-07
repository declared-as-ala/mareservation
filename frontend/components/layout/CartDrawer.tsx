'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCartStore, type CartItem } from '@/stores/cart';
import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CartLine({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [now, setNow] = useState(Date.now());
  const holdSecondsLeft = item.holdExpiresAt
    ? Math.max(0, Math.floor((new Date(item.holdExpiresAt).getTime() - now) / 1000))
    : null;

  useEffect(() => {
    if (!item.holdExpiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [item.holdExpiresAt]);

  return (
    <div className="group flex gap-3 py-4 border-b border-zinc-800 last:border-0">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="64px" />
        ) : (
          <div className="size-full flex items-center justify-center">
            <ShoppingBag className="size-5 text-zinc-600" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <p className="font-semibold text-zinc-100 text-sm leading-tight truncate pr-1">
            {item.title}
          </p>
          <button
            onClick={() => removeItem(item.id)}
            className="shrink-0 size-5 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-0.5"
            aria-label="Supprimer"
          >
            <X className="size-3" />
          </button>
        </div>

        <p className="text-amber-400 text-xs mb-1.5">{item.unitLabel}</p>

        <p className="flex items-center gap-1 text-zinc-500 text-xs mb-3">
          <Clock className="size-3" />
          {new Date(item.dateTime).toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        {holdSecondsLeft !== null && (
          <p className={cn('text-[11px] mb-3', holdSecondsLeft > 0 ? 'text-amber-300' : 'text-red-300')}>
            {holdSecondsLeft > 0
              ? `Maintien: ${Math.floor(holdSecondsLeft / 60).toString().padStart(2, '0')}:${String(holdSecondsLeft % 60).padStart(2, '0')}`
              : 'Maintien expire'}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0 rounded-lg border border-zinc-700 bg-zinc-800/60 overflow-hidden h-7">
            <button
              type="button"
              className="size-7 flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
              onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
              aria-label="Diminuer"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-7 text-center text-sm text-zinc-100 font-medium">
              {item.quantity}
            </span>
            <button
              type="button"
              className="size-7 flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              aria-label="Augmenter"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <span className="font-bold text-zinc-100 text-sm">
            {item.price * item.quantity}{' '}
            <span className="text-zinc-500 font-normal text-xs">TND</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  const totalAmount = useCartStore((s) => s.totalAmount());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md bg-zinc-950 border-zinc-800 p-0 gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-zinc-100 font-semibold">
              <ShoppingBag className="size-5 text-amber-400" />
              Mon panier
              {totalQuantity > 0 && (
                <span className="ml-1 size-5 rounded-full bg-amber-400 text-zinc-950 text-xs font-bold flex items-center justify-center">
                  {totalQuantity}
                </span>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Body */}
        <div
          className={cn(
            'flex-1 overflow-y-auto px-5',
            items.length === 0 && 'flex items-center justify-center'
          )}
        >
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto size-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <ShoppingBag className="size-7 text-zinc-600" />
              </div>
              <p className="text-zinc-200 font-medium mb-1">Votre panier est vide</p>
              <p className="text-zinc-500 text-sm">Ajoutez des reservations pour commencer.</p>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer with items */}
        {items.length > 0 && (
          <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Total</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-amber-400">{totalAmount}</span>
                <span className="text-zinc-500 text-sm ml-1">TND</span>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold h-12 gap-2 shadow-lg shadow-amber-400/20"
              onClick={() => onOpenChange(false)}
            >
              <Link href="/checkout">
                Passer au paiement
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
            >
              <Link href="/panier">Voir le panier complet</Link>
            </Button>
          </div>
        )}

        {items.length === 0 && (
          <div className="border-t border-zinc-800 px-5 py-4">
            <Button
              asChild
              variant="outline"
              className="w-full border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
            >
              <Link href="/explorer">Explorer les lieux</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
