import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '../ui/popover';
import { useUIStore } from '../../store/uiStore';
import { searchAPI, type SearchResults } from '../../services/api';
import { cn } from '../ui/utils';

const isMac = typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().indexOf('MAC') >= 0;
const shortcutLabel = isMac ? '⌘ K' : 'Ctrl K';
const DEBOUNCE_MS = 400;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface SearchBarProps {
  className?: string;
  onNavigate?: () => void;
  compact?: boolean;
}

export function SearchBar({ className, onNavigate, compact = false }: SearchBarProps) {
  const navigate = useNavigate();
  const { globalSearchQuery, setGlobalSearchQuery, recentSearches, addRecentSearch } = useUIStore();
  const [value, setValue] = useState(globalSearchQuery);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQ = useDebouncedValue(value.trim(), DEBOUNCE_MS);

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => searchAPI.search(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 60 * 1000,
  });

  const results: SearchResults = useMemo(
    () =>
      searchData ?? {
        lieux: [],
        chambres: [],
        evenements: [],
      },
    [searchData]
  );

  useEffect(() => {
    setValue(globalSearchQuery);
  }, [globalSearchQuery]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) {
      setGlobalSearchQuery(q);
      addRecentSearch(q);
      navigate(`/explorer?q=${encodeURIComponent(q)}`);
      setOpen(false);
      onNavigate?.();
    }
  };

  const handleClear = () => {
    setValue('');
    setGlobalSearchQuery('');
    inputRef.current?.focus();
  };

  const goToVenue = (venueId: string) => {
    addRecentSearch(value.trim());
    navigate(`/lieu/${venueId}`);
    setOpen(false);
    onNavigate?.();
  };

  const goToExplorer = (q: string) => {
    setGlobalSearchQuery(q);
    addRecentSearch(q);
    navigate(`/explorer?q=${encodeURIComponent(q)}`);
    setOpen(false);
    onNavigate?.();
  };

  const hasResults =
    results.lieux.length > 0 || results.chambres.length > 0 || results.evenements.length > 0;
  const showRecent = !value.trim() || (value.trim().length < 2 && recentSearches.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <form onSubmit={handleSubmit} className={cn('flex-1 max-w-[min(100%,640px)]', className)}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-landing-text-muted pointer-events-none" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Rechercher un lieu, un événement…"
              className={cn(
                'w-full rounded-lg border bg-landing-card text-landing-text placeholder-landing-text-muted/70 transition-[box-shadow,border-color]',
                'pl-10 pr-20 py-2.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-landing-gold/50 focus:border-landing-gold/50 focus:ring-offset-2 focus:ring-offset-landing-bg',
                compact && 'py-2 pr-16'
              )}
              aria-label="Rechercher un lieu ou un événement"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls="search-suggestions"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded text-landing-text-muted hover:text-landing-text hover:bg-landing-bg/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-landing-gold"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex h-6 items-center gap-0.5 rounded border border-landing-border bg-landing-bg/80 px-1.5 text-[10px] font-medium text-landing-text-muted">
                {shortcutLabel}
              </kbd>
            </div>
          </div>
        </PopoverAnchor>
      </form>
      <PopoverContent
        id="search-suggestions"
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] max-h-[min(70vh,400px)] overflow-auto rounded-xl border-landing-border bg-landing-card p-0 shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {value.trim().length >= 2 && (
          <>
            {isFetching && (
              <div className="p-3 text-sm text-landing-text-muted">Recherche…</div>
            )}
            {!isFetching && hasResults && (
              <>
                {results.lieux.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-landing-text-muted">
                      Lieux
                    </p>
                    <ul className="space-y-0.5" role="listbox">
                      {results.lieux.map((v) => (
                        <li key={v._id}>
                          <button
                            type="button"
                            onClick={() => goToVenue(v._id)}
                            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-landing-text hover:bg-landing-gold/10 hover:text-landing-gold focus:outline-none"
                            role="option"
                          >
                            <span className="font-medium">{v.name}</span>
                            <span className="ml-2 text-landing-text-muted">{v.city}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.chambres.length > 0 && (
                  <div className="border-t border-landing-border p-2">
                    <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-landing-text-muted">
                      Chambres
                    </p>
                    <ul className="space-y-0.5" role="listbox">
                      {results.chambres.map((r) => (
                        <li key={r._id}>
                          <button
                            type="button"
                            onClick={() => r.venueId && goToVenue(r.venueId)}
                            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-landing-text hover:bg-landing-gold/10 hover:text-landing-gold focus:outline-none"
                            role="option"
                          >
                            <span className="font-medium">{r.venueName} — Chambre {r.roomNumber}</span>
                            <span className="ml-2 text-landing-text-muted">{r.city}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.evenements.length > 0 && (
                  <div className="border-t border-landing-border p-2">
                    <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-landing-text-muted">
                      Événements
                    </p>
                    <ul className="space-y-0.5" role="listbox">
                      {results.evenements.map((e) => (
                        <li key={e._id}>
                          <button
                            type="button"
                            onClick={() => e.venueId && goToVenue(e.venueId)}
                            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-landing-text hover:bg-landing-gold/10 hover:text-landing-gold focus:outline-none"
                            role="option"
                          >
                            <span className="font-medium">{e.title}</span>
                            <span className="ml-2 text-landing-text-muted">{e.venueName}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {!isFetching && value.trim().length >= 2 && !hasResults && (
              <div className="p-3 text-sm text-landing-text-muted">Aucun résultat.</div>
            )}
          </>
        )}
        {showRecent && recentSearches.length > 0 && (
          <div className="border-t border-landing-border p-2">
            <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-landing-text-muted">
              Recherches récentes
            </p>
            <ul className="space-y-0.5" role="listbox">
              {recentSearches.slice(0, 5).map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => goToExplorer(q)}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-landing-text hover:bg-landing-gold/10 hover:text-landing-gold focus:outline-none"
                    role="option"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
