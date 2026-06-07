'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Crown, Plus, Ticket, Trash2 } from 'lucide-react';
import { ticketRemaining } from '@/lib/events/availability';

export type TicketDraft = {
  _id?: string;
  name: string;
  price: number;
  capacity: number;
  sold?: number;
  salesStartAt?: string;
  salesEndAt?: string;
  maxPerOrder?: number;
  isActive?: boolean;
};

type Props = {
  value: TicketDraft[];
  onChange: (next: TicketDraft[]) => void;
  currency?: string;
};

const DEFAULT_TICKET: TicketDraft = {
  name: 'Standard',
  price: 30,
  capacity: 500,
  sold: 0,
  maxPerOrder: 10,
  isActive: true,
};

function updateTicket(tickets: TicketDraft[], index: number, patch: Partial<TicketDraft>): TicketDraft[] {
  return tickets.map((t, i) => (i === index ? { ...t, ...patch } : t));
}

function removeTicket(tickets: TicketDraft[], index: number): TicketDraft[] {
  return tickets.length <= 1 ? tickets : tickets.filter((_, i) => i !== index);
}

export function TicketTypesEditor({ value, onChange, currency = 'TND' }: Props) {
  const totalCapacity = value.reduce((s, t) => s + Number(t.capacity || 0), 0);
  const totalSold = value.reduce((s, t) => s + Number(t.sold || 0), 0);
  const revenue = value.reduce((s, t) => s + Number(t.sold || 0) * Number(t.price || 0), 0);
  const potential = value.reduce((s, t) => s + Number(t.capacity || 0) * Number(t.price || 0), 0);

  return (
    <div className="space-y-4">
      {value.map((ticket, index) => {
        const remaining = ticketRemaining(ticket);
        const hasSold = Number(ticket.sold || 0) > 0;
        return (
          <div
            key={`${ticket._id || 'ticket'}-${index}`}
            className="rounded-2xl border border-zinc-800 bg-black/70 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="grid size-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
                  {ticket.name.toLowerCase().includes('vip') ? (
                    <Crown className="size-4" />
                  ) : (
                    <Ticket className="size-4" />
                  )}
                </div>
                <div>
                  <Input
                    className="h-9 rounded-xl border-zinc-800 bg-zinc-950 text-sm font-bold text-zinc-100"
                    value={ticket.name}
                    onChange={(e) => onChange(updateTicket(value, index, { name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-zinc-500">Actif</Label>
                  <Switch
                    checked={ticket.isActive !== false}
                    onCheckedChange={(v) => onChange(updateTicket(value, index, { isActive: v }))}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Supprimer ce type de billet"
                  className="grid size-10 place-items-center rounded-xl border border-zinc-800 text-zinc-500 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
                  disabled={value.length <= 1}
                  onClick={() => onChange(removeTicket(value, index))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Prix ({currency})</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-9 rounded-xl border-zinc-800 bg-zinc-950 text-sm text-zinc-100"
                  value={ticket.price}
                  onChange={(e) => onChange(updateTicket(value, index, { price: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Quantité</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-9 rounded-xl border-zinc-800 bg-zinc-950 text-sm text-zinc-100"
                  value={ticket.capacity}
                  onChange={(e) => onChange(updateTicket(value, index, { capacity: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Max / commande</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="h-9 rounded-xl border-zinc-800 bg-zinc-950 text-sm text-zinc-100"
                  value={ticket.maxPerOrder ?? 10}
                  onChange={(e) => onChange(updateTicket(value, index, { maxPerOrder: Number(e.target.value || 1) }))}
                />
              </div>
              {hasSold && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Vendues</Label>
                  <div className="flex h-9 items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-400">
                    {ticket.sold || 0}
                  </div>
                </div>
              )}
              {remaining === 0 && hasSold && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Restantes</Label>
                  <div className="flex h-9 items-center rounded-xl border border-red-800/60 bg-red-950/30 px-3 text-sm font-bold text-red-400">
                    Épuisé
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Début vente</Label>
                <Input
                  type="datetime-local"
                  className="h-9 rounded-xl border-zinc-800 bg-zinc-950 text-sm text-zinc-100"
                  value={ticket.salesStartAt || ''}
                  onChange={(e) => onChange(updateTicket(value, index, { salesStartAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Fin vente</Label>
                <Input
                  type="datetime-local"
                  className="h-9 rounded-xl border-zinc-800 bg-zinc-950 text-sm text-zinc-100"
                  value={ticket.salesEndAt || ''}
                  onChange={(e) => onChange(updateTicket(value, index, { salesEndAt: e.target.value }))}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-xs">
        <span className="text-zinc-400">
          Capacité totale : <strong className="text-zinc-200">{totalCapacity}</strong>
        </span>
        <span className="text-zinc-400">
          Vendues : <strong className="text-zinc-200">{totalSold}</strong>
        </span>
        <span className="text-zinc-400">
          Revenu estimé : <strong className="text-amber-300">{revenue} {currency}</strong>
        </span>
        <span className="hidden text-zinc-500 sm:block">
          Potentiel : {potential} {currency}
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full border-zinc-700 text-zinc-200"
        onClick={() => onChange([...value, { ...DEFAULT_TICKET }])}
      >
        <Plus className="mr-2 size-4" />
        Ajouter une catégorie
      </Button>
    </div>
  );
}
