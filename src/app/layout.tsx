import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import { AgeGate } from "@/components/age-gate";
import { SiteFooter } from "@/components/site-footer";
import { LanguageProvider } from "@/lib/i18n";
import { absoluteUrl, withBasePath } from "@/lib/site";

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
// Absolute URLs (crawlers such as X need https://...), resolved per host by next.config.ts / src/lib/site.ts
const OG_IMAGE = { url: absoluteUrl("/ogp.png"), width: 1200, height: 630, alt: "DOPYU World Championship" };

export const metadata: Metadata = {
  // Base for the remaining relative URLs (og:url); its path (e.g. /dopyu) is kept
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: SITE_TITLE,
    template: "%s | DOPYU",
  },
  description: SITE_DESCRIPTION,
  applicationName: "DOPYU",
  robots: { index: false, follow: false },
  icons: {
    // Icons are not resolved against metadataBase, so they need the basePath
    apple: { url: withBasePath("/icon.png"), sizes: "512x512", type: "image/png" },
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
