'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, QrCode, XCircle, Loader2, Camera, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiGetRaw, api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */
interface ScanResult {
  status: 'success' | 'error' | 'already';
  message: string;
  reservation?: {
    _id: string;
    confirmationCode: string;
    guestFirstName?: string;
    guestLastName?: string;
    partySize?: number;
    startAt?: string;
    venueId?: { name?: string } | string;
  };
}

/* ------------------------------------------------------------------ */
/* Scanner component                                                     */
/* ------------------------------------------------------------------ */
export default function AdminScannerPage() {
  const adminScannerEnabled = false;
  if (!adminScannerEnabled) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-100">
        <h1 className="text-xl font-semibold">Scanner admin desactive</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Le check-in QR est maintenant reserve aux proprietaires via <code>/owner/scanner</code>.
        </p>
      </div>
    );
  }
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanCount = useRef(0);

  /* Start camera */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      setCameraError('');
    } catch {
      setCameraError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  }, []);

  /* Stop camera */
  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* Validate a code against the API */
  const validateCode = useCallback(async (code: string) => {
    if (loading) return;
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      // Try to find the reservation and check-in
      const data = await apiGetRaw<{ data?: { _id: string; confirmationCode: string; checkInStatus?: string; guestFirstName?: string; guestLastName?: string; partySize?: number; startAt?: string; venueId?: unknown } }>(
        `/reservations/scan?code=${encodeURIComponent(trimmed)}`
      );
      const r = data?.data ?? (data as unknown as { _id: string; confirmationCode: string; checkInStatus?: string });
      if (!r?._id) {
        setResult({ status: 'error', message: 'Code invalide ou réservation introuvable.' });
        return;
      }
      if ((r as { checkInStatus?: string }).checkInStatus === 'checked_in') {
        setResult({
          status: 'already',
          message: 'Déjà enregistré.',
          reservation: r as ScanResult['reservation'],
        });
        return;
      }
      // Mark as checked in
      await api.patch(`/reservations/${r._id}/checkin`, {});
      scanCount.current += 1;
      setResult({
        status: 'success',
        message: 'Entrée validée !',
        reservation: r as ScanResult['reservation'],
      });
    } catch {
      setResult({ status: 'error', message: 'Code invalide ou réservation introuvable.' });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /* Scan QR from video frame using BarcodeDetector API (modern browsers) */
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (img: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(canvas);
        if (codes.length > 0) {
          stopCamera();
          validateCode(codes[0].rawValue);
        }
      } catch { /* ignore */ }
    }
  }, [stopCamera, validateCode]);

  useEffect(() => {
    if (scanning) {
      intervalRef.current = setInterval(scanFrame, 400);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [scanning, scanFrame]);

  const handleReset = () => {
    setResult(null);
    setManualCode('');
    startCamera();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <QrCode className="size-6 text-amber-400" />
            Scanner d'entrée
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Scannez le QR code d'un client pour valider son entrée.
          </p>
        </div>
        {scanCount.current > 0 && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <CheckCircle2 className="size-3.5 mr-1.5" />
            {scanCount.current} scan{scanCount.current !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Camera view */}
      <Card className="border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-zinc-900 flex items-center justify-center">
            <video
              ref={videoRef}
              className={cn('w-full h-full object-cover', !scanning && 'hidden')}
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {!scanning && !cameraError && (
              <div className="text-center space-y-4 p-8">
                <div className="size-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto">
                  <Camera className="size-8 text-zinc-600" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm font-medium">Caméra non active</p>
                  <p className="text-zinc-500 text-xs mt-1">Démarrez la caméra pour scanner les QR codes</p>
                </div>
                <Button
                  onClick={startCamera}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
                >
                  <Camera className="size-4" />
                  Démarrer la caméra
                </Button>
              </div>
            )}
            {cameraError && (
              <div className="text-center space-y-3 p-8">
                <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                  <XCircle className="size-8 text-red-400" />
                </div>
                <p className="text-red-400 text-sm">{cameraError}</p>
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 gap-2"
                >
                  <RotateCcw className="size-4" />
                  Réessayer
                </Button>
              </div>
            )}
            {scanning && (
              <>
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="size-52 border-2 border-amber-400/70 rounded-xl relative">
                    <span className="absolute -top-px -left-px size-5 border-t-2 border-l-2 border-amber-400 rounded-tl" />
                    <span className="absolute -top-px -right-px size-5 border-t-2 border-r-2 border-amber-400 rounded-tr" />
                    <span className="absolute -bottom-px -left-px size-5 border-b-2 border-l-2 border-amber-400 rounded-bl" />
                    <span className="absolute -bottom-px -right-px size-5 border-b-2 border-r-2 border-amber-400 rounded-br" />
                  </div>
                </div>
                {/* Scanning indicator */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
                  <div className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-zinc-300">Scan en cours...</span>
                </div>
                <Button
                  onClick={stopCamera}
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-3 right-3 text-zinc-400 hover:text-zinc-100 bg-black/60 backdrop-blur-sm border border-white/10"
                >
                  Arrêter
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual code entry */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-4 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <QrCode className="size-4 text-amber-400" />
            Saisie manuelle du code
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Entrez le code de confirmation manuellement
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="manualCode" className="sr-only">Code de confirmation</Label>
              <Input
                id="manualCode"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && validateCode(manualCode)}
                placeholder="Ex: ABC12345"
                className="h-10 border-zinc-700 bg-zinc-800/50 text-zinc-100 font-mono text-sm placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <Button
              onClick={() => validateCode(manualCode)}
              disabled={!manualCode.trim() || loading}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10 px-6"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Valider'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={cn(
          'border-2',
          result.status === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
          result.status === 'error' && 'border-red-500/30 bg-red-500/5',
          result.status === 'already' && 'border-amber-500/30 bg-amber-500/5',
        )}>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              {result.status === 'success' && (
                <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-6 text-emerald-400" />
                </div>
              )}
              {result.status === 'error' && (
                <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-6 text-red-400" />
                </div>
              )}
              {result.status === 'already' && (
                <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-6 text-amber-400" />
                </div>
              )}
              <div className="flex-1">
                <p className={cn(
                  'font-semibold text-base',
                  result.status === 'success' && 'text-emerald-400',
                  result.status === 'error' && 'text-red-400',
                  result.status === 'already' && 'text-amber-400',
                )}>
                  {result.message}
                </p>
                {result.reservation && (
                  <div className="text-sm text-zinc-400 space-y-1.5 pt-3 border-t border-zinc-700/50 mt-3">
                    <p className="flex items-center justify-between">
                      <span className="text-zinc-500">Code :</span>
                      <span className="font-mono text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded">{result.reservation.confirmationCode}</span>
                    </p>
                    {(result.reservation.guestFirstName ?? result.reservation.guestLastName) && (
                      <p className="flex items-center justify-between">
                        <span className="text-zinc-500">Client :</span>
                        <span className="text-zinc-200">{result.reservation.guestFirstName} {result.reservation.guestLastName}</span>
                      </p>
                    )}
                    {result.reservation.partySize && (
                      <p className="flex items-center justify-between">
                        <span className="text-zinc-500">Personnes :</span>
                        <span className="text-zinc-200">{result.reservation.partySize}</span>
                      </p>
                    )}
                    {typeof result.reservation.venueId === 'object' && result.reservation.venueId?.name && (
                      <p className="flex items-center justify-between">
                        <span className="text-zinc-500">Lieu :</span>
                        <span className="text-zinc-200">{result.reservation.venueId.name}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-700/50">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 gap-2"
                onClick={handleReset}
              >
                <RotateCcw className="size-4" />
                Scanner un autre code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
