'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Send, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import {
  chatSOSConseil,
  type SOSConseilChatApiMessage,
  type SOSConseilChatSuccessData,
} from '@/lib/api/sos-conseil';
import type { SOSAssistantExtracted } from '@/lib/sos-conseil-mapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type SOSConseilAssistantProps = {
  /** Sérialiser l’état formulaire pour l’assistant (sans secrets). */
  getCurrentFormSnapshot: () => Record<string, unknown>;
  /** À chaque tour assistant réussi (autofill + progression + tracking). */
  onAssistantReply?: (payload: SOSConseilChatSuccessData & { extractedData: SOSAssistantExtracted }) => void;
  className?: string;
};

const QUICK_PROMPTS = [
  'Anniversaire pour 20 personnes',
  'Dîner romantique',
  'Sortie entre amis',
  'Événement professionnel',
  'Restaurant avec vue mer',
  'Café calme pour famille',
];

export function SOSConseilAssistant({
  getCurrentFormSnapshot,
  onAssistantReply,
  className,
}: SOSConseilAssistantProps) {
  const [messages, setMessages] = useState<SOSConseilChatApiMessage[]>([
    {
      role: 'assistant',
      content:
        'Bienvenue chez Assistant SOS Conseil. Décrivez votre besoin et je complète votre demande en direct.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestMissing, setLatestMissing] = useState<string[]>([]);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const sendWithUserContent = async (userTextRaw: string) => {
    const userText = userTextRaw.trim();
    if (!userText || pending) return;

    setError(null);
    const turn: SOSConseilChatApiMessage = { role: 'user', content: userText };
    const upcoming = [...messages, turn];

    setMessages(upcoming);
    setDraft('');
    setPending(true);

    try {
      const res = await chatSOSConseil({
        messages: [...upcoming],
        currentFormData: getCurrentFormSnapshot(),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: res.assistantMessage }]);
      setLatestMissing(res.missingFields ?? []);
      onAssistantReply?.(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Une erreur est survenue';
      setError(msg);
      toast.error('Assistant momentanément indisponible', { description: msg });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card
      className={cn(
        'border-amber-400/30 bg-gradient-to-b from-zinc-950 to-black shadow-xl shadow-black/50 overflow-hidden flex flex-col rounded-2xl',
        className
      )}
    >
      <CardHeader className="pb-3 border-b border-amber-400/20 bg-zinc-950/95 space-y-1">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 border border-amber-400/40 shadow-inner">
            <Sparkles className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-amber-200 tracking-tight">Assistant SOS Conseil</h2>
            <p className="text-sm text-zinc-400 leading-snug">
              Je vous aide à trouver le lieu idéal selon votre besoin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={pending}
              onClick={() => void sendWithUserContent(p)}
              className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300 hover:bg-amber-400/10 hover:border-amber-400/30 hover:text-amber-200 transition-colors disabled:opacity-40"
            >
              {p}
            </button>
          ))}
        </div>
        {latestMissing.length > 0 ? (
          <div className="mt-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            Champs à compléter: {latestMissing.join(', ')}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1 min-h-[280px] max-h-[min(520px,70vh)] min-h-0 p-0 flex flex-col bg-zinc-950/90">
        {error ? (
          <div className="mx-4 mt-4 flex gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        <div
          ref={listRef}
          className={cn(
            'flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4 space-y-3',
            messages.length === 0 && !pending && 'flex flex-col justify-center items-center gap-4'
          )}
        >
          {messages.length === 0 && !pending ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700/80 bg-zinc-900/60">
                <MessageSquare className="h-7 w-7 text-zinc-500" />
              </div>
              <div className="text-center max-w-[260px]">
                <p className="text-sm font-medium text-zinc-400">Posez votre première question</p>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Parlez librement — français, arabe ou tunisien, anglais aussi.
                </p>
              </div>
            </>
          ) : null}

          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={cn(
                'flex max-w-[92%]',
                m.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
              )}
            >
              <div
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-lg',
                  m.role === 'user'
                    ? 'rounded-br-md bg-gradient-to-br from-amber-400 to-yellow-600 text-black border border-amber-300/40'
                    : 'rounded-bl-md border border-zinc-700 bg-zinc-900 text-zinc-100'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          ))}

          {pending ? (
            <div className="flex items-center gap-2 text-xs text-amber-200/70">
              <Loader2 className="size-4 animate-spin shrink-0" />
              <span>L’assistant réfléchit...</span>
            </div>
          ) : null}

          <div ref={scrollEndRef} />
        </div>

        {/* Bottom composer */}
        <div className="mt-auto border-t border-amber-400/20 bg-zinc-950 p-4 pt-4">
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Votre message…"
              disabled={pending}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendWithUserContent(draft);
                }
              }}
              className="resize-none bg-zinc-900/85 border-zinc-700 focus-visible:ring-amber-400/35 text-[15px] text-zinc-100 placeholder:text-zinc-500"
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => void sendWithUserContent(draft)}
                disabled={pending || !draft.trim()}
                className="w-full flex-1 h-11 bg-amber-400 text-black font-semibold hover:bg-amber-300"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                  </>
                ) : (
                  <>
                    Envoyer <Send className="ml-2 size-4 opacity-95" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
