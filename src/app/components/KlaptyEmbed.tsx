import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { getKlaptyEmbedUrl, KLAPTY_TUNNEL_PREFIX } from '../utils/klapty';

const IFRAME_STYLE: React.CSSProperties = {
  maxWidth: '100%',
  width: '100%',
  height: '430px',
};

type Props = {
  url: string | null | undefined;
  className?: string;
};

export function KlaptyEmbed({ url, className = '' }: Props) {
  const embedUrl = useMemo(() => {
    const u = getKlaptyEmbedUrl(url);
    if (!u) return null;
    if (!u.startsWith(KLAPTY_TUNNEL_PREFIX)) return null;
    return u;
  }, [url]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const linkToOpen = url || 'https://www.klapty.com';
  const logged = useRef(false);
  useEffect(() => {
    if (embedUrl && !logged.current) {
      console.log('[KlaptyEmbed] iframe src (tunnel URL only):', embedUrl);
      logged.current = true;
    }
  }, [embedUrl]);

  // Cross-origin iframes often don't fire onError; timeout fallback
  useEffect(() => {
    if (!embedUrl) return;
    const t = setTimeout(() => {
      setLoaded((prev) => {
        if (!prev) setFailed(true);
        return true;
      });
    }, 15000);
    return () => clearTimeout(t);
  }, [embedUrl]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setFailed(false);
  }, []);

  const handleError = useCallback(() => {
    setFailed(true);
    setLoaded(true);
  }, []);

  // Not a valid tunnel URL: NEVER set iframe src. Show error UI.
  if (embedUrl === null) {
    return (
      <div
        className={`rounded-xl border border-landing-border bg-landing-card flex flex-col items-center justify-center p-8 text-center ${className}`}
        style={{ minHeight: 430 }}
      >
        <p className="text-landing-text font-medium mb-1">Lien de visite 360° invalide</p>
        <p className="text-landing-text-muted mb-4 text-sm">
          Seuls les liens de type tunnel Klapty sont acceptés (https://www.klapty.com/tour/tunnel/...).
        </p>
        <a
          href={linkToOpen.startsWith('http') ? linkToOpen : 'https://www.klapty.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light"
        >
          <ExternalLink className="w-5 h-5" />
          Ouvrir sur Klapty
        </a>
      </div>
    );
  }

  // Iframe failed to load
  if (failed) {
    return (
      <div
        className={`rounded-xl border border-landing-border bg-landing-card flex flex-col items-center justify-center p-8 text-center ${className}`}
        style={{ minHeight: 430 }}
      >
        <p className="text-landing-text-muted mb-4">
          La visite 360° n'a pas pu être chargée. Vous pouvez l'ouvrir dans un nouvel onglet.
        </p>
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-landing-gold text-[#161616] font-medium hover:bg-landing-gold-light"
        >
          <ExternalLink className="w-5 h-5" />
          Ouvrir sur Klapty
        </a>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-landing-border bg-landing-card relative ${className}`}>
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-landing-bg/80 animate-pulse"
          style={{ minHeight: 430 }}
        >
          <div className="w-12 h-12 border-2 border-landing-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <iframe
        style={IFRAME_STYLE}
        src={embedUrl.startsWith(KLAPTY_TUNNEL_PREFIX) ? embedUrl : undefined}
        title="Visite 360°"
        frameBorder="0"
        allowFullScreen={true}
        {...{
          mozallowfullscreen: 'true',
          webkitallowfullscreen: 'true',
          allowvr: 'true',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; vr',
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
