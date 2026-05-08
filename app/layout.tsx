import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Église La Rencontre — Lieusaint",
  description:
    "Église La Rencontre à Lieusaint (77127). Cultes le dimanche 10h-12h. Venez nous rejoindre.",
  keywords: ["église", "La Rencontre", "Lieusaint", "Seine-et-Marne", "culte", "protestant", "évangélique"],
  openGraph: {
    title: "Église La Rencontre — Lieusaint",
    description: "Église La Rencontre à Lieusaint (77127). Cultes le dimanche 10h-12h.",
    url: "https://egliselarencontre.fr",
    siteName: "Église La Rencontre",
    images: [
      {
        url: "https://egliselarencontre.fr/audrey_nico.png",
        width: 1200,
        height: 630,
        alt: "Église La Rencontre — Audrey et Nicolas Salafranque",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
