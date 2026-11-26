import AuthProvider from "@/components/auth/AuthProvider";
import { appUrl } from "@/lib/app-url";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";
import { CartProvider } from "@/components/shop/CartProvider";
import type { Metadata } from "next";
import { Instrument_Serif, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // Les URLs relatives (image de partage, canonique) sont résolues par rapport au site public.
  metadataBase: new URL(appUrl()),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: { type: "website", siteName: "INSTINCT", locale: "fr_FR" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${instrumentSerif.variable} ${robotoCondensed.variable} antialiased`}
      >
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
