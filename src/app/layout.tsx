import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import { AgeGate } from "@/components/age-gate";
import { SiteFooter } from "@/components/site-footer";
import { LanguageProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = "DOPYU | 世界射精競技・ランキング＆記録アプリ (Global Nut World Cup)";
const SITE_DESCRIPTION =
  "ストップウォッチで計測し、回数と推定量(ml)で日本国内・世界・国別ワールドカップを競う成人向け記録アプリ。 / Measure, track, and compete in the Global Ejaculation Championship.";
const OG_IMAGE = { url: "/ogp.png", width: 1200, height: 630, alt: "DOPYU World Championship" };

/** Set in next.config.ts (NEXT_PUBLIC_SITE_URL, or the GitHub Pages URL from the git remote). */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gogogorima.github.io/dopyu";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  // Relative URLs below resolve against this (its path is kept), e.g. https://<user>.github.io/<repo>/ogp.png
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s | DOPYU",
  },
  description: SITE_DESCRIPTION,
  applicationName: "DOPYU",
  robots: { index: false, follow: false },
  icons: {
    // Icons are not resolved against metadataBase, so they need the basePath
    apple: { url: `${basePath}/icon.png`, sizes: "512x512", type: "image/png" },
  },
  openGraph: {
    type: "website",
    siteName: "DOPYU",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "ja_JP",
    alternateLocale: ["en_US"],
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a10",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LanguageProvider>
          <div id="app-root" className="flex flex-1 flex-col">
            {children}
            <SiteFooter />
          </div>
          <AgeGate />
        </LanguageProvider>
      </body>
    </html>
  );
}
