'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Send, Loader2, AlertCircle, Lightbulb, X } from 'lucide-react';
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
  /** When provided, a close button is shown (used by the mobile bubble overlay). */
  onClose?: () => void;
  className?: string;
};

const QUICK_PROMPTS = [
  'Anniversaire pour 20 personnes',
  'Dîner romantique vue mer',
  'Sortie entre amis à Tunis',
  'Événement professionnel',
  'Café calme pour famille',
];

/**
 * Contextual nudges — when the assistant still needs something, we surface a
 * one-tap sentence that targets that exact gap. Makes the bot feel proactive.
 */
const FIELD_NUDGES: { match: RegExp; suggestion: string }[] = [
  { match: /nom|name/i, suggestion: 'Je m’appelle…' },
  { match: /phone|tél|telephone|numéro/i, suggestion: 'Mon numéro est…' },
  { match: /occasion|événement|evenement|type/i, suggestion: 'C’est pour un anniversaire' },
  { match: /participant|personne|nombre/i, suggestion: 'Nous serons 20 personnes' },
  { match: /age|âge|tranche/i, suggestion: 'Plutôt 25–35 ans' },
  { match: /region|région|ville|lieu géo/i, suggestion: 'À Tunis' },
  { match: /categor|lieu|type de lieu/i, suggestion: 'Un restaurant' },
  { match: /budget/i, suggestion: 'Budget autour de 500 TND' },
  { match: /ambiance|vibe/i, suggestion: 'Ambiance chic et calme' },
  { match: /date|jour/i, suggestion: 'Samedi prochain' },
];

function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      <span className="size-1.5 animate-bounce rounded-full bg-amber-300 [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-amber-300 [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-amber-300" />
    </span>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center self-end rounded-full border border-amber-400/40 bg-amber-400/15">
      <Sparkles className="size-3.5 text-amber-300" />
    </div>
  );
}

export function SOSConseilAssistant({
  getCurrentFormSnapshot,
  onAssistantReply,
  onClose,
  className,
}: SOSConseilAssistantProps) {
  const [messages, setMessages] = useState<SOSConseilChatApiMessage[]>([
    {
      role: 'assistant',
      content:
        'Bonjour 👋 Je suis votre concierge SOS Conseil. Décrivez votre événement en une phrase — je complète votre demande au fur et à mesure.',
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

  // Smart, context-aware suggestion chips shown above the composer.
  const smartSuggestions = useMemo(() => {
    if (latestMissing.length > 0) {
      const nudges = latestMissing
        .map((field) => FIELD_NUDGES.find((n) => n.match.test(field))?.suggestion)
        .filter((v): v is string => Boolean(v));
      if (nudges.length > 0) return Array.from(new Set(nudges)).slice(0, 4);
    }
    // Early in the conversation, offer starter ideas.
    if (messages.filter((m) => m.role === 'user').length === 0) return QUICK_PROMPTS.slice(0, 4);
    return [];
  }, [latestMissing, messages]);

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
        'flex flex-col overflow-hidden rounded-3xl border-amber-400/25 bg-gradient-to-b from-zinc-950 to-black shadow-2xl shadow-black/50',
        className
      )}
    >
      {/* Header */}
      <CardHeader className="space-y-3 border-b border-amber-400/15 bg-zinc-950/95 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-400/15 shadow-inner">
            <Sparkles className="size-6 text-amber-300" />
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-zinc-950 bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-amber-200 sm:text-lg">
              Assistant SOS Conseil
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              En ligne · répond en quelques secondes
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer l’assistant"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {latestMissing.length > 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
            <span>Il me manque encore : {latestMissing.join(', ')}</span>
          </div>
        ) : null}
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex min-h-0 flex-1 flex-col bg-zinc-950/90 p-0">
        {error ? (
          <div className="mx-4 mt-4 flex gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={cn('flex items-end gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && <AssistantAvatar />}
              <div
                className={cn(
                  'max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-lg sm:max-w-[80%]',
                  m.role === 'user'
                    ? 'rounded-br-md border border-amber-300/40 bg-gradient-to-br from-amber-400 to-yellow-600 text-black'
                    : 'rounded-bl-md border border-zinc-700/80 bg-zinc-900 text-zinc-100'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          ))}

          {pending ? (
            <div className="flex items-end gap-2">
              <AssistantAvatar />
              <div className="rounded-2xl rounded-bl-md border border-zinc-700/80 bg-zinc-900 px-4 py-3">
                <TypingDots />
              </div>
            </div>
          ) : null}

          <div ref={scrollEndRef} />
        </div>

        {/* Smart suggestions */}
        {smartSuggestions.length > 0 && !pending ? (
          <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-zinc-800/80 bg-zinc-950 px-3 py-2.5 sm:px-4">
            {smartSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void sendWithUserContent(s)}
                className="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:border-amber-400/50 hover:bg-amber-400/15"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {/* Composer */}
        <div className="border-t border-amber-400/15 bg-zinc-950 p-3 sm:p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/85 p-2 focus-within:border-amber-400/40">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Décrivez votre besoin…"
              disabled={pending}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendWithUserContent(draft);
                }
              }}
              className="max-h-32 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
            />
            <Button
              type="button"
              onClick={() => void sendWithUserContent(draft)}
              disabled={pending || !draft.trim()}
              aria-label="Envoyer"
              className="size-10 shrink-0 rounded-xl bg-amber-400 p-0 text-black hover:bg-amber-300 disabled:opacity-40"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-zinc-600">
            Parlez librement — français, arabe, tunisien ou anglais. Entrée pour envoyer.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
