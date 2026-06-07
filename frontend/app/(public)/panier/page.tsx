'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Users,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalAmount = useCartStore((s) => s.totalAmount());
  const totalQuantity = useCartStore((s) => s.totalQuantity());

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?returnTo=/checkout');
      return;
    }
    router.push('/checkout');
  };

  /* Empty state */
  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-zinc-950">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-6 size-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <ShoppingBag className="size-10 text-zinc-600" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-3">Votre panier est vide</h2>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            Explorez nos lieux et ajoutez des tables, chambres ou places à votre panier.
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold h-12 px-8 gap-2"
          >
            <Link href="/explorer">
              Explorer les lieux
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/explorer"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors text-sm mb-8 group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          Continuer mes réservations
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-1">Mon panier</h1>
          <p className="text-zinc-500 text-sm">
            {totalQuantity} article{totalQuantity > 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Items ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-amber-400/30 transition-all duration-200"
              >
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <ShoppingBag className="size-6 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-semibold text-zinc-100 leading-tight">{item.title}</h3>
                        <p className="text-amber-400/80 text-xs mt-0.5">{item.unitLabel}</p>
                      </div>
                      <span className="font-bold text-lg text-zinc-100 shrink-0">
                        {item.price * item.quantity}
                        <span className="text-zinc-500 font-normal text-sm ml-1">TND</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3 text-zinc-600" />
                        {new Date(item.dateTime).toLocaleString('fr-FR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-3">
                    {/* Quantity */}
                    <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800/60 overflow-hidden h-8">
                      <button
                        type="button"
                        className="size-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
                        onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        aria-label="Diminuer"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-8 text-center text-sm text-zinc-100 font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="size-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Augmenter"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Users className="size-3" />
                      {item.quantity} {item.quantity > 1 ? 'places' : 'place'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={
                        item.slug
                          ? `/explorer?venue=${item.slug}`
                          : item.venueId
                          ? `/explorer?venue=${item.venueId}`
                          : '/explorer'
                      }
                      className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
                    >
                      Voir le lieu →
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors py-1 px-2 rounded-lg hover:bg-red-400/10"
                    >
                      <Trash2 className="size-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Summary ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-6 sticky top-20">
              {/* Accent line */}
              <div className="h-px bg-gradient-to-r from-amber-400/60 via-amber-300/30 to-transparent mb-6 -mx-6 px-6" />

              <h2 className="font-semibold text-zinc-100 mb-5">Récapitulatif</h2>

              <div className="space-y-3 mb-5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                    <span className="text-zinc-500 truncate max-w-[160px]">
                      {item.title}
                      <span className="text-zinc-700 ml-1">· {item.unitLabel}</span>
                    </span>
                    <span className="text-zinc-300 font-medium shrink-0">
                      {item.price * item.quantity} TND
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="bg-zinc-800 mb-5" />

              <div className="flex items-end justify-between mb-7">
                <span className="text-zinc-300 font-semibold">Total</span>
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-400">{totalAmount}</p>
                  <p className="text-xs text-zinc-600">TND</p>
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full rounded-full h-12 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold gap-2 shadow-lg shadow-amber-400/20"
                onClick={handleCheckout}
              >
                Passer au paiement
                <ArrowRight className="size-4" />
              </Button>

              <p className="text-center text-xs text-zinc-600 mt-4">
                Confirmation instantanée · Paiement sécurisé
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
