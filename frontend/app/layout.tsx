import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

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
  const fontVars = {
    "--font-inter": "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    "--font-fira-code": "Fira Code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
    "--font-playfair": "Playfair Display, Georgia, Cambria, Times New Roman, Times, serif",
  } as CSSProperties;

  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className="antialiased" style={fontVars}>
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
