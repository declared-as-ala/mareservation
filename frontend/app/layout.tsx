import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

// Self-hosted at build time by next/font (no runtime request to Google, no layout shift).
const geist = Geist({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], display: "swap", variable: "--font-geist-mono" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-arabic" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.exploria360.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Exploria360 — Maisons d'hôtes en Tunisie, à visiter en 360°",
    template: "%s | Exploria360",
  },
  description:
    "Explorez avant de réserver. Découvrez les plus belles maisons d'hôtes de Tunisie en immersion 360° et réservez votre escapade en toute confiance.",
  applicationName: "Exploria360",
  openGraph: {
    type: "website",
    siteName: "Exploria360",
    locale: "fr_TN",
    title: "Exploria360 — Explorez avant de réserver",
    description: "Les plus belles maisons d'hôtes de Tunisie, à visiter en 360° avant de réserver.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`dark ${geist.variable} ${geistMono.variable} ${plexArabic.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
