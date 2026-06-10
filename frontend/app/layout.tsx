import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Look and Book – Book your moment",
  description: "Look and Book — réservez tables, chambres et places pour cafés, restaurants, hôtels et événements.",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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
